#!/usr/bin/env bash
set -e

echo "=== CircuitMind Setup ==="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed."
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "Error: node is not installed."
    exit 1
fi

# Python virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment in .venv..."
    python3 -m venv .venv
fi

echo "Activating .venv and upgrading pip..."
source .venv/bin/activate
pip install --upgrade pip

echo "Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "=== Setup Complete! ==="
echo "Run 'npm run dev' to start development servers."
