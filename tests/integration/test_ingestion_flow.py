import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.event import Event


@pytest.mark.asyncio
async def test_real_application_registration(
    real_async_client: AsyncClient,
    real_db_session: AsyncSession,
) -> None:
    """Verifies real application registration end-to-end in PostgreSQL."""
    unique_email = f"owner_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Integration Test App",
        "owner_email": unique_email,
    }

    response = await real_async_client.post("/v1/applications", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["name"] == "Integration Test App"
    assert data["api_key"].startswith("pt_live_")
    assert "id" in data

    # Verify directly in PostgreSQL
    app_id = uuid.UUID(data["id"])
    result = await real_db_session.execute(
        select(Application).where(Application.id == app_id)
    )
    db_app = result.scalar_one_or_none()

    assert db_app is not None
    assert db_app.name == "Integration Test App"
    assert db_app.owner_email == unique_email
    assert db_app.api_key_prefix == data["api_key"][:12]
    assert db_app.is_active is True

    # Clean up test row
    await real_db_session.delete(db_app)
    await real_db_session.commit()


@pytest.mark.asyncio
async def test_real_duplicate_email_conflict(
    real_async_client: AsyncClient,
    real_db_session: AsyncSession,
) -> None:
    """Verifies 409 Conflict when duplicate email is registered in PostgreSQL."""
    unique_email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"name": "App 1", "owner_email": unique_email}

    res1 = await real_async_client.post("/v1/applications", json=payload)
    assert res1.status_code == 201
    app_id = uuid.UUID(res1.json()["id"])

    # Second attempt with same email
    res2 = await real_async_client.post("/v1/applications", json=payload)
    assert res2.status_code == 409

    # Clean up
    result = await real_db_session.execute(
        select(Application).where(Application.id == app_id)
    )
    db_app = result.scalar_one_or_none()
    if db_app:
        await real_db_session.delete(db_app)
        await real_db_session.commit()


@pytest.mark.asyncio
async def test_real_event_ingestion_and_persistence(
    real_async_client: AsyncClient,
    real_db_session: AsyncSession,
) -> None:
    """Verifies end-to-end telemetry event ingestion and PostgreSQL persistence."""
    # 1. Register App
    unique_email = f"ingest_{uuid.uuid4().hex[:8]}@example.com"
    app_res = await real_async_client.post(
        "/v1/applications",
        json={"name": "Ingestion Test App", "owner_email": unique_email},
    )
    assert app_res.status_code == 201
    app_data = app_res.json()
    api_key = app_data["api_key"]
    app_id = uuid.UUID(app_data["id"])

    # 2. Ingest Event
    occurred_now = datetime.now(UTC).isoformat()
    event_payload = {
        "event_name": "button_click",
        "occurred_at": occurred_now,
        "session_id": "sess_integration_123",
        "distinct_id": "user_integration_456",
        "metadata": {"button_id": "cta_hero", "page": "/pricing"},
    }

    ingest_res = await real_async_client.post(
        "/v1/events",
        headers={"X-API-Key": api_key},
        json=event_payload,
    )
    assert ingest_res.status_code == 201
    event_data = ingest_res.json()
    assert event_data["status"] == "stored"
    event_db_id = event_data["id"]

    # 3. Query PostgreSQL directly to verify persistence
    result = await real_db_session.execute(select(Event).where(Event.id == event_db_id))
    db_event = result.scalar_one_or_none()

    assert db_event is not None
    assert db_event.application_id == app_id
    assert db_event.event_name == "button_click"
    assert db_event.session_id == "sess_integration_123"
    assert db_event.distinct_id == "user_integration_456"
    assert db_event.event_metadata == {"button_id": "cta_hero", "page": "/pricing"}
    assert db_event.ingested_at is not None

    # Clean up
    result_app = await real_db_session.execute(
        select(Application).where(Application.id == app_id)
    )
    db_app = result_app.scalar_one_or_none()
    if db_app:
        await real_db_session.delete(db_app)
        await real_db_session.commit()


@pytest.mark.asyncio
async def test_real_idempotency_replay(
    real_async_client: AsyncClient,
    real_db_session: AsyncSession,
) -> None:
    """Verifies idempotency replay behavior with real database constraints."""
    unique_email = f"idemp_{uuid.uuid4().hex[:8]}@example.com"
    app_res = await real_async_client.post(
        "/v1/applications",
        json={"name": "Idempotency App", "owner_email": unique_email},
    )
    assert app_res.status_code == 201
    app_data = app_res.json()
    api_key = app_data["api_key"]
    app_id = uuid.UUID(app_data["id"])

    idempotency_key = str(uuid.uuid4())
    event_payload = {
        "event_name": "checkout_completed",
        "occurred_at": datetime.now(UTC).isoformat(),
        "metadata": {"amount": 99.99},
    }

    # First submission -> 201 Created
    res1 = await real_async_client.post(
        "/v1/events",
        headers={"X-API-Key": api_key, "Idempotency-Key": idempotency_key},
        json=event_payload,
    )
    assert res1.status_code == 201
    event_id = res1.json()["id"]

    # Re-submission with same Idempotency-Key -> 200 OK (Replay)
    res2 = await real_async_client.post(
        "/v1/events",
        headers={"X-API-Key": api_key, "Idempotency-Key": idempotency_key},
        json=event_payload,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["id"] == event_id
    assert data2["idempotent_replay"] is True

    # Verify only 1 row exists in DB
    result = await real_db_session.execute(
        select(Event).where(
            Event.application_id == app_id,
            Event.idempotency_key == uuid.UUID(idempotency_key),
        )
    )
    events = result.scalars().all()
    assert len(events) == 1

    # Clean up
    result_app = await real_db_session.execute(
        select(Application).where(Application.id == app_id)
    )
    db_app = result_app.scalar_one_or_none()
    if db_app:
        await real_db_session.delete(db_app)
        await real_db_session.commit()


@pytest.mark.asyncio
async def test_real_metrics_aggregation_query(
    real_async_client: AsyncClient,
    real_db_session: AsyncSession,
) -> None:
    """Verifies real SQL GROUP BY metrics aggregation query against PostgreSQL."""
    unique_email = f"metrics_{uuid.uuid4().hex[:8]}@example.com"
    app_res = await real_async_client.post(
        "/v1/applications",
        json={"name": "Metrics Test App", "owner_email": unique_email},
    )
    assert app_res.status_code == 201
    app_data = app_res.json()
    api_key = app_data["api_key"]
    app_id = app_data["id"]

    now = datetime.now(UTC)
    time_1 = (now - timedelta(hours=2)).isoformat()
    time_2 = (now - timedelta(hours=1)).isoformat()

    # Ingest 2 events at time_1 and 1 event at time_2
    for occurred in [time_1, time_1, time_2]:
        res = await real_async_client.post(
            "/v1/events",
            headers={"X-API-Key": api_key},
            json={"event_name": "page_view", "occurred_at": occurred},
        )
        assert res.status_code == 201

    # Query metrics
    start_date = (now - timedelta(hours=5)).isoformat()
    end_date = (now + timedelta(hours=1)).isoformat()

    metrics_res = await real_async_client.get(
        f"/v1/applications/{app_id}/metrics",
        headers={"X-API-Key": api_key},
        params={
            "start_date": start_date,
            "end_date": end_date,
            "event_name": "page_view",
            "granularity": "hour",
        },
    )
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()

    assert metrics_data["application_id"] == app_id
    assert metrics_data["granularity"] == "hour"
    assert len(metrics_data["data"]) >= 1

    total_count = sum(bucket["count"] for bucket in metrics_data["data"])
    assert total_count == 3

    # Clean up
    result_app = await real_db_session.execute(
        select(Application).where(Application.id == uuid.UUID(app_id))
    )
    db_app = result_app.scalar_one_or_none()
    if db_app:
        await real_db_session.delete(db_app)
        await real_db_session.commit()


@pytest.mark.asyncio
async def test_real_cross_tenant_isolation(
    real_async_client: AsyncClient,
    real_db_session: AsyncSession,
) -> None:
    """Verifies real cross-tenant security isolation between two applications."""
    # App A
    res_a = await real_async_client.post(
        "/v1/applications",
        json={
            "name": "App A",
            "owner_email": f"tenant_a_{uuid.uuid4().hex[:8]}@example.com",
        },
    )
    key_a = res_a.json()["api_key"]
    id_a = uuid.UUID(res_a.json()["id"])

    # App B
    res_b = await real_async_client.post(
        "/v1/applications",
        json={
            "name": "App B",
            "owner_email": f"tenant_b_{uuid.uuid4().hex[:8]}@example.com",
        },
    )
    id_b = res_b.json()["id"]

    # App A attempts to access App B's metrics
    now = datetime.now(UTC)
    forbidden_res = await real_async_client.get(
        f"/v1/applications/{id_b}/metrics",
        headers={"X-API-Key": key_a},
        params={
            "start_date": (now - timedelta(days=1)).isoformat(),
            "end_date": now.isoformat(),
        },
    )
    assert forbidden_res.status_code == 403

    # Clean up both apps
    for app_uuid in [id_a, uuid.UUID(id_b)]:
        result_app = await real_db_session.execute(
            select(Application).where(Application.id == app_uuid)
        )
        db_app = result_app.scalar_one_or_none()
        if db_app:
            await real_db_session.delete(db_app)
            await real_db_session.commit()
