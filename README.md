# PulseTrack Backend

[![CI Pipeline](https://github.com/pulsetrack/pulsetrack/actions/workflows/ci.yml/badge.svg)](https://github.com/pulsetrack/pulsetrack/actions/workflows/ci.yml)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![SQLAlchemy 2.0](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)](https://www.sqlalchemy.org)

PulseTrack is a lightweight, high-performance telemetry and event-collection backend designed for capturing custom product analytics signals (button clicks, page views, feature usage) from web, mobile, and server-side applications.

---

## Technical Stack

- **Runtime:** Python 3.12+
- **Framework:** FastAPI + Uvicorn
- **Database:** PostgreSQL 16 (Neon in Production) + SQLAlchemy 2.0 (Async Engine) + AsyncPG
- **Migrations:** Alembic
- **Caching & Queue:** Redis 7 (Upstash in Production) + ARQ Background Workers
- **Static Analysis & Tooling:** Ruff (lint & format), Mypy (`--strict`), Bandit, Pre-commit
- **Testing:** Pytest + Pytest-Asyncio + Pytest-Cov + HTTPX AsyncClient

---

## Local Development Setup

### 1. Prerequisites
- Python 3.12+
- Docker & Docker Compose

### 2. Environment Setup
Clone the repository and copy the environment configuration template:

```bash
cp .env.example .env
```

### 3. Virtual Environment & Dependencies
Create a virtual environment and install development dependencies:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

### 4. Pre-commit Setup
Install pre-commit hooks:

```bash
pre-commit install
```

---

## Docker Compose Setup

Run the full backend stack (PostgreSQL 16, Redis 7, PulseTrack API) with hot-reloading:

```bash
docker-compose up -d --build
```

Check the health status:

```bash
curl -s http://localhost:8000/health
```

Access Interactive API Documentation:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Testing & Quality Assurance

Run the test suite with coverage report:

```bash
pytest --cov=app --cov-report=term-missing
```

Run static analysis checks:

```bash
ruff check .
ruff format --check .
mypy --strict app
bandit -r app
```

---

## Database Migrations

Apply Alembic migrations to the target database:

```bash
alembic upgrade head
```

Generate a new migration script:

```bash
alembic revision --autogenerate -m "describe_changes"
```

---

## License

MIT License
