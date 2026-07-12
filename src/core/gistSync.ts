import { walkLog, deviceId } from './walkLog'
import type { WalkEntryRow } from './save/db'

// Sync du journal de marche ☁ : un Gist GitHub PRIVÉ comme coffre, zéro serveur à nous.
// Chaque appareil pousse ses lignes (jour|appareil) ; la fusion (updatedAt le plus récent
// par ligne) rend la sync sans conflit. Jeton : scope « gist » uniquement, stocké localement.

const TOKEN_KEY = 'arpenteur-gist-token'
const GIST_ID_KEY = 'arpenteur-gist-id'
const GIST_DESC = 'arpenteur-walk-journal'
const FILE_NAME = 'walklog.json'
const API = 'https://api.github.com'

export type SyncState = 'idle' | 'syncing' | 'ok' | 'error' | 'no-token'

export const gistSync = {
  state: 'idle' as SyncState,
  lastSyncAt: 0,
  lastError: '',
  lastPulled: 0,

  get token(): string {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  },

  setToken(token: string): void {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim())
    else {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(GIST_ID_KEY)
    }
  },

  get enabled(): boolean {
    return !!this.token
  },

  /** Pull → fusion → push. Sans jeton : no-op silencieux. */
  async sync(): Promise<boolean> {
    if (!this.token) {
      this.state = 'no-token'
      return false
    }
    this.state = 'syncing'
    this.lastError = ''
    try {
      const gistId = await this.findOrCreateGist()
      // PULL : le contenu distant, fusionné localement (le plus récent par ligne gagne)
      const remote = await this.pull(gistId)
      this.lastPulled = await walkLog.mergeEntries(remote)
      // PUSH : l'état fusionné complet repart dans le gist
      const merged = await walkLog.exportEntries()
      await this.push(gistId, merged)
      this.state = 'ok'
      this.lastSyncAt = Date.now()
      return true
    } catch (err) {
      this.state = 'error'
      this.lastError = (err as Error)?.message ?? String(err)
      return false
    }
  },

  async findOrCreateGist(): Promise<string> {
    const cached = localStorage.getItem(GIST_ID_KEY)
    if (cached) return cached
    // Cherche un gist existant (créé par l'autre appareil) avant d'en créer un
    const list = await this.api('GET', '/gists?per_page=100') as { id: string; description: string }[]
    const found = list.find((g) => g.description === GIST_DESC)
    if (found) {
      localStorage.setItem(GIST_ID_KEY, found.id)
      return found.id
    }
    const created = await this.api('POST', '/gists', {
      description: GIST_DESC,
      public: false,
      files: { [FILE_NAME]: { content: JSON.stringify({ entries: [], from: deviceId() }) } },
    }) as { id: string }
    localStorage.setItem(GIST_ID_KEY, created.id)
    return created.id
  },

  async pull(gistId: string): Promise<WalkEntryRow[]> {
    const gist = await this.api('GET', `/gists/${gistId}`) as {
      files: Record<string, { content: string; truncated: boolean; raw_url: string }>
    }
    const file = gist.files[FILE_NAME]
    if (!file) return []
    let content = file.content
    if (file.truncated) {
      const raw = await fetch(file.raw_url)
      content = await raw.text()
    }
    try {
      const parsed = JSON.parse(content) as { entries?: WalkEntryRow[] }
      return Array.isArray(parsed.entries) ? parsed.entries : []
    } catch {
      return []
    }
  },

  async push(gistId: string, entries: WalkEntryRow[]): Promise<void> {
    await this.api('PATCH', `/gists/${gistId}`, {
      files: { [FILE_NAME]: { content: JSON.stringify({ entries, from: deviceId(), at: new Date().toISOString() }) } },
    })
  },

  async api(method: string, path: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) throw new Error('Jeton invalide ou expiré (Settings → Sync)')
    if (res.status === 404 && path.startsWith('/gists/')) {
      // Le gist a été supprimé côté GitHub : on oublie l'id et on réessaiera
      localStorage.removeItem(GIST_ID_KEY)
      throw new Error('Gist introuvable — relance la sync (il sera recréé)')
    }
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 120)}`)
    return res.json()
  },
}
