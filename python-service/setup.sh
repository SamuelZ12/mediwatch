#!/bin/bash
# MediWatch Python Service Setup Script

set -e

echo "🔧 Setting up MediWatch Python Service..."

# Find available Python 3.x (prefer 3.12, fall back to others)
PYTHON_CMD=""
for py in python3.12 python3.11 python3.10 python3; do
    if command -v $py &> /dev/null; then
        PYTHON_CMD=$py
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Python 3 not found. Please install Python 3.10 or later."
    exit 1
fi

echo "✅ Using Python: $PYTHON_CMD ($($PYTHON_CMD --version))"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --no-cache-dir

# Install dependencies
echo "📥 Installing dependencies..."
pip install --no-cache-dir -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Activate the virtual environment: source venv/bin/activate"
echo "  2. Run the service: python main.py"
echo ""
echo "Or simply run: ./start.sh"
