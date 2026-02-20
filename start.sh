#!/bin/bash
# Start both React app and Stripe server

echo "🎉 Baccha Festival - Starting..."
echo ""
echo "📱 React app: http://localhost:3000"
echo "💳 Stripe server: http://localhost:5000"
echo ""

# Start Stripe server in background
node server.js &
STRIPE_PID=$!

# Wait a bit for server to start
sleep 2

# Start React app
npm start

# Cleanup on exit
trap "kill $STRIPE_PID" EXIT
