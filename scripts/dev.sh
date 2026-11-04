#!/usr/bin/env bash
set -e

cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting CircuitMind Backend on http://localhost:8000..."
bash scripts/dev-backend.sh &

echo "Starting CircuitMind Frontend on http://localhost:5173..."
npm run dev --prefix frontend &

wait
