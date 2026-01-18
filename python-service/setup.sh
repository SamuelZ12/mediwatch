#!/bin/bash
# MediWatch Python Service Setup Script

set -e

echo "🔧 Setting up MediWatch Python Service..."

# Check if Python 3.12 is installed
if ! command -v python3.12 &> /dev/null; then
    echo "Python 3.12 not found. Installing via Homebrew..."
    brew install python@3.12
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment with Python 3.12..."
    /opt/homebrew/bin/python3.12 -m venv venv
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
