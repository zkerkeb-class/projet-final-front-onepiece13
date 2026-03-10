@echo off
chcp 65001 >nul
title OnePieceGuess — Launcher

echo.
echo  =====================================================
echo    OnePieceGuess  ^|^|  Lancement automatique
echo  =====================================================
echo.

:: ── Vérifier Node.js ─────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Node.js n'est pas installe.
    echo  Telechargez-le sur https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js detecte : %NODE_VER%

:: ── Chemin du script (racine du projet) ──────────────────────────────────────
set "ROOT=%~dp0"
set "BACK=%ROOT%projet-final-back-onepiece13"
set "FRONT=%ROOT%projet-final-front-onepiece13"

:: ── Installer les dépendances si besoin (backend) ────────────────────────────
if not exist "%BACK%\node_modules" (
    echo  [INFO] Installation des dependances backend...
    pushd "%BACK%"
    call npm install
    popd
    echo  [OK] Backend installe.
) else (
    echo  [OK] Backend : dependances deja presentes.
)

:: ── Installer les dépendances si besoin (frontend) ───────────────────────────
if not exist "%FRONT%\node_modules" (
    echo  [INFO] Installation des dependances frontend...
    pushd "%FRONT%"
    call npm install
    popd
    echo  [OK] Frontend installe.
) else (
    echo  [OK] Frontend : dependances deja presentes.
)

echo.
echo  Demarrage des serveurs...
echo.

:: ── Lancer le backend dans un nouveau terminal ────────────────────────────────
start "OnePieceGuess - Backend (port 3001)" cmd /k "title OnePieceGuess - Backend && cd /d "%BACK%" && echo. && echo  Backend demarre sur http://localhost:3001 && echo. && npm start"

:: Petite pause pour que le backend démarre avant le frontend
timeout /t 2 /nobreak >nul

:: ── Lancer le frontend dans un nouveau terminal ───────────────────────────────
start "OnePieceGuess - Frontend (port 3000)" cmd /k "title OnePieceGuess - Frontend && cd /d "%FRONT%" && echo. && echo  Frontend demarre sur http://localhost:3000 && echo. && npm start"

:: Pause pour que le frontend démarre
timeout /t 3 /nobreak >nul

:: ── Ouvrir le navigateur ──────────────────────────────────────────────────────
echo  [INFO] Ouverture du navigateur...
start "" "http://localhost:3000"

echo.
echo  =====================================================
echo   Serveurs demarres !
echo     Jeu       : http://localhost:3000
echo     Test API  : http://localhost:3000/test.html
echo     API       : http://localhost:3001/api/health
echo  =====================================================
echo.
echo  Fermez cette fenetre ou appuyez sur une touche pour quitter.
pause >nul
