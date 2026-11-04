#!/usr/bin/env bash
set -e

if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

PYTHONPATH=. python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
