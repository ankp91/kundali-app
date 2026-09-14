#!/bin/bash
cd "$(dirname "$0")"
python -m uvicorn main:app --reload --port 8000
