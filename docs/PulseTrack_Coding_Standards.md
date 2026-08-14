# Coding Standards

**Project:** PulseTrack — Event-Collection & Telemetry Backend  
**Author:** Sumukh  
**Version:** 1.0  
**Status:** Approved — Production Engineering Standard  
**Purpose:** Define normative engineering standards, architecture rules, language guidelines, security patterns, and testing requirements for the PulseTrack backend before implementation begins.  
**Intended Audience:** Backend Engineers, Security Reviewers, System Architects, and Technical Contributors.

---

## Table of Contents

1. [Coding Philosophy](#1-coding-philosophy)
2. [General Coding Guidelines](#2-general-coding-guidelines)
3. [Project Structure Rules](#3-project-structure-rules)
4. [Python Coding Standards](#4-python-coding-standards)
5. [FastAPI Standards](#5-fastapi-standards)
6. [SQLAlchemy Standards](#6-sqlalchemy-standards)
7. [Naming Conventions](#7-naming-conventions)
8. [Function Standards](#8-function-standards)
9. [Class Standards](#9-class-standards)
10. [Error Handling Standards](#10-error-handling-standards)
11. [Logging Standards](#11-logging-standards)
12. [Security Coding Standards](#12-security-coding-standards)
13. [Performance Guidelines](#13-performance-guidelines)
14. [Documentation Standards](#14-documentation-standards)
15. [Testing Standards](#15-testing-standards)
16. [Configuration Standards](#16-configuration-standards)
17. [Dependency Management](#17-dependency-management)
18. [Git Standards](#18-git-standards)
19. [Code Review Checklist](#19-code-review-checklist)
20. [Static Analysis](#20-static-analysis)
21. [Anti-Patterns](#21-anti-patterns)
22. [Best Practices](#22-best-practices)
23. [Future Evolution](#23-future-evolution)
24. [Final Developer Checklist](#24-final-developer-checklist)

---

## 1. Coding Philosophy

The engineering philosophy behind PulseTrack reflects production-grade backend principles from high-throughput infrastructure platforms (such as Stripe, Cloudflare, and GitHub). PulseTrack is a stateless telemetry ingestion engine where correctness, reliability, and write-path performance take absolute precedence.

### 1.1 Readability over Cleverness
Code is read far more often than it is written. Complex single-line list comprehensions, tricky bitwise logic, or implicit dynamic metaprogramming decrease maintainability and increase bug density.
- **Rule:** Write straightforward code that explicitly communicates intent to another engineer.
- **Why:** In high-concurrency ingestion systems, subtle concurrency bugs or hidden logic in clever constructs lead to production incidents that are extremely difficult to diagnose.

### 1.2 Maintainability First
Code must be designed for easy modification, extension, and refactoring by any team member.
- **Rule:** Prioritize standard patterns, clear modular boundaries, and decoupled abstractions over quick hacks.
- **Why:** PulseTrack evolves across multiple roadmap phases (e.g., adding Upstash Redis and ARQ workers in Phase 2). Clean separation ensures Phase 2 features slot in as new files without refactoring existing core logic.

### 1.3 Explicit over Implicit
Avoid implicit state mutations, wildcard imports (`from module import *`), magic auto-wiring, or unannotated dynamic variables.
- **Rule:** Dependencies, type hints, function parameters, database transactions, and module exports must be explicitly declared.
- **Why:** Explicit code simplifies static analysis with `mypy --strict` and `ruff`, enables self-documenting APIs, and prevents subtle runtime name collisions.

### 1.4 Composition over Inheritance
Inheritance hierarchies create tight coupling, brittle base classes, and deep call stacks.
- **Rule:** Prefer composing functionality through constructor injection and small protocol interfaces rather than extending deep class hierarchies.
- **Why:** Services in PulseTrack need to combine repositories, cache clients, and queue producers. Injecting dependencies into constructors allows flexible unit testing with fakes without overriding base class behavior.

### 1.5 Small Focused Modules
Files and modules must focus on a single conceptual domain.
- **Rule:** Keep individual Python files under 300 lines of code. If a service or repository grows larger, split it along functional sub-domains.
- **Why:** Smaller modules fit easily into memory, prevent merge conflicts, simplify unit testing, and enforce clean file organization.

### 1.6 Single Responsibility Principle (SRP)
Every class, module, function, and component must have exactly one reason to change.
- **Rule:** A router handles HTTP contracts; a service handles business logic; a repository handles SQL execution.
- **Why:** Separating HTTP parsing from database access ensures that changing an API response format never risks breaking SQL transaction boundaries.

### 1.7 Clean Architecture & Layered Boundaries
Enforce a strict inward dependency flow: `api → dependencies → services → repositories → models/database`.
- **Rule:** Higher layers depend on lower layers. Lower layers NEVER import higher layers.
- **Why:** This architecture ensures that core ingestion logic in `services/` can be invoked identically by the FastAPI HTTP endpoints and by the ARQ background worker tasks without code duplication.

### 1.8 Fail Fast
Validate inputs and verify preconditions at the system perimeter before executing expensive computations or database operations.
- **Rule:** Parse and validate HTTP payloads using Pydantic v2 schemas upon entry. Validate API keys early in dependency injection.
- **Why:** Failing early prevents resource exhaustion, prevents partial writes, and keeps invalid requests off the critical database write path.

### 1.9 Secure by Default
Security controls must be applied automatically without requiring manual step-by-step developer memory.
- **Rule:** API keys are CSPRNG-generated and SHA-256 hashed at rest; tenant scoping (`application_id`) is strictly enforced at the query layer; parameterization is mandatory for all database calls.
- **Why:** Telemetry systems receive untrusted input from external networks. Secure defaults guarantee zero tenant data leaks even if an engineer writes a new endpoint.

### 1.10 Performance with Simplicity
Optimize for write-path latency (<50ms p95 for `POST /v1/events`) using simple, proven mechanisms (O(1) Redis lookups, bulk database inserts, cache-aside reads) rather than complex distributed state algorithms.
- **Rule:** Prefer simple horizontal scaling and async batching over complex multi-layer caching setups. Fall back gracefully to synchronous DB writes if Redis is unavailable (NFR-REL-02).
- **Why:** Simple performance designs are easier to reason about, operate, and maintain under peak ingestion loads.

---

## 2. General Coding Guidelines

### 2.1 Write Self-Explanatory Code
Code must be self-documenting through clear function names, descriptive variable names, and explicit type annotations. Comments should explain *why* non-obvious business decisions were made, never *what* the code does.

### 2.2 Avoid Unnecessary Abstractions
Do not build speculative abstractions or generic framework adapters for hypothetical future requirements ("YAGNI" — You Aren't Gonna Need It). Write standard Python, FastAPI, and SQLAlchemy 2.0 code directly.

### 2.3 Keep Functions Focused
Functions must perform a single operation and fit within a single screen (<40 lines). If a function contains nested logical blocks, extract those blocks into named private helper functions.

### 2.4 Prefer Immutability
Minimize mutable state. Prefer returning new data structures rather than modifying arguments in-place. Use Pydantic models with `frozen=True` or Python `@dataclass(frozen=True, slots=True)` for domain value objects.

### 2.5 Avoid Duplication (DRY)
Do not copy-paste code snippets across endpoints or background tasks. Shared algorithms (e.g., date-truncation helpers, standard error formatting, key hashing) must reside in dedicated utility or security modules.

### 2.6 Keep Dependencies Minimal
Every third-party dependency added to `pyproject.toml` introduces operational risk, security supply-chain surface area, and maintenance overhead. Prefer Python 3.12 standard library modules (`hashlib`, `secrets`, `asyncio`, `dataclasses`, `enum`) unless a third-party package provides significant value (e.g., `fastapi`, `sqlalchemy`, `pydantic`, `arq`).

### 2.7 Write Deterministic Code
Avoid non-deterministic logic in core services. Do not rely on system wall-clock time directly inside business logic—inject time providers or pass explicit `datetime` arguments to ensure tests remain completely deterministic.

### 2.8 Avoid Hidden Side Effects
Functions must not perform unexpected global mutations, modify environment variables at runtime, or alter global state. Side effects (database writes, Redis enqueues, structured logging) must be explicit and expected based on the function name.

---

## 3. Project Structure Rules

PulseTrack follows a strict layered backend folder structure (defined in `PulseTrack_Folder_Structure.md`). Every module belongs to a specific architectural layer with rigid import and dependency boundaries.

### 3.1 Layer Responsibilities

```
app/
├── main.py                 # Application entrypoint & lifespan wiring
├── api/v1/                 # HTTP layer: Routers, request parsing, response serialization
├── core/                   # Framework configuration (config.py) and logging (logging.py)
├── dependencies/           # FastAPI dependency injection (Auth, DB session, Rate Limiting)
├── middleware/             # ASGI middleware (Request ID, Logging, Global Error Handler)
├── security/               # CSPRNG API Key generation, SHA-256 hashing, verification
├── schemas/                # Pydantic v2 request/response models (Contract definitions)
├── models/                 # SQLAlchemy 2.0 ORM models (Database schema definitions)
├── database/               # PostgreSQL connection lifecycle, async engine, session factory
├── repositories/           # Data access layer (SQL execution, query construction)
├── services/               # Business logic orchestration (Ingestion, Aggregation)
├── cache/                  # Redis cache-aside client and connection factory
├── queue/                  # Event enqueue/dequeue abstractions (Redis Streams/Lists)
├── rate_limiting/          # Fixed-window Lua-script rate limiter
├── workers/                # ARQ background process definitions & task entrypoints
├── observability/          # Prometheus metrics collection and exposition
├── exceptions/             # Domain exception hierarchy (AppException)
├── utils/                  # Pure, framework-agnostic utility functions
└── common/                 # Shared enums and constants
```

### 3.2 Allowed Dependency Directions
Dependency direction MUST flow strictly inward:

$$\text{api} \longrightarrow \text{dependencies} \longrightarrow \text{services} \longrightarrow \text{repositories} \longrightarrow \text{models / database}$$

- `api/v1/` routes may import `schemas/`, `dependencies/`, and `exceptions/`.
- `dependencies/` may import `services/`, `cache/`, `rate_limiting/`, and `database/`.
- `services/` may import `repositories/`, `cache/`, `queue/`, `security/`, `exceptions/`, `utils/`, and `common/`.
- `repositories/` may import `models/`, `database/`, and `common/`.
- `workers/` may import `services/`, `repositories/`, and `core/`.

### 3.3 Forbidden Dependencies
The following imports are strictly prohibited and enforced via static analysis and automated testing:

1. **Routers calling Repositories/Models directly:** `api/v1/` MUST NEVER import `repositories/` or `models/`. All data access must pass through `services/`.
2. **Services importing FastAPI:** `services/` MUST NEVER import `fastapi`, `Request`, `Response`, `Depends`, or `HTTPException`. Services must remain 100% framework-independent.
3. **Repositories importing Schemas:** `repositories/` MUST NEVER import Pydantic models from `schemas/`. Repositories accept primitives/ORM models and return primitives/ORM models.
4. **Models/Database importing Services/API:** `models/` and `database/` MUST NEVER import from `services/` or `api/`.
5. **Infrastructure importing Business Logic:** `cache/`, `queue/`, `rate_limiting/`, and `security/` MUST NEVER import from `services/` or `repositories/`.
6. **Circular Dependencies:** No two modules may import each other directly or indirectly.

---

## 4. Python Coding Standards

PulseTrack target runtime: **Python 3.12+**.

### 4.1 Formatting & Indentation
- Use **4 spaces** per indentation level. Do NOT use tabs.
- Maximum line length is **88 characters** (matching `ruff` and `black` default formatting standards).
- Multiline statements must use implicit line joining inside parentheses, brackets, or braces.

### 4.2 Imports
Imports must be grouped and ordered via `isort` / `ruff`:
1. Standard library imports (`import hashlib`, `from datetime import datetime, timezone`).
2. Related third-party imports (`from fastapi import APIRouter`, `from sqlalchemy import select`).
3. Local application imports (`from app.services.ingestion_service import IngestionService`).

- Wildcard imports (`from module import *`) are strictly forbidden.
- Always use absolute imports originating from `app.` (e.g., `from app.core.config import get_settings`). Relative imports (`from ..core import config`) are forbidden.

### 4.3 Type Hints & Static Typing
- All function signatures, methods, class variables, and module exports MUST include complete type annotations.
- Static typing is checked using **`mypy --strict`**. Zero type errors are permitted in CI.
- Use native Python 3.12+ syntax:
  - Use `X | None` instead of `Optional[X]`.
  - Use `list[str]` and `dict[str, Any]` instead of `List[str]` and `Dict[str, Any]`.
  - Use explicit type parameter syntax for generic classes/functions: `class BaseRepository[T]: ...`.

```python
# GOOD
def calculate_bucket_start(timestamp: datetime, granularity: Granularity) -> datetime:
    ...

# FORBIDDEN
def calculate_bucket_start(timestamp, granularity):
    ...
```

### 4.4 Dataclasses & Enums
- Use `@dataclass(frozen=True, slots=True)` for internal data transfer containers that do not require Pydantic validation.
- Enums MUST inherit from `enum.StrEnum` (or `(str, Enum)`) to ensure JSON serialization compatibility.

```python
from enum import StrEnum

class Granularity(StrEnum):
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"
```

### 4.5 Constants & Magic Values
- Hardcoded magic strings, arbitrary numbers, and inline timeouts are strictly prohibited.
- Global constants must be defined in `app/common/constants.py` using `UPPER_SNAKE_CASE`.
- System settings must be defined in `app/core/config.py` as fields on the `Settings` class.

```python
# GOOD
from app.common.constants import MAX_METADATA_BYTES

if len(metadata_bytes) > MAX_METADATA_BYTES:
    raise PayloadTooLargeError(...)

# FORBIDDEN
if len(metadata_bytes) > 10000:
    ...
```

### 4.6 Comprehensions
- List, set, and dictionary comprehensions are encouraged for simple transformations.
- Comprehensions MUST NOT exceed one level of iteration and one optional filtering condition.
- If transformation logic requires nested loops or side effects, use an explicit `for` loop.

### 4.7 Context Managers
- Resource lifecycle management (database sessions, Redis connections, locks, temporary files) MUST use `async with` or `with` statements.
- Never manually open and close sessions or connections without a try/finally or context manager.

### 4.8 Async Programming Rules
- PulseTrack runs on an `asyncio` event loop managed by Uvicorn.
- **NEVER call blocking synchronous I/O operations inside `async def` functions.**
  - FORBIDDEN: `time.sleep()`, `requests.get()`, `urllib.request.urlopen()`, blocking standard file operations.
  - MANDATORY: `asyncio.sleep()`, `httpx.AsyncClient()`, `aiofiles`.
- CPU-heavy background tasks must be offloaded to the ARQ worker pool (`workers/`).

### 4.9 Exception Handling
- Catch explicit, specific exception classes (`ValueError`, `SQLAlchemyError`, `redis.RedisError`). Catching bare `except:` or `except Exception:` is strictly forbidden unless in top-level middleware.
- When re-raising or wrapping exceptions, preserve the original traceback using `raise CustomError(...) from err`.

---

## 5. FastAPI Standards

### 5.1 Routers & Endpoint Definition
- Routers MUST be declared in `app/api/v1/` and mounted in `app/api/v1/router.py`.
- Router endpoint handlers MUST contain zero business logic. Their sole responsibilities are:
  1. Receiving validated inputs from Pydantic models and dependencies.
  2. Invoking a single method on an injected service.
  3. Returning the response model.

```python
# GOOD
@router.post(
    "/events",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=EventIngestResponse,
)
async def ingest_event(
    payload: EventCreate,
    app: Application = Depends(get_current_application),
    service: IngestionService = Depends(get_ingestion_service),
) -> EventIngestResponse:
    return await service.ingest_event(application=app, payload=payload)
```

### 5.2 Dependency Injection (DI)
- Use FastAPI's `Depends()` for request-scoped lifecycle objects (authenticated application, database session, service instances, rate limit checkers).
- Place dependency providers in `app/dependencies/`.

### 5.3 Response Models & Status Codes
- Every endpoint handler MUST define explicit `status_code` (using `starlette.status`) and `response_model` parameters.
- Successful ingestion in Phase 2 MUST return `202 ACCEPTED` (queued). Phase 1 fallback returns `201 CREATED`. Successful reads return `200 OK`.
- Never return raw dicts or ORM instances directly from a router handler.

### 5.4 Validation & Pydantic v2
- Request bodies and query parameters MUST be validated via Pydantic v2 models in `app/schemas/`.
- Use `Field(..., description=..., ge=..., le=...)` to specify bounds and OpenAPI docs.
- Custom validation logic must use `@field_validator` or `@model_validator(mode='after')`.

### 5.5 Middleware
- Middleware must reside in `app/middleware/`.
- PulseTrack includes three mandatory ASGI middleware components:
  1. `RequestIdMiddleware`: Generates or propagates a `X-Request-ID` UUID per request.
  2. `RequestLoggingMiddleware`: Logs structured JSON details for every HTTP request (path, method, latency, status).
  3. `GlobalErrorHandlerMiddleware`: Catches unhandled domain exceptions and formats standard JSON error envelopes.

### 5.6 Exception Handlers
- Domain exceptions (`AppException`) must be mapped to standard HTTP error envelopes via custom handlers registered in `main.py`.
- Error envelope structure (defined in `PulseTrack_API_Design.md` §4.2):

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or revoked.",
    "details": []
  }
}
```

### 5.7 Lifespan Management
- Database engine creation, session factory initialization, and Redis connection pool setup MUST occur inside the FastAPI `@asynccontextmanager` lifespan handler in `app/main.py`.
- Resources must be gracefully closed upon process shutdown.

### 5.8 OpenAPI Documentation
- Every endpoint MUST include `summary`, `description`, `tags`, and explicit error response documentation for OpenAPI UI generation (`/docs`).

---

## 6. SQLAlchemy Standards

PulseTrack uses **SQLAlchemy 2.0** with `asyncpg` for asynchronous PostgreSQL access against Neon.

### 6.1 Declarative Models
- All models must inherit from `Base` (`app/models/base.py`) and use SQLAlchemy 2.0 `Mapped[...]` and `mapped_column(...)` type annotations.
- Every model must include `TimestampMixin` (`created_at`, `updated_at`).
- Explicitly define `__tablename__` as a pluralized snake_case noun (e.g., `applications`, `events`).

```python
from sqlalchemy import String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class Application(Base, TimestampMixin):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
```

### 6.2 Primary Key & Partitioning Rules
- **`events.id` Primary Key:** MUST be `BIGINT IDENTITY` (ADR-001) to optimize B-tree index insertion locality under high write volume. Do NOT use UUID for `events.id`.
- **Partitioning:** The `events` table MUST be range-partitioned by `occurred_at` (monthly partitions). Migrations creating partitions must be maintained in `alembic/`.

### 6.3 Relationships & Loading
- Relationships between models MUST be explicitly typed.
- To prevent accidental blocking N+1 queries in async mode, set `lazy="raise"` by default on relationships unless explicitly using `selectinload` or `joinedload`.

### 6.4 Transactions & Session Lifecycle
- Database sessions are created per-request via `get_session()` in `app/database/session.py`.
- Transactions MUST be managed explicitly using `async with session.begin():` blocks inside services or repositories.
- Autocommit is disabled. Every mutation requires an explicit `await session.commit()`.

### 6.5 Repository Pattern & Query Construction
- All database queries MUST be constructed using SQLAlchemy 2.0 style (`select()`, `insert()`, `update()`, `delete()`). Legacy 1.x `session.query()` syntax is forbidden.
- Repositories in `app/repositories/` inherit from `BaseRepository[T]` and isolate all SQL operations.

```python
# GOOD (SQLAlchemy 2.0 style)
stmt = select(Application).where(Application.api_key_hash == key_hash)
result = await self.session.execute(stmt)
return result.scalar_one_or_none()

# FORBIDDEN (Legacy 1.x style)
return self.session.query(Application).filter_by(api_key_hash=key_hash).first()
```

### 6.6 Bulk Operations
- For background ingestion in ARQ workers, bulk inserts MUST use SQLAlchemy's core `insert(Event).values([...])` to insert batches of up to 500 rows in a single multi-row statement.

### 6.7 Migrations (Alembic)
- All schema alterations MUST be executed via Alembic migration scripts in `alembic/versions/`.
- Every migration must be tested for both `upgrade()` and `downgrade()` executions.
- Manual raw DDL run directly on PostgreSQL environments outside Alembic is strictly forbidden.

---

## 7. Naming Conventions

Consistency across all codebase identifiers is mandatory.

| Element | Convention | Pattern / Template | Example |
|---|---|---|---|
| **Folders** | `snake_case` | Plural for collections, singular for core concerns | `repositories/`, `services/`, `security/` |
| **Python Files** | `snake_case` | Descriptive, noun/verb matching purpose | `ingestion_service.py`, `event_repository.py` |
| **Modules / Packages** | `snake_case` | Short, unambiguous | `app.services.aggregation_service` |
| **Classes** | `PascalCase` | Noun phrase describing responsibility | `IngestionService`, `ApplicationRepository` |
| **Interfaces / Protocols** | `PascalCase` | Prefix `I` or suffix `Protocol` | `EventBufferProtocol` |
| **Services** | `PascalCase` | Suffix `Service` | `ApplicationService`, `AggregationService` |
| **Repositories** | `PascalCase` | Suffix `Repository` | `EventRepository`, `ApplicationRepository` |
| **Pydantic Schemas** | `PascalCase` | Domain + Action/Role suffix | `EventCreate`, `ApplicationRead`, `MetricsResponse` |
| **ORM Models** | `PascalCase` | Singular domain entity name | `Application`, `Event` |
| **Functions / Methods** | `snake_case` | Verb-first phrase | `get_by_api_key_hash()`, `bulk_insert_events()` |
| **Variables** | `snake_case` | Descriptive noun phrase (no cryptic abbreviations) | `authenticated_app`, `event_batch` |
| **Constants** | `UPPER_SNAKE_CASE` | Global scope prefix | `MAX_METADATA_BYTES`, `DEFAULT_CACHE_TTL_SECONDS` |
| **Environment Variables** | `UPPER_SNAKE_CASE` | Matching `Settings` fields | `DATABASE_URL`, `REDIS_URL`, `LOG_LEVEL` |
| **Database Tables** | `snake_case` | Pluralized noun | `applications`, `events` |
| **Database Columns** | `snake_case` | Singular noun | `api_key_hash`, `occurred_at`, `metadata` |
| **Database Indexes** | `snake_case` | `idx_{table}_{columns}` | `idx_events_app_type_occurred` |
| **Database Constraints** | `snake_case` | `fk_{table}_{target}` / `uq_{table}_{column}` | `uq_applications_api_key_hash` |
| **API Endpoints** | `kebab-case` | Plural nouns, versioned prefix `/v1` | `POST /v1/events`, `GET /v1/applications/{id}/metrics` |
| **Request Schemas** | `PascalCase` | Suffix `Create`, `Update`, `Query` | `EventCreate`, `ApplicationCreate` |
| **Response Schemas** | `PascalCase` | Suffix `Response`, `Read` | `EventIngestResponse`, `MetricsResponse` |

---

## 8. Function Standards

### 8.1 Function Length & Scope
- Functions MUST NOT exceed **40 lines of code** (excluding docstrings).
- A function must do exactly one thing at a single level of abstraction.

### 8.2 Arguments
- Limit function parameters to a maximum of **4 positional arguments**.
- If a function requires more than 4 parameters, bundle them into a typed Pydantic model or `@dataclass`.
- Boolean positional flags (`def process(event, true):`) are forbidden. Use keyword-only arguments (`def process(event, *, skip_cache: bool = False):`).

### 8.3 Return Values
- All functions MUST declare an explicit return type hint.
- Avoid returning raw `tuple` or untyped `dict`. Return domain objects, dataclasses, or Pydantic models.
- If a function can return empty results, use `X | None`.

### 8.4 Early Returns (Guard Clauses)
- Use early returns to handle edge cases, invalid inputs, and error preconditions at the beginning of a function.
- Avoid deep `if/else` nesting. Maximum allowed nesting depth is **2 levels**.

```python
# GOOD
async def get_application(self, app_id: uuid.UUID) -> Application:
    app = await self.repo.get_by_id(app_id)
    if app is None:
        raise ApplicationNotFoundError(app_id)
    if app.status != "active":
        raise ApplicationInactiveError(app_id)
    return app

# FORBIDDEN
async def get_application(self, app_id: uuid.UUID) -> Application:
    app = await self.repo.get_by_id(app_id)
    if app is not None:
        if app.status == "active":
            return app
        else:
            raise ApplicationInactiveError(app_id)
    else:
        raise ApplicationNotFoundError(app_id)
```

### 8.5 Pure Functions
- Helper utility functions in `app/utils/` MUST be pure functions: given the same input, they always return the same output with zero side effects.

---

## 9. Class Standards

### 9.1 Class Size & Responsibility
- Service and repository classes MUST NOT exceed **300 lines of code**.
- Limit public methods on a class to **7 or fewer**. If a class requires more public methods, it indicates split responsibilities and must be refactored into smaller specialized classes.

### 9.2 Dependency Injection via `__init__`
- Classes MUST receive all external dependencies (repositories, cache clients, queue producers, settings) via `__init__` constructor injection.
- Never instantiate or reach for global singleton instances inside method bodies.

```python
# GOOD
class IngestionService:
    def __init__(
        self,
        event_repo: EventRepository,
        event_queue: EventQueue,
        settings: Settings,
    ) -> None:
        self._event_repo = event_repo
        self._event_queue = event_queue
        self._settings = settings
```

### 9.3 Encapsulation
- Internal helper methods and private attributes MUST be prefixed with a single underscore `_` (e.g., `self._validate_payload()`).
- Public fields should be immutable or read-only properties where possible.

---

## 10. Error Handling Standards

### 10.1 Custom Exception Hierarchy
All domain exceptions MUST inherit from `AppException` defined in `app/exceptions/base.py`.

```
AppException (base)
├── AuthenticationError
│   └── InvalidAPIKeyError
├── NotFoundError
│   └── ApplicationNotFoundError
├── ValidationError
│   ├── PayloadTooLargeError
│   └── InvalidTimestampError
├── RateLimitExceededError
├── ConflictError
│   └── DuplicateEventError
└── ServiceUnavailableError
    └── RedisUnavailableError
```

### 10.2 Exception Definition Pattern
Every domain exception MUST define a default error `code`, `status_code`, and descriptive `message`.

```python
class InvalidAPIKeyError(AppException):
    def __init__(self) -> None:
        super().__init__(
            code="INVALID_API_KEY",
            message="The provided API key is invalid or has been revoked.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
```

### 10.3 Graceful Degradation & Redis Failures (NFR-REL-02)
- **Critical Policy:** If Upstash Redis is unavailable during event ingestion, the system MUST NOT fail the request.
- `IngestionService` MUST catch `RedisError` / `ServiceUnavailableError` when attempting async enqueueing and gracefully fall back to synchronous PostgreSQL insertion (`201 CREATED`).
- Redis outage degradation must log a `WARNING` with structured context and increment a Prometheus fallback counter.

### 10.4 Worker Failure & Dead-Letter Queue (DLQ)
- ARQ worker tasks (`workers/tasks/ingest_batch.py`) MUST implement a retry policy: max 3 attempts with exponential backoff.
- If a batch fails 3 times, the worker task MUST move the batch to a Redis-backed Dead-Letter Queue (`dlq:events`) for manual operator inspection, preventing data loss.

---

## 11. Logging Standards

PulseTrack enforces **structured JSON logging** across both web service and background worker processes via `app/core/logging.py`.

### 11.1 Log Structure & Formatting
All logs MUST be output as single-line JSON objects containing standard context fields:

```json
{
  "timestamp": "2026-08-05T12:00:00.123456Z",
  "level": "INFO",
  "logger": "app.services.ingestion_service",
  "message": "Event batch ingested successfully",
  "request_id": "c3a9f0d1-7b8e-4a2f-9c1d-8e3f4a5b6c7d",
  "application_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "duration_ms": 12.4,
  "batch_size": 150
}
```

### 11.2 Request ID Correlation
- The ASGI `RequestIdMiddleware` injects a unique `request_id` into Python's `contextvars`.
- Every log message recorded during an HTTP request lifecycle automatically includes `request_id` for end-to-end trace correlation.

### 11.3 Log Levels & Usage Guidelines
- `DEBUG`: Fine-grained diagnostic information for local development (disabled in production).
- `INFO`: Standard operational events (application started, key created, batch committed, metrics computed).
- `WARNING`: Degraded operation or unexpected recoverable condition (Redis connection failed — falling back to sync DB insert; rate limit exceeded).
- `ERROR`: Unhandled exception or operation failure affecting a user request (database write error, invalid migration state).
- `CRITICAL`: System-wide unrecoverable failure (database connection pool exhausted, startup configuration invalid).

### 11.4 Sensitive Data Masking & Forbidden Logs
- **NEVER LOG:**
  - Raw API keys (plaintext keys like `pt_live_...`).
  - Database passwords, Redis auth tokens, or signing secrets.
  - Full unredacted Authorization or `X-API-Key` headers.
  - Raw client payload bodies containing unverified client data.
- **Rule:** Log only hashed keys (`api_key_hash[:8]...`), tenant UUIDs, and aggregated counts.

---

## 12. Security Coding Standards

Security controls are mandatory and non-negotiable (aligning with `Security_Design_Document.md`).

### 12.1 Authentication & API Key Handling
- Plaintext API keys format: `pt_live_<32_random_hex_bytes>` or `pt_test_<32_random_hex_bytes>`.
- Generated using Python's CSPRNG: `secrets.token_hex(32)`.
- Plaintext API keys MUST NEVER be stored in the database.
- Keys are stored solely as **SHA-256 hashes**: `hashlib.sha256(raw_key.encode()).hexdigest()`.
- API Key verification MUST use constant-time string comparison to prevent timing attacks:

```python
import secrets

def verify_api_key(provided_key_hash: str, stored_key_hash: str) -> bool:
    return secrets.compare_digest(provided_key_hash, stored_key_hash)
```

### 12.2 Authorization & Tenant Isolation
- PulseTrack is a multi-tenant application. Tenant isolation MUST be enforced at the SQL query layer.
- **Mandatory Query Scoping:** Every event write, event read, and metrics aggregation query MUST include `WHERE application_id = :authenticated_app_id`.
- Never accept `application_id` from client-supplied payload bodies or path parameters for authorization—always use the authenticated `Application` object resolved from `X-API-Key`.

### 12.3 SQL Injection Prevention
- SQL injection is completely eliminated by mandating 100% parameterized queries via SQLAlchemy 2.0 ORM and Core statement builders.
- Raw string concatenation or `f-strings` inside SQL statements are strictly forbidden.

```python
# GOOD
stmt = select(Event).where(Event.application_id == app_id)

# FORBIDDEN
stmt = f"SELECT * FROM events WHERE application_id = '{app_id}'"
```

### 12.4 Input Validation & Payload Size Limits
- JSON payload size for `POST /v1/events` is capped at **1 MB**.
- Event `metadata` JSONB object size is capped at **10 KB** (`MAX_METADATA_BYTES = 10000`).
- Maximum batch size for `POST /v1/events/batch` is capped at **500 events**.

### 12.5 Environment Secrets
- Production secrets (`DATABASE_URL`, `REDIS_URL`) MUST be injected as environment variables by Render.
- Hardcoding secrets, committing `.env` files, or writing credentials to disk is strictly forbidden.

---

## 13. Performance Guidelines

### 13.1 Async Event Loop Efficiency
- Do NOT run long-running CPU-bound calculations on the main ASGI event loop thread.
- Avoid excessive object allocations inside high-frequency request paths (`POST /v1/events`).

### 13.2 Database Query Optimization
- Avoid N+1 queries by using explicit `selectinload()` or `joinedload()` for relationships.
- Use explicit column selection (`select(Event.id, Event.occurred_at)`) for high-volume aggregation queries rather than fetching full ORM entities when only specific attributes are required.
- Leverage the GIN index on `events.metadata` for JSONB key/value filter operations.

### 13.3 Redis Caching Strategy
- Use **Cache-Aside** caching (`app/cache/cache_aside.py`) for API key resolution:
  - Cache key: `cache:app_key:{sha256_hash}` -> Value: `Application` JSON (TTL: 300s).
- Aggregation results (`GET /v1/applications/{id}/metrics`) are cached with a short TTL (60s).
- Cache misses must fall back to PostgreSQL and populate Redis asynchronously.

### 13.4 Connection Pooling
- PostgreSQL (`asyncpg`): Configure pool size `pool_size=10`, `max_overflow=20`, `pool_recycle=1800` in `app/database/session.py`.
- Upstash Redis: Maintain a single singleton connection pool per process via `app/cache/client.py`.

---

## 14. Documentation Standards

### 14.1 Docstring Format
- All public modules, classes, services, repositories, and helper functions MUST include Google-style docstrings.

```python
async def aggregate_metrics(
    self,
    application_id: uuid.UUID,
    start_time: datetime,
    end_time: datetime,
    granularity: Granularity,
) -> MetricsResponse:
    """Computes aggregated telemetry metrics for a given application tenant.

    Args:
        application_id: The UUID of the authenticated tenant.
        start_time: Beginning of the aggregation window (inclusive).
        end_time: End of the aggregation window (exclusive).
        granularity: Time bucket resolution (minute, hour, day).

    Returns:
        MetricsResponse containing bucketed event counts.

    Raises:
        InvalidTimestampError: If start_time is greater than or equal to end_time.
    """
```

### 14.2 Code Comments
- Comments must explain *why* a complex algorithm or non-obvious trade-off was implemented.
- Do NOT write comments that merely restate Python code.

---

## 15. Testing Standards

PulseTrack enforces a comprehensive testing strategy (defined in `PulseTrack_Testing_Strategy.md`).

### 15.1 Testing Framework & Execution
- Test framework: `pytest` with `pytest-asyncio` and `httpx.AsyncClient`.
- Tests mirror application structure 1:1 inside `tests/` (`app/services/ingestion_service.py` -> `tests/services/test_ingestion_service.py`).
- Total test coverage floor is **80%** across `app/`, enforced in CI.

### 15.2 Unit Tests
- Unit tests test services, security functions, and utilities in complete isolation.
- External dependencies (repositories, Redis) MUST be replaced with in-memory mocks or fake repositories.
- Unit test suite must execute in **<10 seconds**.

### 15.3 Integration Tests
- Integration tests test `repositories/` against a real test database (Neon branch or local Postgres container).
- Database integration tests MUST execute inside an isolated transaction per test (`async with session.begin()` rolled back upon completion).

### 15.4 API & End-to-End Tests
- API tests invoke FastAPI endpoints using `httpx.AsyncClient(app=app, base_url="http://test")`.
- Verify status codes, error envelope structures, header propagation, and auth rejection.

```python
@pytest.mark.asyncio
async def test_ingest_event_unauthorized(async_client: AsyncClient) -> None:
    response = await async_client.post("/v1/events", json={"event_type": "click"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert data["status"] == "error"
    assert data["error"]["code"] == "INVALID_API_KEY"
```

---

## 16. Configuration Standards

### 16.1 `Settings` Class & Pydantic-Settings
- All configuration settings MUST be declared as typed fields on the `Settings` class in `app/core/config.py` inheriting from `pydantic_settings.BaseSettings`.
- Settings are loaded automatically from environment variables.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    DATABASE_URL: str
    REDIS_URL: str
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 600

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

### 16.2 Runtime Validation & Environment Files
- A singleton `get_settings()` function wrapped with `@lru_cache` provides cached settings access.
- Missing required environment variables (e.g., `DATABASE_URL`) MUST fail startup immediately with a validation error.
- `.env.example` must contain non-sensitive default values for local development. `.env` files are added to `.gitignore`.

---

## 17. Dependency Management

### 17.1 Tooling & Specification
- Dependency management is configured via **`pyproject.toml`**.
- Direct production dependencies must specify exact or minor-pinned version bounds (e.g., `fastapi>=0.110.0,<0.111.0`).

### 17.2 Dependency Auditing
- Regularly audit installed packages for security vulnerabilities using `pip-audit` or `bandit`.
- Unused dependencies must be removed immediately from `pyproject.toml`.

---

## 18. Git Standards

### 18.1 Branch Naming Conventions
- `feature/<short-description>`: New functional features or roadmap items.
- `bugfix/<short-description>`: Fixes for defects or failing tests.
- `refactor/<short-description>`: Internal code refactoring without contract changes.
- `chore/<short-description>`: Maintenance, dependency updates, CI pipeline tweaks.

### 18.2 Commit Message Format (Conventional Commits)
Commit messages MUST follow the Conventional Commits specification:

$$\text{<type>[(scope)]: <description>}$$

- `feat(ingestion): add batch event ingestion endpoint`
- `fix(auth): fix timing attack vulnerability in key verification`
- `test(repositories): add integration tests for event query partitioning`
- `docs(standards): add comprehensive coding standards document`

### 18.3 Pull Request & Release Process
- PR titles must match Conventional Commit formatting.
- Merges to `main` MUST use **Squash and Merge** to maintain a clean linear git history.
- Production releases are tagged using Semantic Versioning (`v1.0.0`, `v1.1.0`).

---

## 19. Code Review Checklist

Reviewers and developers must verify every pull request against this checklist:

- [ ] **Readability:** Is the code clean, explicit, self-documenting, and free of clever hacks?
- [ ] **Architecture:** Does the code strictly follow `api → dependencies → services → repositories → models` layering rules?
- [ ] **Naming:** Are naming conventions strictly followed across files, classes, functions, and variables?
- [ ] **Typing:** Are complete type hints provided? Does `mypy --strict` pass with 0 errors?
- [ ] **Security:** Is `application_id` tenant scoping enforced on all database queries? Are raw API keys hidden and SHA-256 hashed?
- [ ] **Error Handling:** Are custom `AppException` subclasses used? Are Redis outages handled with fail-open fallback?
- [ ] **Logging:** Is structured JSON logging used? Are raw keys and secrets excluded from logs?
- [ ] **Performance:** Are database queries parameterized and optimized? Are blocking calls kept off the async event loop?
- [ ] **Testing:** Are unit/integration tests included? Is total code coverage $\ge 80\%$?
- [ ] **Documentation:** Are docstrings present on all public interfaces? Is OpenAPI spec updated?

---

## 20. Static Analysis & Tooling

Static analysis checks are enforced automatically in local pre-commit hooks and CI pipelines (`.github/workflows/ci.yml`).

### 20.1 Configured Static Analysis Suite
1. **Ruff (`ruff check .`):** Fast linting for Python style, unused imports, bad syntax, and formatting.
2. **Ruff Format (`ruff format --check .`):** Code formatting enforcement (88 character line limit).
3. **Mypy (`mypy --strict app`):** Strict static type checking.
4. **Bandit (`bandit -r app`):** Automated security vulnerability scanning.

### 20.2 Pre-Commit Setup
Developers must install pre-commit hooks locally:

```bash
pip install pre-commit
pre-commit install
```

---

## 21. Anti-Patterns

The following anti-patterns are strictly forbidden in PulseTrack.

### 21.1 God Classes
- **Violation:** A single class containing hundreds of lines handling parsing, database queries, caching, and serialization.
- **Why Forbidden:** Violates SRP, creates extreme code churn, and makes unit testing impossible.

### 21.2 Business Logic in Routers
- **Violation:** Writing SQL queries, validation algorithms, or queue operations inside FastAPI router handlers (`app/api/v1/`).
- **Why Forbidden:** Prevents reusing business logic inside ARQ workers or CLI scripts; tightly couples HTTP to business domain.

### 21.3 Hardcoded Secrets
- **Violation:** Hardcoding database credentials, Redis URLs, or secret keys in source files or test scripts.
- **Why Forbidden:** Major security vulnerability that leads to credential leaks in version control repositories.

### 21.4 Global Mutable State
- **Violation:** Storing request-specific data in global variables or module-level lists/dicts.
- **Why Forbidden:** Causes catastrophic race conditions and cross-tenant data corruption under concurrent async execution.

### 21.5 Circular Dependencies
- **Violation:** Two modules importing each other directly or indirectly.
- **Why Forbidden:** Causes `ImportError` runtime crashes during application startup.

### 21.6 Blocking Async Code
- **Violation:** Calling synchronous blocking functions (`time.sleep()`, `requests.get()`) inside `async def` functions.
- **Why Forbidden:** Blocks the Uvicorn `asyncio` event loop, stalling all concurrent HTTP requests across the entire process.

### 21.7 Raw SQL Concatenation
- **Violation:** Building SQL queries via string formatting (`f"SELECT * FROM users WHERE id = {user_id}"`).
- **Why Forbidden:** Opens the system to severe SQL Injection attacks.

### 21.8 Silent Exception Swallowing
- **Violation:** Catching exceptions with empty `except:` blocks or `pass`.
- **Why Forbidden:** Masks critical system failures, resulting in mysterious silent data loss.

---

## 22. Best Practices

1. **Design for Resiliency:** Assume external managed infrastructure (Redis, network edge) can degrade. Implement fail-open fallbacks (NFR-REL-02).
2. **Batching for High Throughput:** Always batch write operations in background processing (ARQ worker bulk insertion) to minimize database round-trips.
3. **Idempotent API Design:** Clients supplying `Idempotency-Key` headers must receive deterministic identical responses without duplicating event writes.
4. **Clean Test Teardown:** Ensure test fixtures clean up database rows via transaction rollbacks so test suites execute deterministically in parallel.
5. **Constructor Injection:** Always pass service and repository dependencies into `__init__` methods to maintain decoupled, testable components.

---

## 23. Future Evolution

As PulseTrack grows beyond initial phases, these standards evolve according to documented patterns:

1. **Microservice Splitting:** If write volume scales to billions of daily events, the strict separation between `services/` and `api/` allows lifting `app/services/ingestion_service.py` into a standalone ingestion microservice with minimal architectural friction.
2. **Multi-Region Scale:** If deploying across multiple geographic regions, the `BIGINT IDENTITY` decision for `events.id` (ADR-001) will be revisited in favor of composite keys `(region_id, event_id)` while maintaining existing service interfaces.
3. **Streaming Ingestion:** If Redis-backed ARQ queues hit throughput bounds, the `app/queue/` module abstraction enables swapping Redis Streams for Apache Kafka or AWS Kinesis without altering `IngestionService` or HTTP routers.

---

## 24. Final Developer Checklist

Complete this checklist prior to submitting any code for review:

- [ ] Code is fully formatted using `ruff format .`
- [ ] Linter checks pass cleanly using `ruff check .`
- [ ] Strict type checking passes with zero errors using `mypy --strict app`
- [ ] Security scan passes using `bandit -r app`
- [ ] All unit and integration tests pass via `pytest`
- [ ] Test coverage meets or exceeds the **80% threshold** (`pytest --cov=app`)
- [ ] Strict inward layer dependencies (`api → dependencies → services → repositories → models`) are respected
- [ ] All database queries explicitly enforce tenant isolation (`WHERE application_id = ...`)
- [ ] Structured JSON logging is used, with zero raw API keys or secrets in log outputs
- [ ] Standard error envelopes and custom domain exceptions (`AppException`) are utilized
- [ ] Public functions, classes, and methods have Google-style docstrings
- [ ] Git commit messages follow Conventional Commits standard (`feat: ...`, `fix: ...`)

---

*End of document.*
