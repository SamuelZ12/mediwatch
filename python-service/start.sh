#!/bin/bash
# Start the MediWatch Python Service

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Running setup..."
    ./setup.sh
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Start the service
echo "🚀 Starting MediWatch YOLO Detection Service..."
echo "   Server will run on http://0.0.0.0:8000"
echo "   Press Ctrl+C to stop"
echo ""
python main.py
