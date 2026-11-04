#!/usr/bin/env bash
set -e

if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

PYTHONPATH=. python3 -m pytest backend/tests -v
