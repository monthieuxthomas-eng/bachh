#!/bin/bash

# Installation rapide du Baccha Festival Ticket Platform

echo "🎉 Installation du Baccha Festival Ticket Platform"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js 16+ d'abord."
    exit 1
fi

echo "✅ Node.js détecté: $(node --version)"
echo ""

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dépendances installées avec succès"
else
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo ""
echo "🔧 Configuration du fichier .env"
echo ""

# Vérifier si .env existe
if [ -f ".env" ]; then
    echo "⚠️ Le fichier .env existe déjà. Sauvegarde dans .env.backup"
    cp .env .env.backup
fi

# Créer le template .env
cat > .env << 'EOF'
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
REACT_APP_FIREBASE_APP_ID=YOUR_APP_ID

# Dynamic Labs Configuration
REACT_APP_DYNAMIC_ENV_ID=YOUR_DYNAMIC_ENV_ID

# Stripe Configuration (Production)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY
EOF

echo "✅ Fichier .env créé"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Ouvrez le fichier .env et remplissez vos clés"
echo "2. Configurez Firestore dans Firebase Console"
echo "3. Créez une application dans Dynamic Labs"
echo "4. Exécutez: npm start"
echo ""
echo "🚀 Pour démarrer l'application:"
echo "npm start"
echo ""
