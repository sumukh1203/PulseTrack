#!/usr/bin/env bash
# PulseTrack Startup Script
# Usage:
#   ./start.sh          -> Starts FastAPI backend and Vite frontend in hot-reloading dev mode
#   ./start.sh --prod   -> Builds frontend and runs unified FastAPI server on http://localhost:8000

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

MODE="dev"
if [ "$1" == "--prod" ]; then
    MODE="prod"
fi

# Cleanup background processes on exit (Ctrl+C)
cleanup() {
    echo ""
    echo " Shutting down PulseTrack services..."
    if [ -n "$FASTAPI_PID" ]; then
        kill "$FASTAPI_PID" 2>/dev/null || true
    fi
    if [ -n "$VITE_PID" ]; then
        kill "$VITE_PID" 2>/dev/null || true
    fi
    if [ -n "$ARQ_PID" ]; then
        kill "$ARQ_PID" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Activate Virtual Environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Error: .venv virtual environment not found. Please create it first."
    exit 1
fi

# Automatically start PostgreSQL and Redis database services
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "Starting PostgreSQL and Redis database services via Docker Compose..."
    docker compose up -d db redis
elif command -v brew &> /dev/null; then
    echo "Starting PostgreSQL and Redis services via Homebrew..."
    brew services start postgresql@16 2>/dev/null || true
    brew services start redis 2>/dev/null || true
else
    echo "Warning: Neither Docker nor Homebrew was found. Ensure PostgreSQL and Redis are running manually."
fi

if [ "$MODE" == "prod" ]; then
    echo "=========================================================="
    echo "  PulseTrack — Production Mode"
    echo "=========================================================="
    echo "Building React frontend assets..."
    cd "$PROJECT_DIR/frontend"
    npm run build
    cd "$PROJECT_DIR"

    echo "Starting ARQ background worker..."
    arq app.core.worker.WorkerSettings &
    ARQ_PID=$!

    echo ""
    echo "Starting unified FastAPI backend server..."
    echo "   Dashboard UI:  http://localhost:8000/"
    echo "   API Docs:      http://localhost:8000/docs"
    echo "   Health Check:  http://localhost:8000/health"
    echo "=========================================================="

    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "=========================================================="
    echo "  PulseTrack — Development Mode (Hot-Reloading)"
    echo "=========================================================="

    echo "Starting ARQ background worker..."
    arq app.core.worker.WorkerSettings &
    ARQ_PID=$!

    echo "Starting FastAPI backend server on http://localhost:8000..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    FASTAPI_PID=$!

    echo "Starting Vite frontend dev server on http://localhost:5173..."
    cd "$PROJECT_DIR/frontend"
    npm run dev &
    VITE_PID=$!
    cd "$PROJECT_DIR"

    echo ""
    echo "   Frontend Dev UI: http://localhost:5173 (Hot Reloading)"
    echo "   FastAPI Backend: http://localhost:8000"
    echo "   API Docs:        http://localhost:8000/docs"
    echo "   Prometheus:      http://localhost:8000/metrics"
    echo "=========================================================="
    echo "Press Ctrl+C to stop both services."
    echo ""

    # Wait for background servers
    wait
fi
