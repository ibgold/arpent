@echo off
title Arreter ARPENTEUR 2
echo Arret du serveur ARPENTEUR 2 (port 4273)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4273 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; 'OK'"
echo.
echo Serveur arrete. Tu peux fermer cette fenetre.
pause >nul
