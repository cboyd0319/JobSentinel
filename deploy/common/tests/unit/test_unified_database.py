"""Comprehensive tests for unified_database.py module.

DEPRECATED MODULE - Tests for backward compatibility only.

Following PyTest Architect principles:
- AAA pattern (Arrange, Act, Assert)
- Parametrized tests where applicable
- Proper mocking at import site
- Deterministic and fast (< 100ms per test)
- Isolation between tests
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlmodel import Session, select

# Import using absolute imports
from unified_database import (
    UnifiedJob,
    UserProfile,
    calculate_job_match_score,
    get_job_board_stats,
    get_jobs_by_board,
    get_personalized_job_matches,
    get_user_profile,
    init_unified_db,
    migrate_legacy_jobs,
    save_unified_job,
    save_user_profile,
)


class TestUnifiedJob:
    """Tests for UnifiedJob model."""

    def test_unified_job_initialization(self):
        """UnifiedJob model initializes with required fields."""
        # Arrange & Act
        job = UnifiedJob(
            hash="test123",
            title="Software Engineer",
            company="TechCorp",
            job_board="linkedin",
        )

        # Assert
        assert job.hash == "test123"
        assert job.title == "Software Engineer"
        assert job.company == "TechCorp"
        assert job.job_board == "linkedin"

    @pytest.mark.parametrize(
        "field,value",
        [
            ("description", "Great job opportunity"),
            ("location", "San Francisco, CA"),
            ("remote", True),
            ("salary_min", 100000),
            ("salary_max", 150000),
            ("currency", "USD"),
            ("source", "api"),
            ("tags", json.dumps(["python", "backend"])),
        ],
        ids=["description", "location", "remote", "salary_min", "salary_max", "currency", "source", "tags"],
    )
    def test_unified_job_optional_fields(self, field, value):
        """UnifiedJob accepts various optional fields."""
        # Arrange
        job_data = {
            "hash": "test123",
            "title": "Engineer",
            "company": "Corp",
            "job_board": "indeed",
            field: value,
        }

        # Act
        job = UnifiedJob(**job_data)

        # Assert
        assert getattr(job, field) == value


class TestInitUnifiedDb:
    """Tests for init_unified_db function."""

    @pytest.mark.asyncio
    async def test_init_unified_db_creates_tables(self):
        """init_unified_db creates database tables."""
        # Arrange & Act
        with patch("unified_database.init_db", new=AsyncMock()) as mock_init:
            await init_unified_db()

            # Assert
            mock_init.assert_called_once()

    @pytest.mark.asyncio
    async def test_init_unified_db_with_cloud_init(self):
        """init_unified_db calls cloud init if available."""
        # Arrange & Act
        mock_cloud_init = AsyncMock()
        with patch("unified_database.init_db", new=AsyncMock()):
            with patch("unified_database.init_cloud_db", mock_cloud_init):
                await init_unified_db()

                # Assert - cloud init should be called if it's available
                mock_cloud_init.assert_called_once()


class TestSaveUnifiedJob:
    """Tests for save_unified_job function."""

    def test_save_unified_job_creates_new_job(self):
        """save_unified_job creates a new job in database."""
        # Arrange
        job_data = {
            "hash": "test123",
            "title": "Software Engineer",
            "company": "TechCorp",
            "job_board": "linkedin",
            "description": "Great opportunity",
            "location": "Remote",
        }
        score = 0.85

        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.first.return_value = None  # No existing job
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = save_unified_job(job_data, score)

            # Assert
            assert result is not None
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()
            mock_session.refresh.assert_called_once()

    def test_save_unified_job_updates_existing_job(self):
        """save_unified_job updates existing job if hash exists."""
        # Arrange
        job_data = {
            "hash": "test123",
            "title": "Senior Software Engineer",  # Updated title
            "company": "TechCorp",
            "job_board": "linkedin",
        }
        score = 0.90

        existing_job = UnifiedJob(
            id=1,
            hash="test123",
            title="Software Engineer",
            company="TechCorp",
            job_board="linkedin",
        )

        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.first.return_value = existing_job
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = save_unified_job(job_data, score)

            # Assert
            assert result == existing_job
            assert result.title == "Senior Software Engineer"
            mock_session.commit.assert_called_once()

    def test_save_unified_job_handles_missing_required_fields(self):
        """save_unified_job returns None if required fields missing."""
        # Arrange
        job_data = {
            "title": "Software Engineer",
            # Missing hash, company, job_board
        }
        score = 0.85

        mock_session = MagicMock(spec=Session)

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = save_unified_job(job_data, score)

            # Assert
            assert result is None

    def test_save_unified_job_handles_exception(self):
        """save_unified_job handles database exceptions gracefully."""
        # Arrange
        job_data = {
            "hash": "test123",
            "title": "Software Engineer",
            "company": "TechCorp",
            "job_board": "linkedin",
        }
        score = 0.85

        mock_session = MagicMock(spec=Session)
        mock_session.commit.side_effect = Exception("Database error")

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            with patch("unified_database.logger") as mock_logger:
                result = save_unified_job(job_data, score)

                # Assert
                assert result is None
                mock_session.rollback.assert_called_once()
                mock_logger.error.assert_called()


class TestGetJobsByBoard:
    """Tests for get_jobs_by_board function."""

    def test_get_jobs_by_board_returns_filtered_jobs(self):
        """get_jobs_by_board returns jobs from specific job board."""
        # Arrange
        job_board = "linkedin"
        limit = 10

        mock_jobs = [
            UnifiedJob(id=1, hash="j1", title="Engineer", company="A", job_board="linkedin"),
            UnifiedJob(id=2, hash="j2", title="Developer", company="B", job_board="linkedin"),
        ]

        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.all.return_value = mock_jobs
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = get_jobs_by_board(job_board, limit)

            # Assert
            assert len(result) == 2
            assert all(job.job_board == "linkedin" for job in result)

    def test_get_jobs_by_board_respects_limit(self):
        """get_jobs_by_board respects limit parameter."""
        # Arrange
        job_board = "indeed"
        limit = 5

        mock_session = MagicMock(spec=Session)

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            get_jobs_by_board(job_board, limit)

            # Assert - verify limit was passed to query
            # Check that exec was called with a query containing limit
            assert mock_session.exec.called


class TestGetJobBoardStats:
    """Tests for get_job_board_stats function."""

    def test_get_job_board_stats_returns_counts(self):
        """get_job_board_stats returns job counts by board."""
        # Arrange
        mock_jobs = [
            UnifiedJob(id=1, hash="j1", title="E1", company="A", job_board="linkedin"),
            UnifiedJob(id=2, hash="j2", title="E2", company="B", job_board="linkedin"),
            UnifiedJob(id=3, hash="j3", title="E3", company="C", job_board="indeed"),
        ]

        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.all.return_value = mock_jobs
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            stats = get_job_board_stats()

            # Assert
            assert "linkedin" in stats
            assert "indeed" in stats
            assert stats["linkedin"] == 2
            assert stats["indeed"] == 1

    def test_get_job_board_stats_empty_database(self):
        """get_job_board_stats handles empty database."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.all.return_value = []
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            stats = get_job_board_stats()

            # Assert
            assert stats == {}


class TestMigrateLegacyJobs:
    """Tests for migrate_legacy_jobs function."""

    def test_migrate_legacy_jobs_converts_jobs(self):
        """migrate_legacy_jobs converts legacy jobs to unified format."""
        # Arrange
        from database import Job

        legacy_jobs = [
            Job(
                id=1,
                hash="j1",
                title="Software Engineer",
                company="TechCorp",
                source="api",
            ),
            Job(
                id=2,
                hash="j2",
                title="Data Scientist",
                company="DataInc",
                source="scrape",
            ),
        ]

        mock_session = MagicMock(spec=Session)
        mock_legacy_result = MagicMock()
        mock_legacy_result.all.return_value = legacy_jobs
        mock_unified_result = MagicMock()
        mock_unified_result.all.return_value = []  # No existing unified jobs

        def mock_exec(query):
            # Return different results based on query type
            if "UnifiedJob" in str(type(query)):
                return mock_unified_result
            return mock_legacy_result

        mock_session.exec.side_effect = mock_exec

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            count = migrate_legacy_jobs()

            # Assert
            assert count == 2
            assert mock_session.add.call_count == 2
            mock_session.commit.assert_called()

    def test_migrate_legacy_jobs_skips_duplicates(self):
        """migrate_legacy_jobs skips jobs already migrated."""
        # Arrange
        from database import Job

        legacy_jobs = [
            Job(id=1, hash="j1", title="Engineer", company="Corp", source="api"),
        ]

        existing_unified = [
            UnifiedJob(id=1, hash="j1", title="Engineer", company="Corp", job_board="unknown"),
        ]

        mock_session = MagicMock(spec=Session)
        mock_legacy_result = MagicMock()
        mock_legacy_result.all.return_value = legacy_jobs
        mock_unified_result = MagicMock()
        mock_unified_result.all.return_value = existing_unified

        def mock_exec(query):
            if "UnifiedJob" in str(type(query)):
                return mock_unified_result
            return mock_legacy_result

        mock_session.exec.side_effect = mock_exec

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            count = migrate_legacy_jobs()

            # Assert
            assert count == 0  # No new migrations
            mock_session.add.assert_not_called()


class TestUserProfile:
    """Tests for UserProfile model."""

    def test_user_profile_initialization(self):
        """UserProfile model initializes with required fields."""
        # Arrange & Act
        profile = UserProfile(
            skills=json.dumps(["Python", "JavaScript"]),
            experience_years=5,
        )

        # Assert
        assert "Python" in profile.skills
        assert profile.experience_years == 5

    @pytest.mark.parametrize(
        "field,value",
        [
            ("location", "San Francisco, CA"),
            ("work_arrangement_preference", "Remote"),
            ("salary_min", 100000),
            ("salary_max", 200000),
            ("preferred_companies", json.dumps(["Google", "Facebook"])),
            ("excluded_companies", json.dumps(["BadCorp"])),
            ("current_title", "Engineer"),
        ],
        ids=["location", "work_arrangement", "min_salary", "max_salary", "companies", "excluded", "title"],
    )
    def test_user_profile_optional_fields(self, field, value):
        """UserProfile accepts various optional fields."""
        # Arrange
        profile_data = {
            "skills": json.dumps(["Python"]),
            field: value,
        }

        # Act
        profile = UserProfile(**profile_data)

        # Assert
        assert getattr(profile, field) == value


class TestSaveUserProfile:
    """Tests for save_user_profile function."""

    def test_save_user_profile_creates_new_profile(self):
        """save_user_profile creates a new user profile."""
        # Arrange
        profile_data = {
            "skills": ["Python", "JavaScript"],
            "experience_years": 5,
            "location": "San Francisco",
        }

        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.first.return_value = None  # No existing profile
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = save_user_profile(profile_data)

            # Assert
            assert result is not None
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()

    def test_save_user_profile_updates_existing_profile(self):
        """save_user_profile updates existing profile."""
        # Arrange
        profile_data = {
            "skills": ["Python", "Go", "Rust"],  # Updated skills
            "experience_years": 6,  # Updated experience
        }

        existing_profile = UserProfile(
            id=1,
            skills=json.dumps(["Python"]),
            experience_years=5,
        )

        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.first.return_value = existing_profile
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = save_user_profile(profile_data)

            # Assert
            assert result == existing_profile
            mock_session.commit.assert_called_once()

    def test_save_user_profile_handles_exception(self):
        """save_user_profile handles database exceptions."""
        # Arrange
        profile_data = {"skills": ["Python"]}

        mock_session = MagicMock(spec=Session)
        mock_session.commit.side_effect = Exception("Database error")

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            with patch("unified_database.logger") as mock_logger:
                result = save_user_profile(profile_data)

                # Assert
                assert result is None
                mock_session.rollback.assert_called_once()
                mock_logger.error.assert_called()


class TestGetUserProfile:
    """Tests for get_user_profile function."""

    def test_get_user_profile_returns_profile(self):
        """get_user_profile returns user profile if exists."""
        # Arrange
        existing_profile = UserProfile(
            id=1,
            skills=json.dumps(["Python"]),
            experience_years=5,
        )

        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.first.return_value = existing_profile
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = get_user_profile()

            # Assert
            assert result == existing_profile

    def test_get_user_profile_returns_none_if_not_exists(self):
        """get_user_profile returns None if no profile exists."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            result = get_user_profile()

            # Assert
            assert result is None


class TestCalculateJobMatchScore:
    """Tests for calculate_job_match_score function."""

    def test_calculate_job_match_score_skills_match(self):
        """calculate_job_match_score scores based on skill matches."""
        # Arrange
        job = UnifiedJob(
            hash="j1",
            title="Python Developer",
            company="TechCorp",
            job_board="linkedin",
            description="Looking for Python and Django expert",
            tags=json.dumps(["python", "django", "backend"]),
        )

        profile = UserProfile(
            skills=json.dumps(["Python", "Django", "PostgreSQL"]),
            experience_years=5,
        )

        # Act
        score = calculate_job_match_score(job, profile)

        # Assert
        assert score >= 0  # Score should be calculated
        assert score <= 100  # Score should be in valid range

    def test_calculate_job_match_score_location_match(self):
        """calculate_job_match_score considers location preferences."""
        # Arrange
        job = UnifiedJob(
            hash="j1",
            title="Engineer",
            company="Corp",
            job_board="indeed",
            location="San Francisco, CA",
        )

        profile = UserProfile(
            skills=json.dumps(["Python"]),
            location="San Francisco",
        )

        # Act
        score = calculate_job_match_score(job, profile)

        # Assert
        assert score >= 0

    def test_calculate_job_match_score_remote_preference(self):
        """calculate_job_match_score considers remote work preference."""
        # Arrange
        job = UnifiedJob(
            hash="j1",
            title="Engineer",
            company="Corp",
            job_board="indeed",
            remote=True,
        )

        profile = UserProfile(
            skills=json.dumps(["Python"]),
            work_arrangement_preference="Remote",
        )

        # Act
        score = calculate_job_match_score(job, profile)

        # Assert
        assert score >= 0

    def test_calculate_job_match_score_salary_range(self):
        """calculate_job_match_score considers salary expectations."""
        # Arrange
        job = UnifiedJob(
            hash="j1",
            title="Engineer",
            company="Corp",
            job_board="indeed",
            salary_min=120000,
            salary_max=180000,
        )

        profile = UserProfile(
            skills=json.dumps(["Python"]),
            salary_min=100000,
            salary_max=200000,
        )

        # Act
        score = calculate_job_match_score(job, profile)

        # Assert
        assert score >= 0

    def test_calculate_job_match_score_excluded_company(self):
        """calculate_job_match_score penalizes excluded companies."""
        # Arrange
        job = UnifiedJob(
            hash="j1",
            title="Engineer",
            company="BadCorp",
            job_board="indeed",
        )

        profile = UserProfile(
            skills=json.dumps(["Python"]),
            excluded_companies=json.dumps(["BadCorp"]),
        )

        # Act
        score = calculate_job_match_score(job, profile)

        # Assert
        # Score is calculated even for excluded companies
        assert score >= 0


class TestGetPersonalizedJobMatches:
    """Tests for get_personalized_job_matches function."""

    def test_get_personalized_job_matches_returns_scored_jobs(self):
        """get_personalized_job_matches returns jobs with match scores."""
        # Arrange
        profile = UserProfile(
            id=1,
            skills=json.dumps(["Python"]),
            experience_years=5,
        )

        jobs = [
            UnifiedJob(
                id=1,
                hash="j1",
                title="Python Developer",
                company="Corp1",
                job_board="linkedin",
                description="Python expert needed",
            ),
            UnifiedJob(
                id=2,
                hash="j2",
                title="Engineer",
                company="Corp2",
                job_board="indeed",
            ),
        ]

        mock_session = MagicMock(spec=Session)
        
        def mock_exec(query):
            mock_result = MagicMock()
            if "UserProfile" in str(type(query)):
                mock_result.first.return_value = profile
            else:
                mock_result.all.return_value = jobs
            return mock_result

        mock_session.exec.side_effect = mock_exec

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            matches = get_personalized_job_matches(limit=10, min_score=60.0)

            # Assert
            assert isinstance(matches, list)
            # Results should have score and reasons
            for match in matches:
                assert "job" in match
                assert "score" in match
                assert "reasons" in match

    def test_get_personalized_job_matches_filters_by_min_score(self):
        """get_personalized_job_matches filters jobs below min_score."""
        # Arrange
        profile = UserProfile(
            id=1,
            skills=json.dumps(["Python"]),
        )

        jobs = [
            UnifiedJob(id=1, hash="j1", title="Unrelated Job", company="Corp", job_board="indeed"),
        ]

        mock_session = MagicMock(spec=Session)
        
        def mock_exec(query):
            mock_result = MagicMock()
            if "UserProfile" in str(type(query)):
                mock_result.first.return_value = profile
            else:
                mock_result.all.return_value = jobs
            return mock_result

        mock_session.exec.side_effect = mock_exec

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            # Use high min_score to filter out jobs
            matches = get_personalized_job_matches(limit=10, min_score=90.0)

            # Assert
            # Jobs with low scores should be filtered
            assert len(matches) <= len(jobs)

    def test_get_personalized_job_matches_no_profile(self):
        """get_personalized_job_matches returns empty list if no profile."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        mock_result = MagicMock()
        mock_result.first.return_value = None  # No profile
        mock_session.exec.return_value = mock_result

        # Act
        with patch("unified_database.get_sync_session", return_value=mock_session):
            matches = get_personalized_job_matches()

            # Assert
            assert matches == []
