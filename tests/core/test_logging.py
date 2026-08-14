import logging

from app.core.logging import JSONFormatter, configure_logging, request_id_ctx


def test_json_formatter() -> None:
    """Verifies structured JSON log formatting."""
    formatter = JSONFormatter(datefmt="%Y-%m-%dT%H:%M:%S")
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test message",
        args=(),
        exc_info=None,
    )
    record.extra_fields = {"custom_key": "custom_val"}

    token = request_id_ctx.set("req_12345")
    try:
        output = formatter.format(record)
        assert '"level": "INFO"' in output
        assert '"message": "Test message"' in output
        assert '"request_id": "req_12345"' in output
        assert '"custom_key": "custom_val"' in output
    finally:
        request_id_ctx.reset(token)


def test_configure_logging() -> None:
    """Verifies root logger configuration."""
    configure_logging("DEBUG")
    root = logging.getLogger()
    assert root.level == logging.DEBUG
    assert len(root.handlers) > 0
