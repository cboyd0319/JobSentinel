import os
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import Field, Session, SQLModel, create_engine, select
from sqlmodel.ext.asyncio.session import AsyncSession
from utils.errors import DatabaseException
from utils.logging import get_logger


class Job(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    hash: str = Field(index=True, unique=True)
    title: str
    url: str
    company: str
    location: str
    description: str | None = None
    score: float
    score_reasons: str | None = None  # JSON string of reasons

    # Job metadata
    source: str = Field(default="unknown", max_length=50, index=True)
    remote: bool = Field(default=False, index=True)
    
    # Salary information
    salary_min: int | None = Field(default=None)
    salary_max: int | None = Field(default=None)
    currency: str = Field(default="USD", max_length=3)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Tracking fields
    last_seen: datetime = Field(default_factory=lambda: datetime.now(UTC))
    times_seen: int = Field(default=1)

    # Digest tracking
    included_in_digest: bool = Field(default=False)
    digest_sent_at: datetime | None = None

    # Notification tracking
    immediate_alert_sent: bool = Field(default=False)
    alert_sent_at: datetime | None = None


# PostgreSQL-first architecture for cross-platform/cross-cloud deployments
# Default to local PostgreSQL (single-user setup)
# PostgreSQL has installers for macOS, Linux, and Windows
DATABASE_URL = os.getenv(
    "DATABASE_URL", "sqlite+aiosqlite:///data/jobs.sqlite"
)


def _derive_sync_url(db_url: str) -> str:
    """Convert an async SQLAlchemy URL into a sync-compatible variant."""
    replacements = {
        "sqlite+aiosqlite": "sqlite",
        "postgresql+asyncpg": "postgresql",
        "mysql+aiomysql": "mysql+pymysql",
    }
    for async_driver, sync_driver in replacements.items():
        if db_url.startswith(async_driver):
            return db_url.replace(async_driver, sync_driver, 1)
    return db_url


ASYNC_DATABASE_URL = DATABASE_URL
SYNC_DATABASE_URL = _derive_sync_url(DATABASE_URL)

# PostgreSQL connection pooling configuration (optimized for local single-user)
from sqlalchemy.pool import QueuePool, AsyncAdaptedQueuePool

pool_size = int(os.getenv("DB_POOL_SIZE", "10"))  # Smaller pool for single-user
max_overflow = int(os.getenv("DB_POOL_MAX_OVERFLOW", "5"))
pool_pre_ping = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    poolclass=AsyncAdaptedQueuePool,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_pre_ping=pool_pre_ping,
)

sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    poolclass=QueuePool,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_pre_ping=pool_pre_ping,
)
logger = get_logger("database")


async def init_db():
    """Creates the database and tables if they don't exist."""
    try:
        # Import all models to ensure they're registered with SQLModel metadata
        from jsa.tracker.models import Activity, Contact, Document, TrackedJob  # noqa: F401
        from jsa.web.blueprints.api.auth import APIKey  # noqa: F401

        async with async_engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        SQLModel.metadata.create_all(sync_engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise DatabaseException("initialization", str(e), e) from e


def get_sync_session() -> Session:
    """Create a synchronous SQLModel session (use with context manager)."""
    return Session(sync_engine)


async def get_job_by_hash(job_hash: str) -> Job | None:
    """Checks if a job with the given hash already exists."""
    try:
        async with AsyncSession(async_engine) as session:
            statement = select(Job).where(Job.hash == job_hash)
            result = await session.exec(statement)
            return result.first()
    except Exception as e:
        logger.error(f"Failed to get job by hash {job_hash}: {e}")
        raise DatabaseException("get_job_by_hash", str(e), e) from e


async def add_job(job_data: dict) -> Job:
    """Adds a new job to the database or updates if it exists."""
    try:
        async with AsyncSession(async_engine) as session:
            # Check if job already exists
            result = await session.exec(select(Job).where(Job.hash == job_data["hash"]))
            existing_job = result.first()

            if existing_job:
                # Update existing job
                existing_job.last_seen = datetime.now(UTC)
                existing_job.times_seen += 1
                existing_job.score = job_data.get("score", existing_job.score)
                existing_job.score_reasons = str(job_data.get("score_reasons", []))
                existing_job.updated_at = datetime.now(UTC)
                session.add(existing_job)
                await session.commit()
                await session.refresh(existing_job)
                logger.debug(f"Updated existing job: {existing_job.title}")
                return existing_job
            else:
                # Create new job
                job = Job(
                    hash=job_data["hash"],
                    title=job_data["title"],
                    url=job_data["url"],
                    company=job_data["company"],
                    location=job_data.get("location", "N/A"),
                    description=job_data.get("description"),
                    score=job_data["score"],
                    score_reasons=str(job_data.get("score_reasons", [])),
                )
                session.add(job)
                await session.commit()
                await session.refresh(job)
                logger.debug(f"Added new job: {job.title}")
                return job
    except Exception as e:
        logger.error(f"Failed to add/update job {job_data.get('title', 'Unknown')}: {e}")
        raise DatabaseException("add_job", str(e), e) from e


async def get_jobs_for_digest(min_score: float = 0.0, hours_back: int = 24) -> list[Job]:
    """Get jobs that should be included in digest, with a minimum score."""
    try:
        async with AsyncSession(async_engine) as session:
            from datetime import timedelta

            cutoff_time = datetime.now(UTC) - timedelta(hours=hours_back)

            statement = (
                select(Job)
                .where(
                    Job.created_at >= cutoff_time,
                    Job.included_in_digest.is_(False),
                    Job.score >= min_score,
                )
                .order_by(Job.score.desc(), Job.created_at.desc())
            )

            result = await session.exec(statement)
            return list(result.all())
    except Exception as e:
        logger.error(f"Failed to get jobs for digest: {e}")
        raise DatabaseException("get_jobs_for_digest", str(e), e) from e


async def mark_jobs_digest_sent(job_ids: list[int]):
    """Mark jobs as included in digest."""
    try:
        async with AsyncSession(async_engine) as session:
            statement = select(Job).where(Job.id.in_(job_ids))
            result = await session.exec(statement)
            jobs = result.all()

            for job in jobs:
                job.included_in_digest = True
                job.digest_sent_at = datetime.now(UTC)
                session.add(job)

            await session.commit()
            logger.info(f"Marked {len(job_ids)} jobs as digest sent")
    except Exception as e:
        logger.error(f"Failed to mark jobs as digest sent: {e}")
        raise DatabaseException("mark_jobs_digest_sent", str(e), e) from e


async def mark_job_alert_sent(job_id: int):
    """Mark a job as having sent an immediate alert."""
    try:
        async with AsyncSession(async_engine) as session:
            job = await session.get(Job, job_id)
            if job:
                job.immediate_alert_sent = True
                job.alert_sent_at = datetime.now(UTC)
                session.add(job)
                await session.commit()
    except Exception as e:
        logger.error(f"Failed to mark job {job_id} alert sent: {e}")
        raise DatabaseException("mark_job_alert_sent", str(e), e) from e


async def mark_jobs_alert_sent_batch(job_ids: list[int]):
    """Mark multiple jobs as having sent immediate alerts in a single transaction."""
    if not job_ids:
        return

    try:
        async with AsyncSession(async_engine) as session:
            # Bulk update using SQLAlchemy update statement
            from sqlalchemy import update

            stmt = (
                update(Job)
                .where(Job.id.in_(job_ids))
                .values(immediate_alert_sent=True, alert_sent_at=datetime.now(UTC))
            )
            await session.execute(stmt)
            await session.commit()
            logger.debug(f"Batch marked {len(job_ids)} jobs as alert sent")
    except Exception as e:
        logger.error(f"Failed to batch mark jobs alert sent: {e}")
        raise DatabaseException("mark_jobs_alert_sent_batch", str(e), e) from e


async def get_database_stats() -> dict:
    """Get database statistics for monitoring."""
    try:
        async with AsyncSession(async_engine) as session:
            from sqlalchemy import func

            total_jobs = (await session.exec(select(func.count(Job.id)))).one()

            # Jobs added in last 24 hours
            yesterday = datetime.now(UTC) - timedelta(hours=24)
            recent_jobs = (
                await session.exec(select(func.count(Job.id)).where(Job.created_at >= yesterday))
            ).one()

            # High score jobs (>= 0.8)
            high_score_jobs = (
                await session.exec(select(func.count(Job.id)).where(Job.score >= 0.8))
            ).one()

            return {
                "total_jobs": total_jobs,
                "recent_jobs_24h": recent_jobs,
                "high_score_jobs": high_score_jobs,
                "last_updated": datetime.now(UTC).isoformat(),
            }
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        raise DatabaseException("get_database_stats", str(e), e) from e


def get_database_stats_sync() -> dict:
    """Get database statistics using the synchronous engine (Flask/UI)."""
    try:
        with Session(sync_engine) as session:
            from sqlalchemy import func

            total_jobs = session.exec(select(func.count(Job.id))).one()

            yesterday = datetime.now(UTC) - timedelta(hours=24)
            recent_jobs = session.exec(
                select(func.count(Job.id)).where(Job.created_at >= yesterday)
            ).one()

            high_score_jobs = session.exec(select(func.count(Job.id)).where(Job.score >= 0.8)).one()

            return {
                "total_jobs": total_jobs,
                "recent_jobs_24h": recent_jobs,
                "high_score_jobs": high_score_jobs,
                "last_updated": datetime.now(UTC).isoformat(),
            }
    except Exception as exc:
        logger.error(f"Failed to get database stats (sync): {exc}")
        raise DatabaseException("get_database_stats_sync", str(exc), exc) from exc


async def cleanup_old_jobs(days_to_keep: int = 90):
    """Remove jobs older than specified days to manage database size."""
    try:
        cutoff_date = datetime.now(UTC) - timedelta(days=days_to_keep)

        async with AsyncSession(async_engine) as session:
            stmt = delete(Job).where(Job.created_at < cutoff_date)
            result = await session.exec(stmt)
            await session.commit()

            removed = result.rowcount or 0
            logger.info(f"Cleaned up {removed} jobs older than {days_to_keep} days")
            return removed
    except Exception as e:
        logger.error(f"Failed to cleanup old jobs: {e}")
        raise DatabaseException("cleanup_old_jobs", str(e), e) from e
