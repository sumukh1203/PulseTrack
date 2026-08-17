"""Partition events table by occurred_at range

Revision ID: 7a5618994702
Revises: 5a5618994701
Create Date: 2026-08-17 09:37:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7a5618994702"
down_revision: str | None = "5a5618994701"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Rename existing events table
    op.rename_table("events", "events_old")

    # 2. Drop indexes on events_old to free up names
    op.drop_index("idx_events_app_idempotency", table_name="events_old")
    op.drop_index("idx_events_app_name_time", table_name="events_old")
    op.drop_index("idx_events_metadata_gin", table_name="events_old")
    op.drop_index("ix_events_application_id", table_name="events_old")

    # 3. Create partitioned events table (composite PK id + occurred_at)
    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=False),
        sa.Column("event_name", sa.String(length=100), nullable=False),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("distinct_id", sa.String(length=128), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("idempotency_key", sa.UUID(), nullable=True),
        sa.CheckConstraint(
            "char_length(event_name) > 0", name="ck_events_event_name_not_empty"
        ),
        sa.ForeignKeyConstraint(
            ["application_id"], ["applications.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", "occurred_at"),
        postgresql_partition_by="RANGE (occurred_at)",
    )

    # 4. Create partitions (default fallback and monthly ranges for August and September 2026)
    op.execute("CREATE TABLE events_default PARTITION OF events DEFAULT")
    op.execute(
        "CREATE TABLE events_y2026m08 PARTITION OF events FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00')"
    )
    op.execute(
        "CREATE TABLE events_y2026m09 PARTITION OF events FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00')"
    )

    # 5. Create indexes on the new partitioned table (unique constraints must include partition keys)
    op.create_index(
        "idx_events_app_idempotency",
        "events",
        ["application_id", "idempotency_key", "occurred_at"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )
    op.create_index(
        "idx_events_app_name_time",
        "events",
        ["application_id", "event_name", sa.literal_column("occurred_at DESC")],
        unique=False,
    )
    op.create_index(
        "idx_events_metadata_gin",
        "events",
        ["metadata"],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index(
        op.f("ix_events_application_id"), "events", ["application_id"], unique=False
    )

    # 6. Migrate records from events_old to events
    # We use a raw execute since SQLAlchemy schemas are modified
    op.execute(
        "INSERT INTO events (id, application_id, event_name, session_id, distinct_id, metadata, occurred_at, ingested_at, idempotency_key) "
        "SELECT id, application_id, event_name, session_id, distinct_id, metadata, occurred_at, ingested_at, idempotency_key FROM events_old"
    )

    # 7. Drop the old table
    op.drop_table("events_old")


def downgrade() -> None:
    # 1. Rename current partitioned table
    op.rename_table("events", "events_partitioned")

    # 2. Re-create non-partitioned events table
    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=False),
        sa.Column("event_name", sa.String(length=100), nullable=False),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("distinct_id", sa.String(length=128), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("idempotency_key", sa.UUID(), nullable=True),
        sa.CheckConstraint(
            "char_length(event_name) > 0", name="ck_events_event_name_not_empty"
        ),
        sa.ForeignKeyConstraint(
            ["application_id"], ["applications.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 3. Create non-partitioned indexes
    op.create_index(
        "idx_events_app_idempotency",
        "events",
        ["application_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )
    op.create_index(
        "idx_events_app_name_time",
        "events",
        ["application_id", "event_name", sa.literal_column("occurred_at DESC")],
        unique=False,
    )
    op.create_index(
        "idx_events_metadata_gin",
        "events",
        ["metadata"],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index(
        op.f("ix_events_application_id"), "events", ["application_id"], unique=False
    )

    # 4. Restore records from partitioned table to old schema
    op.execute(
        "INSERT INTO events (id, application_id, event_name, session_id, distinct_id, metadata, occurred_at, ingested_at, idempotency_key) "
        "SELECT id, application_id, event_name, session_id, distinct_id, metadata, occurred_at, ingested_at, idempotency_key FROM events_partitioned"
    )

    # 5. Drop the partitions
    op.execute("DROP TABLE events_partitioned")
