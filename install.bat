@echo off
REM Installation rapide du Baccha Festival Ticket Platform (Windows)

echo.
echo 🎉 Installation du Baccha Festival Ticket Platform
echo.

REM Vérifier Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installé. Veuillez installer Node.js 16+ d'abord.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js détecté: %NODE_VERSION%
echo.

REM Installer les dépendances
echo 📦 Installation des dépendances...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo ✅ Dépendances installées avec succès
) else (
    echo ❌ Erreur lors de l'installation des dépendances
    pause
    exit /b 1
)

echo.
echo 🔧 Configuration du fichier .env
echo.

REM Vérifier si .env existe
if exist ".env" (
    echo ⚠️ Le fichier .env existe déjà. Sauvegarde dans .env.backup
    move /Y .env .env.backup >nul
)

REM Créer le template .env
(
    echo # Firebase Configuration
    echo REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
    echo REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
    echo REACT_APP_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    echo REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
    echo REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
    echo REACT_APP_FIREBASE_APP_ID=YOUR_APP_ID
    echo.
    echo # Dynamic Labs Configuration
    echo REACT_APP_DYNAMIC_ENV_ID=YOUR_DYNAMIC_ENV_ID
    echo.
    echo # Stripe Configuration
    echo REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY
) > .env

echo ✅ Fichier .env créé
echo.
echo 📝 Prochaines étapes:
echo 1. Ouvrez le fichier .env et remplissez vos clés
echo 2. Configurez Firestore dans Firebase Console
echo 3. Créez une application dans Dynamic Labs
echo 4. Exécutez: npm start
echo.
echo 🚀 Pour démarrer l'application:
echo npm start
echo.
pause
