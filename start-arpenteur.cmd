@echo off
title ARPENTEUR
cd /d "%~dp0"
echo.
echo  ARPENTEUR - serveur local
echo  =========================
echo.
if not exist dist\index.html (
  echo  Premier lancement : build de production...
  call npm run build
)
echo  Adresses d'acces :
echo    - Sur ce PC        : http://localhost:4173
echo    - Sur le telephone : http://VOTRE_IP:4173  (meme WiFi)
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo    IP de ce PC :%%a
echo.
echo  (Ctrl+C pour arreter. Voir DEPLOY.md pour l'installation complete.)
echo.
start "" http://localhost:4173
call npm run serve
