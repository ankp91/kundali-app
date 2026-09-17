#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🔱 Starting Kundali App..."

# Kill any existing processes
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
pkill -f ngrok 2>/dev/null
sleep 1

# Start backend
cd "$ROOT/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/kundali_backend.log 2>&1 &
echo "✓ Backend started"

# Start frontend (production — fast startup)
cd "$ROOT/frontend"
npm start > /tmp/kundali_frontend.log 2>&1 &
echo "✓ Frontend started"

# Wait for servers to be ready
sleep 4

# Start ngrok with fixed static domain
ngrok http --domain=spoof-postwar-cane.ngrok-free.dev 3000 > /tmp/kundali_ngrok.log 2>&1 &
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Kundali App is live!"
echo ""
echo "   📱 Open on any device:"
echo "   https://spoof-postwar-cane.ngrok-free.dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop everything"

trap "echo 'Stopping...'; pkill -f uvicorn; pkill -f 'next start'; pkill -f ngrok; exit" INT
wait
