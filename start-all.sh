#!/bin/bash
# Start both MediWatch Python Service and Next.js Frontend

echo "🚀 Starting MediWatch Complete System..."
echo ""

# Start Python service in background
echo "1️⃣  Starting Python YOLO Detection Service..."
cd python-service

# Check if virtual environment exists, run setup if not
if [ ! -d "venv" ]; then
    echo "   ⚠️  Virtual environment not found. Running setup..."
    ./setup.sh
fi

source venv/bin/activate
python main.py &
PYTHON_PID=$!
cd ..

# Wait for Python service to be ready
echo "   Waiting for Python service to start..."
sleep 3

# Check if Python service is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Python service running on http://localhost:8000"
else
    echo "   ⚠️  Python service may not be ready yet"
fi

echo ""
echo "2️⃣  Starting Next.js Frontend..."
npm run dev &
NEXTJS_PID=$!

echo ""
echo "✅ MediWatch is starting up!"
echo ""
echo "📡 Services:"
echo "   - Python YOLO Service: http://localhost:8000"
echo "   - Next.js Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $PYTHON_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
