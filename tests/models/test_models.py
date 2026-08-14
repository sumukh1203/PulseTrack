import uuid
from datetime import UTC, datetime

from app.models.application import Application
from app.models.event import Event


def test_application_model_attributes() -> None:
    """Verifies Application ORM model columns and table name."""
    assert Application.__tablename__ == "applications"

    app = Application(
        name="Test App",
        owner_email="dev@example.com",
        api_key_hash="a" * 64,
        api_key_prefix="pt_live_1234",
    )
    assert app.name == "Test App"
    assert app.owner_email == "dev@example.com"
    assert app.api_key_hash == "a" * 64
    assert app.api_key_prefix == "pt_live_1234"


def test_event_model_attributes() -> None:
    """Verifies Event ORM model columns and table name."""
    assert Event.__tablename__ == "events"

    app_id = uuid.uuid4()
    now = datetime.now(UTC)
    event = Event(
        application_id=app_id,
        event_name="button_clicked",
        session_id="sess_123",
        distinct_id="user_456",
        event_metadata={"button_id": "submit"},
        occurred_at=now,
    )
    assert event.application_id == app_id
    assert event.event_name == "button_clicked"
    assert event.session_id == "sess_123"
    assert event.distinct_id == "user_456"
    assert event.event_metadata == {"button_id": "submit"}
    assert event.occurred_at == now
