# Deployment Guide

**Project:** PulseTrack — Event-Collection & Telemetry Backend  
**Author:** Sumukh  
**Version:** 1.0  
**Status:** Approved — Production Operations Manual  
**Purpose:** Provide the definitive operational manual for configuring, deploying, monitoring, scaling, and maintaining the PulseTrack backend across local, development, and production environments.  
**Audience:** DevOps Engineers, Site Reliability Engineers (SREs), Backend Developers, and Technical Operators.

---

## Table of Contents

1. [Deployment Overview](#1-deployment-overview)
2. [Infrastructure Architecture](#2-infrastructure-architecture)
3. [Deployment Environments](#3-deployment-environments)
4. [Prerequisites](#4-prerequisites)
5. [Local Development Setup](#5-local-development-setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Docker Strategy](#7-docker-strategy)
8. [Database Deployment](#8-database-deployment)
9. [Redis Deployment](#9-redis-deployment)
10. [Application Deployment](#10-application-deployment)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Release Process](#12-release-process)
13. [Rollback Strategy](#13-rollback-strategy)
14. [Health Checks](#14-health-checks)
15. [Monitoring & Observability](#15-monitoring--observability)
16. [Security During Deployment](#16-security-during-deployment)
17. [Scaling Strategy](#17-scaling-strategy)
18. [Backup & Recovery](#18-backup--recovery)
19. [Troubleshooting Guide](#19-troubleshooting-guide)
20. [Operational Checklist](#20-operational-checklist)
21. [Maintenance Tasks](#21-maintenance-tasks)
22. [Future Deployment Enhancements](#22-future-deployment-enhancements)
23. [Final Deployment Checklist](#23-final-deployment-checklist)

---

## 1. Deployment Overview

PulseTrack is a stateless, high-throughput event collection and telemetry backend built with Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), Neon PostgreSQL, Upstash Redis, ARQ background workers, Docker, Render, and GitHub Actions.

### 1.1 Deployment Philosophy
- **Two Processes, One Codebase:** The API service (`uvicorn app.main:app`) and the background worker pool (`arq app.workers.worker_settings.WorkerSettings`) share models, schemas, and session logic within the same repository, but are deployed as independent Render services.
- **Zero Owned Infrastructure Ops:** Infrastructure relies entirely on managed serverless platforms (Render for compute, Neon for PostgreSQL, Upstash for Redis) to minimize operational overhead while providing autoscaling and high availability.
- **Critical Path Ingestion Protection:** The write path (`POST /v1/events`) is optimized for sub-50ms p95 latency. If Redis becomes unavailable, the system gracefully falls back to synchronous PostgreSQL insertion (`201 Created`), prioritizing ingestion availability over latency optimization (NFR-REL-02).
- **Automated Quality Gates:** Deployments to production occur automatically upon merging to `main`, guarded by a strict GitHub Actions CI pipeline executing linting, type-checking, security scanning, and test suites.

### 1.2 Infrastructure Overview
- **Compute:** Render Web Service (autoscaled 1–3 instances) + Render Background Worker Service.
- **Database:** Neon PostgreSQL (serverless, branchable, monthly range-partitioned `events` table).
- **Cache & Queue:** Upstash Redis (serverless REST/Redis protocol for key resolution cache, event queue, and rate limiting).
- **CI/CD & Registry:** GitHub Actions + GitHub Container Registry (GHCR) / Docker Hub.

---

## 2. Infrastructure Architecture

The logical deployment topology decouples the client-facing HTTP ingestion layer from the asynchronous background processing layer.

### 2.1 System Architecture Diagram

```mermaid
graph TD
    subgraph Clients["Client Layer"]
        SDK["Web / Mobile / Server SDKs"]
        Admin["Dashboard / Admin Scripts"]
    end

    subgraph RenderEdge["Render Platform Edge"]
        LB["Render Load Balancer<br/>(TLS Termination, Edge Routing)"]
    end

    subgraph RenderCompute["Render Compute Environment"]
        API["PulseTrack Web Service<br/>FastAPI + Uvicorn<br/>(Autoscaled 1-3 Instances)"]
        Worker["ARQ Worker Pool<br/>Background Processing Service"]
    end

    subgraph ManagedInfra["Managed Serverless Infrastructure"]
        Redis[("Upstash Redis<br/>Cache / Event Queue / Rate Limiter")]
        DLQ[("Redis Dead-Letter Queue<br/>(dlq:events)")]
        Neon[("Neon PostgreSQL<br/>System of Record<br/>(Partitioned Events Table)")]
    end

    SDK -->|"HTTPS POST /v1/events"| LB
    Admin -->|"HTTPS GET /v1/applications/:id/metrics"| LB
    LB --> API

    API -->|"1. Resolve API Key (Cache-Aside)"| Redis
    API -.->|"Fallback on Miss"| Neon
    API -->|"2. Check Rate Limit (Lua Script)"| Redis
    API -->|"3. Enqueue Event (Phase 2 Async Path)"| Redis
    API -.->|"Sync Write Fallback (Redis Outage)"| Neon

    Worker -->|"4. Dequeue Batch"| Redis
    Worker -->|"5. Bulk Insert (500 rows/batch)"| Neon
    Worker -.->|"3x Job Failure"| DLQ
```

### 2.2 Component Specifications

| Component | Technology | Role & Responsibility | Scaling Mechanism |
|---|---|---|---|
| **Render Load Balancer** | Render Edge | TLS termination, public HTTPS routing, HTTP/2 proxying | Fully managed by Render |
| **FastAPI Web Service** | Python 3.12 / Uvicorn | Request validation, auth, rate limiting, async queue dispatch, read aggregation | Horizontal autoscaling (1–3 instances based on CPU/RAM) |
| **ARQ Worker Service** | Python 3.12 / ARQ | Dequeues event batches from Redis, executes bulk Postgres inserts, handles DLQ | Horizontal scaling (adding worker processes) |
| **Upstash Redis** | Serverless Redis | Key resolution cache (TTL 300s), event buffer queue, fixed-window rate limiter | Serverless autoscaling (managed capacity) |
| **Neon PostgreSQL** | Serverless Postgres | System of record for `applications` and `events` tables; monthly range partitioning | Serverless compute autoscaling + read replicas |

---

## 3. Deployment Environments

PulseTrack defines five distinct operational environments to guarantee stability and prevent untested code from reaching production.

```mermaid
stateDiagram-v2
    [*] --> Local: Developer Machine
    Local --> Testing: Pull Request CI
    Testing --> Staging: Merge to main (Preview Branch)
    Staging --> Production: Tagged Release / Main Deploy
```

### 3.1 Environment Specifications

| Environment | Purpose | Infrastructure & Configuration | Data Persistence |
|---|---|---|---|
| **Local** | Local feature development & debugging | Docker Compose (`postgres:16-alpine`, `redis:7-alpine`), local `.env` | Ephemeral (Docker named volumes) |
| **Development** | Integration testing & feature branches | Neon dev branch (`ep-dev-123`), Upstash dev database | Isolated dev branch database |
| **Testing** | CI pipeline execution in GitHub Actions | Automated ephemeral Postgres/Redis services inside GitHub runner | Destroyed after test job completion |
| **Staging** | Pre-production validation | Render Preview Service connected to Neon staging branch | Staging database (parroting prod schema) |
| **Production** | Live tenant ingestion & analytics | Render Production Services, primary Neon DB, primary Upstash Redis | Persistent, daily backups + PITR |

---

## 4. Prerequisites

Before setting up or deploying PulseTrack, ensure the following local tools, accounts, and credentials are configured.

### 4.1 Software Requirements
- **Python:** 3.12.0 or higher (`python3 --version`).
- **Docker & Docker Compose:** Docker Engine 24.0+ and Docker Compose v2.20+ (`docker compose version`).
- **Git:** 2.40+ (`git --version`).
- **PostgreSQL Client:** `psql` 16+ for manual database management.
- **Redis CLI:** `redis-cli` 7+ for queue and cache inspection.

### 4.2 Required Managed Platform Accounts
1. **GitHub Account:** Repository hosting and GitHub Actions CI/CD.
2. **Render Account:** Web Service and Background Worker hosting.
3. **Neon Account:** Managed PostgreSQL serverless project.
4. **Upstash Account:** Managed Redis serverless database.

---

## 5. Local Development Setup

Follow these step-by-step instructions to run the full PulseTrack backend locally.

### Step 1: Clone Repository & Create Virtual Environment

```bash
git clone https://github.com/your-org/pulsetrack.git
cd pulsetrack

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"
```

### Step 2: Configure Local Environment Variables

Copy the template environment file to create your local `.env`:

```bash
cp .env.example .env
```

Ensure `.env` contains local development defaults:

```ini
ENVIRONMENT=development
LOG_LEVEL=DEBUG
PORT=8000
SECRET_KEY=dev_secret_key_change_in_production_32bytes
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pulsetrack_dev
REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_DEFAULT_PER_MINUTE=600
```

### Step 3: Start Local Infrastructure via Docker Compose

Spin up local PostgreSQL and Redis containers:

```bash
docker compose up -d
```

Verify container status:

```bash
docker compose ps
```

*Expected output:* Both `pulsetrack-db` and `pulsetrack-redis` should report status `Up (healthy)`.

### Step 4: Apply Database Migrations

Run Alembic to create database tables (`applications` and `events`):

```bash
alembic upgrade head
```

### Step 5: Start FastAPI Web Service & ARQ Worker

In terminal window 1 (Web Service):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In terminal window 2 (Background Worker):

```bash
arq app.workers.worker_settings.WorkerSettings
```

### Step 6: Verify Local Installation

1. Open Swagger UI in your browser: `http://localhost:8000/docs`
2. Test the Health Check endpoint:

```bash
curl -X GET http://localhost:8000/v1/health
```

*Expected JSON Response:*

```json
{
  "status": "healthy",
  "components": {
    "api": "online",
    "postgres": "connected",
    "redis": "connected"
  }
}
```

---

## 6. Environment Configuration

All application settings are managed via `app/core/config.py` using `pydantic-settings`. Environment variables MUST be set in Render for production environments.

### 6.1 Configuration Reference Matrix

| Category | Environment Variable | Required | Default | Description / Example |
|---|---|---|---|---|
| **Application** | `ENVIRONMENT` | Yes | `development` | Environment tier: `development`, `staging`, `production`. |
| **Application** | `PORT` | Yes | `8000` | HTTP port Uvicorn listens on. |
| **Application** | `LOG_LEVEL` | No | `INFO` | Logging verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| **Database** | `DATABASE_URL` | **Yes** | None | Async Postgres connection URI: `postgresql+asyncpg://user:pass@ep-xyz.neon.tech/db?sslmode=require`. |
| **Database** | `POSTGRES_POOL_SIZE` | No | `10` | SQLAlchemy connection pool size per instance. |
| **Database** | `POSTGRES_MAX_OVERFLOW` | No | `20` | Max overflow connections beyond pool size. |
| **Redis** | `REDIS_URL` | **Yes** | None | Redis connection URI: `rediss://default:token@upstash.io:6379`. |
| **Redis** | `REDIS_MAX_CONNECTIONS` | No | `20` | Maximum connection pool size for Upstash Redis. |
| **Security** | `SECRET_KEY` | **Yes** | None | 32+ character CSPRNG secret key for cryptographic operations. |
| **Security** | `API_KEY_PREFIX_LIVE` | No | `pt_live_` | Prefix for live API keys. |
| **Security** | `API_KEY_PREFIX_TEST` | No | `pt_test_` | Prefix for test API keys. |
| **Workers** | `WORKER_MAX_JOBS` | No | `10` | Maximum concurrent ARQ batch execution jobs. |
| **Workers** | `WORKER_JOB_TIMEOUT` | No | `30` | Timeout in seconds for an ingestion batch job. |
| **Rate Limit** | `RATE_LIMIT_DEFAULT_PER_MINUTE` | No | `600` | Default fixed-window rate limit per tenant. |

---

## 7. Docker Strategy

PulseTrack uses a production-optimized, multi-stage `Dockerfile` that builds a single container image containing both the Web Service and Background Worker dependencies.

### 7.1 Production `Dockerfile`

```dockerfile
# Stage 1: Build & dependency resolution
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir --user wheel && \
    pip install --no-cache-dir --user -e .

# Stage 2: Final minimal runtime
FROM python:3.12-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd -g 10001 appgroup && \
    useradd -u 10000 -g appgroup -s /bin/sh appuser

COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appgroup app /app/app
COPY --chown=appuser:appgroup alembic /app/alembic
COPY --chown=appuser:appgroup alembic.ini /app/alembic.ini

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7.2 Docker Image Optimization Highlights
- **Multi-Stage Build:** Separates build tools (`gcc`, `libpq-dev`) from the final runtime image, producing a minimal final image size (~150MB).
- **Non-Root Execution:** Runs under `appuser` (UID 10000) to adhere to container security best practices.
- **Integrated Healthcheck:** Native Docker `HEALTHCHECK` probing `/v1/health`.

---

## 8. Database Deployment

PulseTrack uses **Neon PostgreSQL** as its system of record.

### 8.1 Neon Database Setup
1. Log into the Neon Console and create a new project named `pulsetrack-prod`.
2. Select PostgreSQL 16 as the database engine.
3. Retrieve the Pooled Connection String (`postgresql+asyncpg://...`) from the Neon dashboard.

### 8.2 Database Partitioning Strategy
The `events` table is range-partitioned by `occurred_at` on a monthly basis (`PulseTrack_Database_Design.md` §5). 

Partition tables are managed via Alembic migrations. To pre-create future partitions, execute:

```bash
python -m app.scripts.create_next_partition
```

### 8.3 Connection Pooling Rules
Neon is serverless and scales down compute endpoints when idle.
- SQLAlchemy 2.0 connection pool size must be configured with `pool_pre_ping=True` and `pool_recycle=1800` to automatically recover from suspended Neon compute instances without throwing errors to clients.

---

## 9. Redis Deployment

PulseTrack uses **Upstash Redis** for caching, rate limiting, and asynchronous task queueing.

### 9.1 Upstash Setup
1. Create a primary Redis database in Upstash in the same cloud region as your Render services (e.g., AWS us-east-1).
2. Enable TLS and obtain the connection string (`rediss://...`).

### 9.2 Fail-Open Resiliency Pattern (NFR-REL-02)
Redis is an operational optimization, not a hard single point of failure for event ingestion.

```mermaid
sequenceDiagram
    participant API as FastAPI Ingestion Service
    participant Redis as Upstash Redis
    participant DB as Neon PostgreSQL

    API->>Redis: Enqueue Event (Phase 2 Async)
    alt Redis Available
        Redis-->>API: 202 Accepted (Queued)
    else Redis Timeout / Unreachable
        API->>API: Catch RedisError (Log Warning)
        API->>DB: Direct INSERT (Sync Fallback)
        DB-->>API: Committed
        API-->>API: Return 201 Created (Degraded Mode)
    end
```

---

## 10. Application Deployment

Deployments to **Render** managed compute are configured via `render.yaml`.

### 10.1 `render.yaml` Infrastructure Specification

```yaml
services:
  # 1. Web Service (FastAPI)
  - type: web
    name: pulsetrack-api
    env: python
    region: oregon
    plan: starter
    buildCommand: pip install -e .
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /v1/health
    autoDeploy: true
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: SECRET_KEY
        sync: false

  # 2. Background Worker Service (ARQ)
  - type: worker
    name: pulsetrack-worker
    env: python
    region: oregon
    plan: starter
    buildCommand: pip install -e .
    startCommand: arq app.workers.worker_settings.WorkerSettings
    autoDeploy: true
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: SECRET_KEY
        sync: false
```

---

## 11. CI/CD Pipeline

PulseTrack utilizes **GitHub Actions** (`.github/workflows/ci.yml`) for automated testing and deployment.

### 11.1 CI/CD Pipeline Workflow

```mermaid
graph TD
    Push["Git Push / PR to main"] --> Checkout["Checkout Repository"]
    Checkout --> SetupPy["Setup Python 3.12"]
    SetupPy --> Lint["Ruff Lint & Format Check"]
    Lint --> TypeCheck["Mypy Strict Type Check"]
    TypeCheck --> Security["Bandit Security Scan"]
    Security --> UnitTests["Run Unit Tests (Pytest)"]
    UnitTests --> IntegrationTests["Run Integration Tests (Postgres/Redis)"]
    IntegrationTests --> Coverage["Enforce 80%+ Coverage Floor"]
    Coverage --> DockerBuild["Build & Verify Docker Image"]
    DockerBuild --> DeployTrigger["Trigger Render Deploy Hooks"]
    DeployTrigger --> SmokeTest["Run Post-Deployment Smoke Tests"]
```

### 11.2 GitHub Actions Configuration (`ci.yml`)

```yaml
name: PulseTrack CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: pulsetrack_test
          POSTGRES_PASSWORD: testpassword
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -e ".[dev]"

      - name: Lint & Format Check
        run: |
          ruff check .
          ruff format --check .

      - name: Type Check
        run: mypy --strict app

      - name: Security Scan
        run: bandit -r app

      - name: Run Test Suite
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:testpassword@localhost:5432/pulsetrack_test
          REDIS_URL: redis://localhost:6379/0
          SECRET_KEY: testsecretkeyfortesting1234567890
        run: |
          alembic upgrade head
          pytest --cov=app --cov-report=term-missing --cov-fail-under=80

  deploy:
    needs: quality-gate
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Web Service Deploy
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_WEB }}"
      - name: Trigger Render Worker Service Deploy
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_WORKER }}"
```

---

## 12. Release Process

1. **Version Bump:** Update version in `pyproject.toml` following Semantic Versioning (`v1.0.0`).
2. **Git Tagging:** Create and push tag:

```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Production Launch"
git push origin v1.0.0
```

3. **Automated Deployment:** GitHub Actions automatically validates the build and triggers Render deployment hooks.
4. **Post-Deploy Smoke Test:** Execute production health check verification:

```bash
curl -f https://api.pulsetrack.io/v1/health
```

---

## 13. Rollback Strategy

If a deployment introduces a critical regression, execute rollbacks according to these steps.

### 13.1 Deployment Rollback (Render)
1. Navigate to Render Dashboard -> `pulsetrack-api` -> **Deploys**.
2. Select the previous successful deployment commit and click **Rollback to this deploy**.
3. Repeat for `pulsetrack-worker`.

### 13.2 Database Migration Rollback (Alembic)
If the deployment included an incompatible database migration, execute a step-down rollback:

```bash
alembic downgrade -1
```

---

## 14. Health Checks

PulseTrack exposes an automated health probe endpoint at `GET /v1/health`.

### 14.1 Health Check Payload Schema

```json
{
  "status": "healthy",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "version": "1.0.0",
  "components": {
    "api": "online",
    "postgres": "connected",
    "redis": "connected"
  }
}
```

- **HTTP 200 OK:** API, Postgres, and Redis are fully operational (or Redis is degraded but fail-open ingestion is active).
- **HTTP 503 Service Unavailable:** PostgreSQL is unreachable (critical system failure).

---

## 15. Monitoring & Observability

### 15.1 Prometheus Metrics Endpoint
PulseTrack exposes standard Prometheus metrics at `GET /metrics` (`app/observability/prometheus.py`):
- `pulsetrack_http_requests_total`: Request counter by path, method, and status.
- `pulsetrack_http_request_duration_seconds`: Latency histogram (p50, p95, p99).
- `pulsetrack_events_ingested_total`: Event count by tenant and status (`queued` vs `sync_inserted`).
- `pulsetrack_worker_queue_depth`: Gauge of pending events in Upstash Redis.

---

## 16. Security During Deployment

1. **Secrets Management:** Secrets (`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`) live ONLY in Render Environment Variables and GitHub Secrets—never committed to source control.
2. **TLS/HTTPS Enforcement:** Render edge automatically enforces HTTPS (TLS 1.3). HTTP traffic is redirected to HTTPS.
3. **Database Security:** Neon connection string requires `sslmode=require`.

---

## 17. Scaling Strategy

| Layer | Scaling Mechanism | Trigger Threshold | Max Capacity |
|---|---|---|---|
| **Web Service** | Render Horizontal Autoscaling | CPU > 70% or RAM > 80% | 3 Instances |
| **ARQ Workers** | Render Worker Instance Addition | Queue Depth > 5,000 items | 5 Worker Instances |
| **Neon Postgres** | Serverless Auto-Compute Scaling | Transaction CPU Load | 4 CU (Compute Units) |
| **Upstash Redis** | Serverless Capacity Scaling | Request Rate / Memory | Unlimited Managed |

---

## 18. Backup & Recovery

- **Database Backup:** Neon automatically creates continuous WAL logs and daily snapshots with 14-day Point-In-Time Recovery (PITR).
- **Recovery Time Objective (RTO):** $< 30$ minutes.
- **Recovery Point Objective (RPO):** $< 5$ minutes.

---

## 19. Troubleshooting Guide

### Scenario 1: Application Fails to Start on Render
- **Symptom:** Render log shows `ValidationError: 1 validation error for Settings`.
- **Root Cause:** Missing required environment variable (`DATABASE_URL` or `SECRET_KEY`).
- **Resolution:** Open Render Dashboard -> Environment Variables -> add missing key -> Trigger Manual Deploy.

### Scenario 2: Upstash Redis Unreachable (Fail-Open Verification)
- **Symptom:** Log warning: `RedisUnavailableError: Failed to connect to Redis. Falling back to sync DB ingestion.`
- **Root Cause:** Upstash network latency or invalid token.
- **Resolution:** Verify system is correctly serving `201 Created` via fallback. Verify `REDIS_URL` credentials in Render settings.

---

## 20. Operational Checklist

### Before Deployment
- [ ] Code formatted (`ruff format .`) and linted (`ruff check .`).
- [ ] Mypy type-checking passed (`mypy --strict app`).
- [ ] Test suite passed with $\ge 80\%$ coverage (`pytest`).
- [ ] Database migrations tested (`alembic upgrade head` & `alembic downgrade -1`).

### Deployment Execution
- [ ] Merge PR into `main` branch.
- [ ] Monitor GitHub Actions CI/CD pipeline execution.
- [ ] Verify Render Web Service and Worker deployment logs.

### Post-Deployment Verification
- [ ] Verify `/v1/health` status returns `200 OK`.
- [ ] Execute test event ingestion call via `curl`.
- [ ] Inspect Prometheus `/metrics` for unexpected error spikes.

---

## 21. Maintenance Tasks

1. **Monthly Database Partition Creation:** Run `python -m app.scripts.create_next_partition` on the 20th of every month.
2. **Dependency Auditing:** Run `pip-audit` quarterly to identify vulnerable third-party packages.
3. **Secret Rotation:** Rotate `SECRET_KEY` and API keys bi-annually.

---

## 22. Future Deployment Enhancements

1. **Infrastructure as Code (IaC):** Migrate manual Render & Neon setups to **Terraform** / Pulumi scripts.
2. **Kubernetes Migration:** Transition from Render to AWS EKS / Helm charts when traffic exceeds 50,000 events/sec.
3. **Canary Deployments:** Implement Argo Rollouts for progressive traffic routing during releases.

---

## 23. Final Deployment Checklist

- [ ] Environment variables configured in Render Dashboard
- [ ] Neon PostgreSQL reachable and migrations applied (`alembic upgrade head`)
- [ ] Upstash Redis reachable and connection verified
- [ ] ARQ background worker service running
- [ ] Health check endpoint returning HTTP 200 (`GET /v1/health`)
- [ ] Structured JSON logging active and request IDs propagating
- [ ] Prometheus metrics endpoint accessible (`GET /metrics`)
- [ ] HTTPS enforced on production domain
- [ ] GitHub Actions CI/CD deployment hooks verified
- [ ] Rollback procedure verified and documented

---

*End of document.*
