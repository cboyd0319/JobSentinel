"""LEGACY: Unified database schema for the enhanced job scraper.

⚠️ DEPRECATED - DO NOT USE FOR NEW CODE ⚠️

This module is DEPRECATED and maintained for backward compatibility only.

**Migration Path:**
- Use `src.database.Job` as the authoritative model (with SQLite)
- The Job model now includes: source, remote, salary_min, salary_max, currency
- TrackedJob model provides CRM/Kanban tracking features
- UnifiedJob has 30+ fields but causes schema confusion

**Why deprecated:**
- Multiple competing Job models caused schema mismatches
- SQLite is now the only database (simpler, no installation)
- Extended fields should be in separate related tables (TrackedJob, etc.)

**For new code:**
```python
from src.database import Job  # Use this
from jsa.tracker.models import TrackedJob  # For CRM features
```

DO NOT import UnifiedJob for new features.
"""

import json
from datetime import UTC, datetime
from typing import Any

from cloud.providers.gcp.cloud_database import init_cloud_db
from sqlmodel import Field, Session, SQLModel, create_engine, select
from utils.logging import get_logger

from src.database import Job, get_sync_session, init_db

logger = get_logger("unified_database")


class UnifiedJob(SQLModel, table=True):
    """Unified job model supporting all job board types (backward compatible)."""

    # Core identification fields
    id: int | None = Field(default=None, primary_key=True)
    hash: str = Field(index=True, unique=True)
    title: str
    url: str
    company: str
    location: str
    description: str | None = None

    # Scoring and analysis (existing fields)
    score: float = Field(default=0.0)
    score_reasons: str | None = None  # JSON string of reasons

    # Timestamp tracking (existing fields)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(UTC))
    times_seen: int = Field(default=1)

    # Notification tracking (existing fields)
    included_in_digest: bool = Field(default=False)
    digest_sent_at: datetime | None = None
    immediate_alert_sent: bool = Field(default=False)
    alert_sent_at: datetime | None = None

    # NEW UNIFIED FIELDS (all optional for maximum compatibility)

    # Job board identification and metadata
    # "greenhouse", "microsoft_api", "spacex_api", etc.
    job_board: str | None = None
    external_job_id: str | None = None  # Job ID from source system
    requisition_id: str | None = None  # Requisition/posting ID

    # Job categorization and hierarchy
    # "Engineering", "Sales", "Marketing"
    department: str | None = None
    # More specific team within department
    team: str | None = None
    # "Junior", "Mid-level", "Senior", "Staff", "Principal"
    seniority_level: str | None = None

    # Employment details
    # "Full-time", "Part-time", "Contract", "Intern"
    employment_type: str | None = None
    # "Remote", "Hybrid", "On-site"
    work_arrangement: str | None = None
    # "2-5 years", "5+ years", etc.
    experience_required: str | None = None

    # Compensation information
    # Minimum salary in base currency
    salary_min: int | None = None
    # Maximum salary in base currency
    salary_max: int | None = None
    salary_currency: str | None = None  # "USD", "EUR", "GBP", etc.
    # "yearly", "monthly", "hourly"
    salary_frequency: str | None = None
    # Whether equity/stock options offered
    equity_offered: bool | None = None
    benefits_summary: str | None = None  # JSON string of benefits

    # Technical requirements and skills
    # JSON array of required skills
    required_skills: str | None = None
    # JSON array of preferred skills
    preferred_skills: str | None = None
    # JSON array of technologies mentioned
    technologies: str | None = None
    education_required: str | None = None  # Education requirements
    certifications: str | None = None  # Required certifications

    # Source metadata and tracking
    # When job was originally posted
    posting_date: datetime | None = None
    last_updated_source: datetime | None = None  # Last updated at source
    application_deadline: datetime | None = None
    # Whether it's a featured/sponsored listing
    is_featured: bool | None = None

    # Application process
    application_url: str | None = None  # Direct application link
    requires_cover_letter: bool | None = None
    requires_portfolio: bool | None = None
    # Description of application process
    application_process: str | None = None
    # Hiring manager/recruiter contact
    contact_email: str | None = None

    def to_legacy_job(self):
        """Convert to legacy Job format for backward compatibility."""
        return {
            "id": self.id,
            "hash": self.hash,
            "title": self.title,
            "url": self.url,
            "company": self.company,
            "location": self.location,
            "description": self.description,
            "score": self.score,
            "score_reasons": self.score_reasons,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_seen": self.last_seen,
            "times_seen": self.times_seen,
            "included_in_digest": self.included_in_digest,
            "digest_sent_at": self.digest_sent_at,
            "immediate_alert_sent": self.immediate_alert_sent,
            "alert_sent_at": self.alert_sent_at,
        }

    @classmethod
    def from_scraped_data(cls, job_data: dict, score: float = 0.0):
        """Create UnifiedJob from scraped job data."""
        return cls(
            hash=job_data.get("hash", ""),
            title=job_data.get("title", ""),
            url=job_data.get("url", ""),
            company=job_data.get("company", ""),
            location=job_data.get("location", ""),
            description=job_data.get("description", ""),
            score=score,
            # Enhanced fields
            job_board=job_data.get("job_board"),
            external_job_id=job_data.get("external_job_id"),
            requisition_id=job_data.get("requisition_id"),
            department=job_data.get("department"),
            team=job_data.get("team"),
            seniority_level=job_data.get("seniority_level"),
            employment_type=job_data.get("employment_type"),
            work_arrangement=job_data.get("work_arrangement"),
            experience_required=job_data.get("experience_required"),
            salary_min=job_data.get("salary_min"),
            salary_max=job_data.get("salary_max"),
            salary_currency=job_data.get("salary_currency"),
            salary_frequency=job_data.get("salary_frequency"),
            equity_offered=job_data.get("equity_offered"),
            benefits_summary=job_data.get("benefits_summary"),
            required_skills=job_data.get("required_skills"),
            preferred_skills=job_data.get("preferred_skills"),
            technologies=job_data.get("technologies"),
            education_required=job_data.get("education_required"),
            certifications=job_data.get("certifications"),
            posting_date=job_data.get("posting_date"),
            last_updated_source=job_data.get("last_updated_source"),
            application_deadline=job_data.get("application_deadline"),
            is_featured=job_data.get("is_featured"),
            application_url=job_data.get("application_url"),
            requires_cover_letter=job_data.get("requires_cover_letter"),
            requires_portfolio=job_data.get("requires_portfolio"),
            application_process=job_data.get("application_process"),
            contact_email=job_data.get("contact_email"),
        )


# Database configuration
UNIFIED_DB_FILE = "data/jobs_unified.sqlite"
unified_engine = create_engine(f"sqlite:///{UNIFIED_DB_FILE}", echo=False)


async def init_unified_db():
    """Initializes both local and cloud databases."""
    logger.info("Initializing unified database...")
    await init_db()
    await init_cloud_db()  # This is now async
    logger.info("Unified database initialization complete.")


def save_unified_job(job_data: dict, score: float = 0.0) -> UnifiedJob | None:
    """Save or update a job in the unified database (deduplicates on hash)."""
    try:
        with Session(unified_engine) as session:
            job_hash = job_data.get("hash")
            if not job_hash:
                logger.warning("Job data missing hash, skipping save")
                return None
            existing_job = session.exec(
                select(UnifiedJob).where(UnifiedJob.hash == job_hash)
            ).first()
            if existing_job:
                existing_job.last_seen = datetime.now(UTC)
                existing_job.times_seen += 1
                existing_job.updated_at = datetime.now(UTC)
                for key, value in job_data.items():
                    if hasattr(existing_job, key) and value is not None:
                        setattr(existing_job, key, value)
                session.add(existing_job)
                session.commit()
                session.refresh(existing_job)
                logger.debug("Updated existing job: %s", existing_job.title)
                return existing_job
            new_job = UnifiedJob.from_scraped_data(job_data, score)
            session.add(new_job)
            session.commit()
            session.refresh(new_job)
            logger.debug("Saved new job: %s", new_job.title)
            return new_job
    except Exception as e:  # pragma: no cover
        logger.error("Failed to save job: %s", e)
        return None


def get_jobs_by_board(job_board: str, limit: int = 100) -> list[UnifiedJob]:
    """Return jobs filtered by job board type."""
    try:
        with Session(unified_engine) as session:
            jobs = session.exec(
                select(UnifiedJob).where(UnifiedJob.job_board == job_board).limit(limit)
            ).all()
            return list(jobs)
    except Exception as e:  # pragma: no cover
        logger.error("Failed to get jobs by board: %s", e)
        return []


def get_job_board_stats() -> dict:
    """Return counts of jobs grouped by board."""
    try:
        with Session(unified_engine) as session:
            jobs = session.exec(select(UnifiedJob)).all()
            stats: dict[str, int] = {}
            for job in jobs:
                board = job.job_board or "unknown"
                stats[board] = stats.get(board, 0) + 1
            return stats
    except Exception as e:  # pragma: no cover
        logger.error("Failed to get job board stats: %s", e)
        return {}


def migrate_legacy_jobs() -> int:
    """Migrate jobs from legacy database to unified database; return count migrated."""
    try:
        with get_sync_session() as legacy_session:
            legacy_jobs = legacy_session.exec(select(Job)).all()
        migrated_count = 0
        with Session(unified_engine) as unified_session:
            for legacy_job in legacy_jobs:
                job_data = {
                    "hash": legacy_job.hash,
                    "title": legacy_job.title,
                    "url": legacy_job.url,
                    "company": legacy_job.company,
                    "location": legacy_job.location,
                    "description": legacy_job.description,
                    "job_board": "legacy",
                }
                unified_job = UnifiedJob.from_scraped_data(job_data, legacy_job.score)
                unified_job.created_at = legacy_job.created_at
                unified_job.updated_at = legacy_job.updated_at
                unified_job.last_seen = legacy_job.last_seen
                unified_job.times_seen = legacy_job.times_seen
                unified_job.included_in_digest = legacy_job.included_in_digest
                unified_job.digest_sent_at = legacy_job.digest_sent_at
                unified_job.immediate_alert_sent = legacy_job.immediate_alert_sent
                unified_job.alert_sent_at = legacy_job.alert_sent_at
                unified_job.score_reasons = legacy_job.score_reasons
                unified_session.add(unified_job)
                migrated_count += 1
            unified_session.commit()
        logger.info("Successfully migrated %d jobs from legacy database", migrated_count)
        return migrated_count
    except Exception as e:  # pragma: no cover
        logger.error("Failed to migrate legacy jobs: %s", e)
        return 0


class UserProfile(SQLModel, table=True):
    """User profile for personalized job matching."""

    # Core identification
    id: int | None = Field(default=None, primary_key=True)
    name: str | None = None
    email: str | None = None

    # Current position and experience
    current_title: str | None = None
    experience_years: int | None = None
    # Junior, Mid-level, Senior, Staff, Principal
    seniority_level: str | None = None

    # Location and work preferences
    location: str | None = None
    # Remote, On-site, Hybrid, Any
    work_arrangement_preference: str | None = None
    willing_to_relocate: bool = Field(default=False)

    # Skills and expertise (JSON arrays)
    skills: str | None = None  # JSON array of all skills
    # JSON array of technical skills
    technical_skills: str | None = None
    # JSON array of marketing skills
    marketing_skills: str | None = None
    # JSON array of skills they want to use more
    preferred_skills: str | None = None

    # Career goals and compensation
    # lateral, promotion, leadership, open
    career_goal: str | None = None
    target_seniority: str | None = None  # Desired seniority level
    salary_min: int | None = None  # Minimum desired salary
    salary_max: int | None = None  # Maximum desired salary
    salary_currency: str = Field(default="USD")  # Currency preference

    # Job preferences
    preferred_departments: str | None = None  # JSON array of departments
    # JSON array of company names
    preferred_companies: str | None = None
    # JSON array of companies to avoid
    excluded_companies: str | None = None
    custom_job_boards: str | None = None  # JSON array of custom URLs

    # Notification preferences
    # Minimum match % for notifications
    notification_threshold: int = Field(default=75)
    notification_frequency: str = Field(default="daily")  # realtime, daily, weekly
    email_notifications: bool = Field(default=True)
    slack_notifications: bool = Field(default=False)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_active: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def set_skills(self, skills_list: list[str]):
        """Set skills from a list."""
        self.skills = json.dumps(skills_list) if skills_list else None

    def get_skills(self) -> list[str]:
        """Get skills as a list."""
        return json.loads(self.skills) if self.skills else []

    def set_technical_skills(self, skills_list: list[str]):
        """Set technical skills from a list."""
        self.technical_skills = json.dumps(skills_list) if skills_list else None

    def get_technical_skills(self) -> list[str]:
        """Get technical skills as a list."""
        return json.loads(self.technical_skills) if self.technical_skills else []

    def set_marketing_skills(self, skills_list: list[str]):
        """Set marketing skills from a list."""
        self.marketing_skills = json.dumps(skills_list) if skills_list else None

    def get_marketing_skills(self) -> list[str]:
        """Get marketing skills as a list."""
        return json.loads(self.marketing_skills) if self.marketing_skills else []

    def set_preferred_departments(self, departments: list[str]):
        """Set preferred departments from a list."""
        self.preferred_departments = json.dumps(departments) if departments else None

    def get_preferred_departments(self) -> list[str]:
        """Get preferred departments as a list."""
        return json.loads(self.preferred_departments) if self.preferred_departments else []

    def set_custom_job_boards(self, urls: list[str]):
        """Set custom job board URLs from a list."""
        self.custom_job_boards = json.dumps(urls) if urls else None

    def get_custom_job_boards(self) -> list[str]:
        """Get custom job board URLs as a list."""
        return json.loads(self.custom_job_boards) if self.custom_job_boards else []

    def update_activity(self):
        """Update last activity timestamp."""
        self.last_active = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)


def save_user_profile(profile_data: dict[str, Any]) -> UserProfile | None:
    """Create or update a single user profile (one profile assumption)."""
    try:
        with Session(unified_engine) as session:
            existing_profile = session.exec(select(UserProfile)).first()
            if existing_profile:
                for key, value in profile_data.items():
                    if hasattr(existing_profile, key) and value is not None:
                        setattr(existing_profile, key, value)
                existing_profile.update_activity()
                session.add(existing_profile)
                session.commit()
                session.refresh(existing_profile)
                logger.info("Updated user profile")
                return existing_profile
            profile = UserProfile(**profile_data)
            session.add(profile)
            session.commit()
            session.refresh(profile)
            logger.info("Created new user profile")
            return profile
    except Exception as e:  # pragma: no cover
        logger.error("Failed to save user profile: %s", e)
        return None


def get_user_profile() -> UserProfile | None:
    """Return the single user profile if it exists."""
    try:
        with Session(unified_engine) as session:
            profile = session.exec(select(UserProfile)).first()
            return profile
    except Exception as e:  # pragma: no cover
        logger.error("Failed to get user profile: %s", e)
        return None


def calculate_job_match_score(job: UnifiedJob, user_profile: UserProfile) -> float:
    """Calculate match score (0-100) between a job and user profile."""
    try:
        score = 0.0
        max_score = 100.0
        user_skills = user_profile.get_skills()
        if user_skills and job.required_skills:
            job_skills = json.loads(job.required_skills) if job.required_skills else []
            skill_matches = 0
            for job_skill in job_skills:
                for user_skill in user_skills:
                    if (
                        job_skill.lower() in user_skill.lower()
                        or user_skill.lower() in job_skill.lower()
                    ):
                        skill_matches += 1
                        break
            if job_skills:
                score += (skill_matches / len(job_skills)) * 40
        if user_profile.seniority_level and job.seniority_level:
            seniority_levels = ["Junior", "Mid-level", "Senior", "Staff", "Principal"]
            user_level_idx = (
                seniority_levels.index(user_profile.seniority_level)
                if user_profile.seniority_level in seniority_levels
                else 2
            )
            job_level_idx = (
                seniority_levels.index(job.seniority_level)
                if job.seniority_level in seniority_levels
                else 2
            )
            if user_level_idx == job_level_idx or job_level_idx == user_level_idx + 1:
                score += 20
            elif abs(user_level_idx - job_level_idx) <= 1:
                score += 15
            elif abs(user_level_idx - job_level_idx) <= 2:
                score += 10
        location_match = False
        if user_profile.work_arrangement_preference == "Any":
            location_match = True
        elif user_profile.work_arrangement_preference == "Remote" and job.work_arrangement in [
            "Remote",
            "Hybrid",
        ]:
            location_match = True
        elif user_profile.work_arrangement_preference == "Hybrid" and job.work_arrangement in [
            "Remote",
            "Hybrid",
            "On-site",
        ]:
            location_match = True
        elif (
            user_profile.location
            and job.location
            and user_profile.location.lower() in job.location.lower()
        ):
            location_match = True
        if location_match:
            score += 15
        if user_profile.salary_min and job.salary_min:
            if job.salary_min >= user_profile.salary_min:
                score += 15
            elif job.salary_max and job.salary_max >= user_profile.salary_min:
                score += 10
        preferred_departments = user_profile.get_preferred_departments()
        if preferred_departments and job.department:
            for dept in preferred_departments:
                if dept.lower() in job.department.lower():
                    score += 10
                    break
        return min(score, max_score)
    except Exception as e:  # pragma: no cover
        logger.error("Failed to calculate match score: %s", e)
        return 0.0


def get_personalized_job_matches(limit: int = 50, min_score: float = 60.0) -> list[dict[str, Any]]:
    """Return jobs matching profile with score >= min_score (sorted)."""
    try:
        user_profile = get_user_profile()
        if not user_profile:
            logger.warning("No user profile found for personalized matching")
            return []
        with Session(unified_engine) as session:
            jobs = session.exec(select(UnifiedJob).limit(limit * 2)).all()
        job_matches: list[dict[str, Any]] = []
        for job in jobs:
            match_score = calculate_job_match_score(job, user_profile)
            if match_score >= min_score:
                job_matches.append(
                    {
                        "job": job,
                        "match_score": match_score,
                        "match_reasons": _get_match_reasons(job, user_profile, match_score),
                    }
                )
        job_matches.sort(key=lambda x: x["match_score"], reverse=True)
        return job_matches[:limit]
    except Exception as e:  # pragma: no cover
        logger.error("Failed to get personalized job matches: %s", e)
        return []


def _get_match_reasons(job: UnifiedJob, user_profile: UserProfile, score: float) -> list[str]:
    """Generate reasons contributing to a job match score."""
    reasons: list[str] = []
    user_skills = user_profile.get_skills()
    if user_skills and job.required_skills:
        job_skills = json.loads(job.required_skills) if job.required_skills else []
        matching_skills: list[str] = []
        for job_skill in job_skills:
            for user_skill in user_skills:
                if (
                    job_skill.lower() in user_skill.lower()
                    or user_skill.lower() in job_skill.lower()
                ):
                    matching_skills.append(job_skill)
                    break
        if matching_skills:
            reasons.append(f"Skills match: {', '.join(matching_skills[:3])}")
    if user_profile.seniority_level == job.seniority_level:
        reasons.append(f"Perfect seniority match: {job.seniority_level}")
    if job.work_arrangement == "Remote" and user_profile.work_arrangement_preference in [
        "Remote",
        "Any",
    ]:
        reasons.append("Remote work available")
    if user_profile.salary_min and job.salary_min and job.salary_min >= user_profile.salary_min:
        reasons.append(f"Salary meets expectations (${job.salary_min:,}+)")
    if score >= 90:
        reasons.insert(0, "Excellent match!")
    elif score >= 75:
        reasons.insert(0, "[OK] Strong match")
    return reasons
