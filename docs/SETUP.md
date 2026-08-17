# Installation & Local Setup

Follow this guide to set up PulseTrack for local development and review.

---

## Prerequisites
* **Python:** Version 3.12+
* **Containerization:** Docker & Docker Compose
* **Package Manager:** `pip` (within virtualenv)

---

## 1. Setup Environment Configuration
Clone the repository and copy the environment configuration template:
```bash
cp .env.example .env
```

---

## 2. Install Python Dependencies
Create a virtual environment and install the package with dev requirements:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

Install the Git pre-commit hooks to keep codebase linting clean:
```bash
pre-commit install
```

---

## 3. Run via Docker Compose
To boot the database, Redis, background worker, and API together:
```bash
docker compose up -d --build
```
Verify all containers are active:
```bash
docker compose ps
```

---

## 4. Run Locally (Dev Mode)
To launch the hot-reloading development servers:
```bash
./start.sh
```
This utility:
* Boots the local Docker compose dependencies (Postgres, Redis).
* Starts the ARQ background worker.
* Runs the FastAPI backend server on `http://localhost:8000`.
* Runs the Vite React dashboard on `http://localhost:5173`.

---

## 5. Verify the Installation
Check that the health route returns a healthy status:
```bash
curl -s http://localhost:8000/health
```

Run the pytest suite to verify all unit, repository, and integration tests:
```bash
pytest --cov=app --cov-report=term-missing
```
