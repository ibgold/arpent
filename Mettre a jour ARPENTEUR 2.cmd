@echo off
title Mise a jour ARPENTEUR 2
rem Reconstruit le jeu apres une modification du code, puis relance le serveur proprement.
cd /d "%~dp0"
echo Arret de l'ancien serveur...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4273 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
echo Reconstruction du jeu...
call npm run build
if errorlevel 1 (
  echo.
  echo La construction a echoue — voir les erreurs ci-dessus.
  pause
  exit /b 1
)
echo.
echo Termine ! Relance le jeu avec "Jouer - ARPENTEUR 2.vbs".
pause >nul
