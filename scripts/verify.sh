#!/usr/bin/env bash
set -e

echo "=== CircuitMind System Verification ==="

echo "1. Checking Python Backend Tests..."
bash scripts/test-backend.sh

echo "2. Checking Frontend Types and Build..."
cd frontend
npm run test
npm run build
cd ..

echo "=== All checks passed successfully! ==="
