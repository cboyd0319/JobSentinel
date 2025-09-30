"""
Unified database schema for the enhanced job scraper.
Supports data from all job board types (Greenhouse, Microsoft, SpaceX, etc.)
"""

from sqlmodel import Field, Session, SQLModel, create_engine, select
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import json
from utils.logging import get_logger
from utils.errors import DatabaseException

logger = get_logger("unified_database")


class UnifiedJob(SQLModel, table=True):
    """
    Unified job model supporting all job board types.
    Backward compatible with existing Job model.
    """

    # Core identification fields
    id: Optional[int] = Field(default=None, primary_key=True)
    hash: str = Field(index=True, unique=True)
    title: str
    url: str
    company: str
    location: str
    description: Optional[str] = None

    # Scoring and analysis (existing fields)
    score: float = Field(default=0.0)
    score_reasons: Optional[str] = None  # JSON string of reasons

    # Timestamp tracking (existing fields)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    times_seen: int = Field(default=1)

    # Notification tracking (existing fields)
    included_in_digest: bool = Field(default=False)
    digest_sent_at: Optional[datetime] = None
    immediate_alert_sent: bool = Field(default=False)
    alert_sent_at: Optional[datetime] = None

    # NEW UNIFIED FIELDS (all optional for maximum compatibility)

    # Job board identification and metadata
    # "greenhouse", "microsoft_api", "spacex_api", etc.
    job_board: Optional[str] = None
    external_job_id: Optional[str] = None  # Job ID from source system
    requisition_id: Optional[str] = None  # Requisition/posting ID

    # Job categorization and hierarchy
    # "Engineering", "Sales", "Marketing"
    department: Optional[str] = None
    # More specific team within department
    team: Optional[str] = None
    # "Junior", "Mid-level", "Senior", "Staff", "Principal"
    seniority_level: Optional[str] = None

    # Employment details
    # "Full-time", "Part-time", "Contract", "Intern"
    employment_type: Optional[str] = None
    # "Remote", "Hybrid", "On-site"
    work_arrangement: Optional[str] = None
    # "2-5 years", "5+ years", etc.
    experience_required: Optional[str] = None

    # Compensation information
    # Minimum salary in base currency
    salary_min: Optional[int] = None
    # Maximum salary in base currency
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None  # "USD", "EUR", "GBP", etc.
    # "yearly", "monthly", "hourly"
    salary_frequency: Optional[str] = None
    # Whether equity/stock options offered
    equity_offered: Optional[bool] = None
    benefits_summary: Optional[str] = None  # JSON string of benefits

    # Technical requirements and skills
    # JSON array of required skills
    required_skills: Optional[str] = None
    # JSON array of preferred skills
    preferred_skills: Optional[str] = None
    # JSON array of technologies mentioned
    technologies: Optional[str] = None
    education_required: Optional[str] = None  # Education requirements
    certifications: Optional[str] = None  # Required certifications

    # Source metadata and tracking
    # When job was originally posted
    posting_date: Optional[datetime] = None
    last_updated_source: Optional[datetime] = None  # Last updated at source
    application_deadline: Optional[datetime] = None
    # Whether it's a featured/sponsored listing
    is_featured: Optional[bool] = None

    # Application process
    application_url: Optional[str] = None  # Direct application link
    requires_cover_letter: Optional[bool] = None
    requires_portfolio: Optional[bool] = None
    # Description of application process
    application_process: Optional[str] = None
    # Hiring manager/recruiter contact
    contact_email: Optional[str] = None

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


from src.database import init_db
from cloud.providers.gcp.cloud_database import init_cloud_db
from utils.logging import get_logger

logger = get_logger("unified_database")


async def init_unified_db():
    """Initializes both local and cloud databases."""
    logger.info("Initializing unified database...")
    await init_db()
    await init_cloud_db()  # This is now async
    logger.info("Unified database initialization complete.")


def save_unified_job(job_data: dict, score: float = 0.0) -> Optional[UnifiedJob]:
    """
    Save a job to the unified database.
    Handles deduplication and updates existing jobs.
    """
    try:
        with Session(unified_engine) as session:
            job_hash = job_data.get("hash")
            if not job_hash:
                logger.warning("Job data missing hash, skipping save")
                return None

            # Check if job already exists
            existing_job = session.exec(select(UnifiedJob).where(UnifiedJob.hash == job_hash)).first()

            if existing_job:
                # Update existing job
                existing_job.last_seen = datetime.now(timezone.utc)
                existing_job.times_seen += 1
                existing_job.updated_at = datetime.now(timezone.utc)

                # Update other fields if they have new data
                for key, value in job_data.items():
                    if hasattr(existing_job, key) and value is not None:
                        setattr(existing_job, key, value)

                session.add(existing_job)
                session.commit()
                session.refresh(existing_job)
                logger.debug(f"Updated existing job: {existing_job.title}")
                return existing_job

            else:
                # Create new job
                new_job = UnifiedJob.from_scraped_data(job_data, score)
                session.add(new_job)
                session.commit()
                session.refresh(new_job)
                logger.debug(f"Saved new job: {new_job.title}")
                return new_job

    except Exception as e:
        logger.error(f"Failed to save job: {e}")
        return None


def get_jobs_by_board(job_board: str, limit: int = 100) -> list[UnifiedJob]:
    """Get jobs by job board type."""
    try:
        with Session(unified_engine) as session:
            jobs = session.exec(select(UnifiedJob).where(UnifiedJob.job_board == job_board).limit(limit)).all()
            return list(jobs)
    except Exception as e:
        logger.error(f"Failed to get jobs by board: {e}")
        return []


def get_job_board_stats() -> dict:
    """Get statistics about job boards in the database."""
    try:
        with Session(unified_engine) as session:
            # Count jobs by board type
            jobs = session.exec(select(UnifiedJob)).all()

            stats = {}
            for job in jobs:
                board = job.job_board or "unknown"
                if board not in stats:
                    stats[board] = 0
                stats[board] += 1

            return stats
    except Exception as e:
        logger.error(f"Failed to get job board stats: {e}")
        return {}


def migrate_legacy_jobs():
    """
    Migrate jobs from legacy database to unified database.
    This would be run once during upgrade.
    """
    try:
        # Import legacy database
        from src.database import Job, engine as legacy_engine

        with Session(legacy_engine) as legacy_session:
            legacy_jobs = legacy_session.exec(select(Job)).all()

        migrated_count = 0
        with Session(unified_engine) as unified_session:
            for legacy_job in legacy_jobs:
                # Convert legacy job to unified format
                job_data = {
                    "hash": legacy_job.hash,
                    "title": legacy_job.title,
                    "url": legacy_job.url,
                    "company": legacy_job.company,
                    "location": legacy_job.location,
                    "description": legacy_job.description,
                    "job_board": "legacy",  # Mark as migrated from legacy
                }

                unified_job = UnifiedJob.from_scraped_data(job_data, legacy_job.score)

                # Copy timestamps and tracking data
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

        logger.info(f"Successfully migrated {migrated_count} jobs from legacy database")
        return migrated_count

    except Exception as e:
        logger.error(f"Failed to migrate legacy jobs: {e}")
        return 0


class UserProfile(SQLModel, table=True):
    """
    User profile for personalized job matching.
    Stores user preferences, skills, and career goals.
    """

    # Core identification
    id: Optional[int] = Field(default=None, primary_key=True)
    name: Optional[str] = None
    email: Optional[str] = None

    # Current position and experience
    current_title: Optional[str] = None
    experience_years: Optional[int] = None
    # Junior, Mid-level, Senior, Staff, Principal
    seniority_level: Optional[str] = None

    # Location and work preferences
    location: Optional[str] = None
    # Remote, On-site, Hybrid, Any
    work_arrangement_preference: Optional[str] = None
    willing_to_relocate: bool = Field(default=False)

    # Skills and expertise (JSON arrays)
    skills: Optional[str] = None  # JSON array of all skills
    # JSON array of technical skills
    technical_skills: Optional[str] = None
    # JSON array of marketing skills
    marketing_skills: Optional[str] = None
    # JSON array of skills they want to use more
    preferred_skills: Optional[str] = None

    # Career goals and compensation
    # lateral, promotion, leadership, open
    career_goal: Optional[str] = None
    target_seniority: Optional[str] = None  # Desired seniority level
    salary_min: Optional[int] = None  # Minimum desired salary
    salary_max: Optional[int] = None  # Maximum desired salary
    salary_currency: str = Field(default="USD")  # Currency preference

    # Job preferences
    preferred_departments: Optional[str] = None  # JSON array of departments
    # JSON array of company names
    preferred_companies: Optional[str] = None
    # JSON array of companies to avoid
    excluded_companies: Optional[str] = None
    custom_job_boards: Optional[str] = None  # JSON array of custom URLs

    # Notification preferences
    # Minimum match % for notifications
    notification_threshold: int = Field(default=75)
    notification_frequency: str = Field(default="daily")  # realtime, daily, weekly
    email_notifications: bool = Field(default=True)
    slack_notifications: bool = Field(default=False)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def set_skills(self, skills_list: List[str]):
        """Set skills from a list."""
        self.skills = json.dumps(skills_list) if skills_list else None

    def get_skills(self) -> List[str]:
        """Get skills as a list."""
        return json.loads(self.skills) if self.skills else []

    def set_technical_skills(self, skills_list: List[str]):
        """Set technical skills from a list."""
        self.technical_skills = json.dumps(skills_list) if skills_list else None

    def get_technical_skills(self) -> List[str]:
        """Get technical skills as a list."""
        return json.loads(self.technical_skills) if self.technical_skills else []

    def set_marketing_skills(self, skills_list: List[str]):
        """Set marketing skills from a list."""
        self.marketing_skills = json.dumps(skills_list) if skills_list else None

    def get_marketing_skills(self) -> List[str]:
        """Get marketing skills as a list."""
        return json.loads(self.marketing_skills) if self.marketing_skills else []

    def set_preferred_departments(self, departments: List[str]):
        """Set preferred departments from a list."""
        self.preferred_departments = json.dumps(departments) if departments else None

    def get_preferred_departments(self) -> List[str]:
        """Get preferred departments as a list."""
        return json.loads(self.preferred_departments) if self.preferred_departments else []

    def set_custom_job_boards(self, urls: List[str]):
        """Set custom job board URLs from a list."""
        self.custom_job_boards = json.dumps(urls) if urls else None

    def get_custom_job_boards(self) -> List[str]:
        """Get custom job board URLs as a list."""
        return json.loads(self.custom_job_boards) if self.custom_job_boards else []

    def update_activity(self):
        """Update last activity timestamp."""
        self.last_active = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)


def save_user_profile(profile_data: Dict[str, Any]) -> Optional[UserProfile]:
    """
    Save or update user profile.

    Args:
        profile_data: Dictionary containing user profile information

    Returns:
        UserProfile object if successful, None otherwise
    """
    try:
        with Session(unified_engine) as session:
            # Check if profile already exists (assuming one profile per
            # installation)
            existing_profile = session.exec(select(UserProfile)).first()

            if existing_profile:
                # Update existing profile
                for key, value in profile_data.items():
                    if hasattr(existing_profile, key) and value is not None:
                        setattr(existing_profile, key, value)

                existing_profile.update_activity()
                session.add(existing_profile)
                session.commit()
                session.refresh(existing_profile)

                logger.info("Updated user profile")
                return existing_profile
            else:
                # Create new profile
                profile = UserProfile(**profile_data)
                session.add(profile)
                session.commit()
                session.refresh(profile)

                logger.info("Created new user profile")
                return profile

    except Exception as e:
        logger.error(f"Failed to save user profile: {e}")
        return None


def get_user_profile() -> Optional[UserProfile]:
    """Get the current user profile."""
    try:
        with Session(unified_engine) as session:
            profile = session.exec(select(UserProfile)).first()
            return profile
    except Exception as e:
        logger.error(f"Failed to get user profile: {e}")
        return None


def calculate_job_match_score(job: UnifiedJob, user_profile: UserProfile) -> float:
    """
    Calculate how well a job matches the user's profile.

    Args:
        job: Job to evaluate
        user_profile: User's profile and preferences

    Returns:
        Match score as percentage (0-100)
    """
    try:
        score = 0.0
        max_score = 100.0

        # Skills matching (40% of total score)
        user_skills = user_profile.get_skills()
        if user_skills and job.required_skills:
            job_skills = json.loads(job.required_skills) if job.required_skills else []

            skill_matches = 0
            for job_skill in job_skills:
                for user_skill in user_skills:
                    if job_skill.lower() in user_skill.lower() or user_skill.lower() in job_skill.lower():
                        skill_matches += 1
                        break

            if job_skills:
                skills_score = (skill_matches / len(job_skills)) * 40
                score += skills_score

        # Seniority matching (20% of total score)
        if user_profile.seniority_level and job.seniority_level:
            seniority_levels = ["Junior", "Mid-level", "Senior", "Staff", "Principal"]
            user_level_idx = (
                seniority_levels.index(user_profile.seniority_level)
                if user_profile.seniority_level in seniority_levels
                else 2
            )
            job_level_idx = (
                seniority_levels.index(job.seniority_level) if job.seniority_level in seniority_levels else 2
            )

            # Perfect match or one level up is ideal
            if user_level_idx == job_level_idx or job_level_idx == user_level_idx + 1:
                score += 20
            elif abs(user_level_idx - job_level_idx) <= 1:
                score += 15  # Close match
            elif abs(user_level_idx - job_level_idx) <= 2:
                score += 10  # Reasonable match

        # Location/remote matching (15% of total score)
        location_match = False
        if user_profile.work_arrangement_preference == "Any":
            location_match = True
        elif user_profile.work_arrangement_preference == "Remote" and job.work_arrangement in ["Remote", "Hybrid"]:
            location_match = True
        elif user_profile.work_arrangement_preference == "Hybrid" and job.work_arrangement in [
            "Remote",
            "Hybrid",
            "On-site",
        ]:
            location_match = True
        elif user_profile.location and job.location and user_profile.location.lower() in job.location.lower():
            location_match = True

        if location_match:
            score += 15

        # Salary matching (15% of total score)
        if user_profile.salary_min and job.salary_min:
            if job.salary_min >= user_profile.salary_min:
                score += 15
            elif job.salary_max and job.salary_max >= user_profile.salary_min:
                score += 10  # Partial match if max meets minimum

        # Department matching (10% of total score)
        preferred_departments = user_profile.get_preferred_departments()
        if preferred_departments and job.department:
            for dept in preferred_departments:
                if dept.lower() in job.department.lower():
                    score += 10
                    break

        return min(score, max_score)  # Cap at 100%

    except Exception as e:
        logger.error(f"Failed to calculate match score: {e}")
        return 0.0


def get_personalized_job_matches(limit: int = 50, min_score: float = 60.0) -> List[Dict[str, Any]]:
    """
    Get jobs that match the user's profile above the minimum score.

    Args:
        limit: Maximum number of jobs to return
        min_score: Minimum match score to include

    Returns:
        List of jobs with match scores
    """
    try:
        user_profile = get_user_profile()
        if not user_profile:
            logger.warning("No user profile found for personalized matching")
            return []

        with Session(unified_engine) as session:
            jobs = session.exec(select(UnifiedJob).limit(limit * 2)).all()  # Get more to filter

            job_matches = []
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

            # Sort by match score and limit results
            job_matches.sort(key=lambda x: x["match_score"], reverse=True)
            return job_matches[:limit]

    except Exception as e:
        logger.error(f"Failed to get personalized job matches: {e}")
        return []


def _get_match_reasons(job: UnifiedJob, user_profile: UserProfile, score: float) -> List[str]:
    """Generate human-readable reasons for job match."""
    reasons = []

    # Skills match
    user_skills = user_profile.get_skills()
    if user_skills and job.required_skills:
        job_skills = json.loads(job.required_skills) if job.required_skills else []
        matching_skills = []
        for job_skill in job_skills:
            for user_skill in user_skills:
                if job_skill.lower() in user_skill.lower() or user_skill.lower() in job_skill.lower():
                    matching_skills.append(job_skill)
                    break

        if matching_skills:
            reasons.append(f"Skills match: {', '.join(matching_skills[:3])}")

    # Seniority match
    if user_profile.seniority_level == job.seniority_level:
        reasons.append(f"Perfect seniority match: {job.seniority_level}")

    # Location match
    if job.work_arrangement == "Remote" and user_profile.work_arrangement_preference in ["Remote", "Any"]:
        reasons.append("Remote work available")

    # Salary match
    if user_profile.salary_min and job.salary_min and job.salary_min >= user_profile.salary_min:
        reasons.append(f"Salary meets expectations (${job.salary_min:,}+)")

    if score >= 90:
        reasons.insert(0, "🎯 Excellent match!")
    elif score >= 75:
        reasons.insert(0, "✅ Strong match")

    return reasons
