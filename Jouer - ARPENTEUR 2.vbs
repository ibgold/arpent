' ARPENTEUR 2 - lanceur sans terminal.
' Double-clic : demarre le serveur du jeu en arriere-plan (invisible) et ouvre le navigateur.
' Premiere ouverture : une fenetre de preparation apparait (installation + build), c'est normal.

Option Explicit
Dim shell, fso, dir, url
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://localhost:4273"

' Premiere fois : dependances puis build (fenetres visibles pour voir la progression)
If Not fso.FolderExists(dir & "\node_modules") Then
  shell.Run "cmd /c title Preparation ARPENTEUR 2 (1/2) - installation... && cd /d """ & dir & """ && npm install", 1, True
End If
If Not fso.FolderExists(dir & "\dist") Then
  shell.Run "cmd /c title Preparation ARPENTEUR 2 (2/2) - construction... && cd /d """ & dir & """ && npm run build", 1, True
End If

' Serveur en arriere-plan, sans fenetre. S'il tourne deja (port occupe), la nouvelle
' instance s'eteint toute seule (strictPort) et on ouvre simplement le navigateur.
shell.Run "cmd /c cd /d """ & dir & """ && npm run serve", 0, False
WScript.Sleep 2500

' Ouvre le jeu dans le navigateur par defaut
shell.Run url
