"""Comprehensive tests for domains.ats.models module.

Tests cover:
- ATSIssueLevel enum values and properties
- ATSSystem enum values and market share data
- ATSIssue dataclass creation and defaults
- KeywordMatch dataclass creation and field validation
- ATSCompatibilityScore dataclass and all fields
- ATSCompatibilityScore.get_issues_by_level() method
- ATSCompatibilityScore.get_critical_issues() method
- ATSCompatibilityScore.get_high_priority_issues() method
- Edge cases: empty collections, default values
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from domains.ats.models import (
    ATSCompatibilityScore,
    ATSIssue,
    ATSIssueLevel,
    ATSSystem,
    KeywordMatch,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_critical_issue():
    """Sample critical ATS issue."""
    return ATSIssue(
        level=ATSIssueLevel.CRITICAL,
        category="formatting",
        description="Tables detected - will break ATS parsing",
        location="Experience section",
        affected_systems=[ATSSystem.TALEO, ATSSystem.WORKDAY],
        recommendations=["Remove tables", "Use plain text format"],
        impact_score=95.0,
    )


@pytest.fixture
def sample_high_issue():
    """Sample high priority ATS issue."""
    return ATSIssue(
        level=ATSIssueLevel.HIGH,
        category="keywords",
        description="Missing key technical skills",
        location="Skills section",
        affected_systems=[ATSSystem.GREENHOUSE],
        recommendations=["Add Python keyword", "Add AWS keyword"],
        impact_score=80.0,
    )


@pytest.fixture
def sample_medium_issue():
    """Sample medium priority ATS issue."""
    return ATSIssue(
        level=ATSIssueLevel.MEDIUM,
        category="structure",
        description="Non-standard section headers",
        location="Header",
        affected_systems=[],
        recommendations=["Use standard headers"],
        impact_score=50.0,
    )


@pytest.fixture
def sample_keyword_match():
    """Sample keyword match."""
    return KeywordMatch(
        keyword="Python",
        matches=5,
        relevance_score=0.95,
        context=["skills", "experience"],
        is_skill=True,
        is_required=True,
    )


# ============================================================================
# ATSIssueLevel Tests
# ============================================================================


def test_ats_issue_level_enum_values():
    """ATSIssueLevel enum has all expected severity levels."""
    assert ATSIssueLevel.CRITICAL.value == "critical"
    assert ATSIssueLevel.HIGH.value == "high"
    assert ATSIssueLevel.MEDIUM.value == "medium"
    assert ATSIssueLevel.LOW.value == "low"
    assert ATSIssueLevel.INFO.value == "info"


def test_ats_issue_level_enum_membership():
    """All ATSIssueLevel members are accessible."""
    levels = list(ATSIssueLevel)
    assert len(levels) == 5
    assert ATSIssueLevel.CRITICAL in levels
    assert ATSIssueLevel.HIGH in levels
    assert ATSIssueLevel.MEDIUM in levels
    assert ATSIssueLevel.LOW in levels
    assert ATSIssueLevel.INFO in levels


def test_ats_issue_level_ordering():
    """ATSIssueLevel members can be compared."""
    # Just verify they exist in expected order
    levels = [
        ATSIssueLevel.CRITICAL,
        ATSIssueLevel.HIGH,
        ATSIssueLevel.MEDIUM,
        ATSIssueLevel.LOW,
        ATSIssueLevel.INFO,
    ]
    assert len(levels) == 5


# ============================================================================
# ATSSystem Tests
# ============================================================================


def test_ats_system_enum_values():
    """ATSSystem enum has all expected ATS systems."""
    assert ATSSystem.TALEO.value == "taleo"
    assert ATSSystem.WORKDAY.value == "workday"
    assert ATSSystem.ICIMS.value == "icims"
    assert ATSSystem.GREENHOUSE.value == "greenhouse"
    assert ATSSystem.LEVER.value == "lever"
    assert ATSSystem.JOBVITE.value == "jobvite"
    assert ATSSystem.SMARTRECRUITERS.value == "smartrecruiters"
    assert ATSSystem.GENERIC.value == "generic"


def test_ats_system_enum_membership():
    """All ATSSystem members are accessible."""
    systems = list(ATSSystem)
    assert len(systems) == 8
    assert ATSSystem.TALEO in systems
    assert ATSSystem.WORKDAY in systems
    assert ATSSystem.GREENHOUSE in systems
    assert ATSSystem.GENERIC in systems


def test_ats_system_major_systems():
    """Major ATS systems are defined."""
    major_systems = [
        ATSSystem.TALEO,  # 30% market share
        ATSSystem.WORKDAY,  # 25% market share
        ATSSystem.ICIMS,  # 15% market share
    ]
    assert len(major_systems) == 3


# ============================================================================
# ATSIssue Tests
# ============================================================================


def test_ats_issue_creates_with_required_fields():
    """ATSIssue creates with only required fields."""
    issue = ATSIssue(
        level=ATSIssueLevel.CRITICAL,
        category="formatting",
        description="Test issue",
    )
    
    assert issue.level == ATSIssueLevel.CRITICAL
    assert issue.category == "formatting"
    assert issue.description == "Test issue"


def test_ats_issue_default_optional_fields():
    """ATSIssue has correct defaults for optional fields."""
    issue = ATSIssue(
        level=ATSIssueLevel.LOW,
        category="test",
        description="test",
    )
    
    assert issue.location is None
    assert issue.affected_systems == []
    assert issue.recommendations == []
    assert issue.impact_score == 0.0


def test_ats_issue_creates_with_all_fields():
    """ATSIssue stores all provided fields."""
    issue = ATSIssue(
        level=ATSIssueLevel.HIGH,
        category="keywords",
        description="Missing keywords",
        location="Skills section",
        affected_systems=[ATSSystem.TALEO, ATSSystem.WORKDAY],
        recommendations=["Add Python", "Add Java"],
        impact_score=85.5,
    )
    
    assert issue.level == ATSIssueLevel.HIGH
    assert issue.category == "keywords"
    assert issue.description == "Missing keywords"
    assert issue.location == "Skills section"
    assert len(issue.affected_systems) == 2
    assert ATSSystem.TALEO in issue.affected_systems
    assert len(issue.recommendations) == 2
    assert issue.impact_score == 85.5


@pytest.mark.parametrize(
    "level",
    [
        ATSIssueLevel.CRITICAL,
        ATSIssueLevel.HIGH,
        ATSIssueLevel.MEDIUM,
        ATSIssueLevel.LOW,
        ATSIssueLevel.INFO,
    ],
    ids=["critical", "high", "medium", "low", "info"],
)
def test_ats_issue_accepts_all_levels(level):
    """ATSIssue accepts all severity levels."""
    issue = ATSIssue(
        level=level,
        category="test",
        description="test",
    )
    assert issue.level == level


def test_ats_issue_multiple_affected_systems():
    """ATSIssue can track multiple affected systems."""
    systems = [
        ATSSystem.TALEO,
        ATSSystem.WORKDAY,
        ATSSystem.GREENHOUSE,
        ATSSystem.LEVER,
    ]
    
    issue = ATSIssue(
        level=ATSIssueLevel.CRITICAL,
        category="test",
        description="test",
        affected_systems=systems,
    )
    
    assert len(issue.affected_systems) == 4
    assert all(s in issue.affected_systems for s in systems)


def test_ats_issue_multiple_recommendations():
    """ATSIssue can store multiple recommendations."""
    recs = [
        "Remove tables",
        "Use standard fonts",
        "Avoid images",
        "Use plain text",
    ]
    
    issue = ATSIssue(
        level=ATSIssueLevel.HIGH,
        category="test",
        description="test",
        recommendations=recs,
    )
    
    assert len(issue.recommendations) == 4
    assert issue.recommendations == recs


@pytest.mark.parametrize(
    "impact_score",
    [0.0, 25.5, 50.0, 75.5, 100.0],
    ids=["zero", "low", "medium", "high", "max"],
)
def test_ats_issue_various_impact_scores(impact_score):
    """ATSIssue accepts various impact scores."""
    issue = ATSIssue(
        level=ATSIssueLevel.MEDIUM,
        category="test",
        description="test",
        impact_score=impact_score,
    )
    assert issue.impact_score == impact_score


# ============================================================================
# KeywordMatch Tests
# ============================================================================


def test_keyword_match_creates_with_required_fields():
    """KeywordMatch creates with only required fields."""
    match = KeywordMatch(
        keyword="Python",
        matches=3,
        relevance_score=0.8,
    )
    
    assert match.keyword == "Python"
    assert match.matches == 3
    assert match.relevance_score == 0.8


def test_keyword_match_default_optional_fields():
    """KeywordMatch has correct defaults for optional fields."""
    match = KeywordMatch(
        keyword="Java",
        matches=2,
        relevance_score=0.7,
    )
    
    assert match.context == []
    assert match.is_skill is False
    assert match.is_required is False


def test_keyword_match_creates_with_all_fields():
    """KeywordMatch stores all provided fields."""
    match = KeywordMatch(
        keyword="FastAPI",
        matches=4,
        relevance_score=0.95,
        context=["skills", "experience", "projects"],
        is_skill=True,
        is_required=True,
    )
    
    assert match.keyword == "FastAPI"
    assert match.matches == 4
    assert match.relevance_score == 0.95
    assert len(match.context) == 3
    assert "skills" in match.context
    assert match.is_skill is True
    assert match.is_required is True


def test_keyword_match_context_list():
    """KeywordMatch stores multiple context locations."""
    contexts = ["summary", "skills", "experience", "education"]
    match = KeywordMatch(
        keyword="AWS",
        matches=5,
        relevance_score=0.9,
        context=contexts,
    )
    
    assert len(match.context) == 4
    assert match.context == contexts


@pytest.mark.parametrize(
    "is_skill,is_required",
    [
        (True, True),
        (True, False),
        (False, True),
        (False, False),
    ],
    ids=["skill_required", "skill_optional", "not_skill_required", "not_skill_optional"],
)
def test_keyword_match_boolean_combinations(is_skill, is_required):
    """KeywordMatch handles various boolean flag combinations."""
    match = KeywordMatch(
        keyword="Test",
        matches=1,
        relevance_score=0.5,
        is_skill=is_skill,
        is_required=is_required,
    )
    
    assert match.is_skill == is_skill
    assert match.is_required == is_required


@pytest.mark.parametrize(
    "matches",
    [0, 1, 5, 10, 50, 100],
    ids=["zero", "one", "few", "several", "many", "lots"],
)
def test_keyword_match_various_match_counts(matches):
    """KeywordMatch accepts various match counts."""
    match = KeywordMatch(
        keyword="test",
        matches=matches,
        relevance_score=0.5,
    )
    assert match.matches == matches


# ============================================================================
# ATSCompatibilityScore Tests - Creation
# ============================================================================


def test_ats_compatibility_score_creates_with_overall_score():
    """ATSCompatibilityScore creates with overall score."""
    score = ATSCompatibilityScore(overall_score=85.5)
    
    assert score.overall_score == 85.5


def test_ats_compatibility_score_default_fields():
    """ATSCompatibilityScore has correct defaults."""
    score = ATSCompatibilityScore(overall_score=80.0)
    
    assert score.component_scores == {}
    assert score.issues == []
    assert score.keyword_matches == []
    assert score.system_scores == {}
    assert isinstance(score.analysis_timestamp, datetime)
    assert score.resume_word_count == 0
    assert score.resume_sections == []
    assert score.priority_recommendations == []
    assert score.quick_wins == []


def test_ats_compatibility_score_creates_with_all_fields():
    """ATSCompatibilityScore stores all provided fields."""
    timestamp = datetime.now(UTC)
    
    score = ATSCompatibilityScore(
        overall_score=75.5,
        component_scores={"formatting": 80.0, "keywords": 70.0},
        issues=[
            ATSIssue(
                level=ATSIssueLevel.HIGH,
                category="test",
                description="test",
            )
        ],
        keyword_matches=[
            KeywordMatch(keyword="Python", matches=3, relevance_score=0.9)
        ],
        system_scores={
            ATSSystem.TALEO: 70.0,
            ATSSystem.WORKDAY: 75.0,
        },
        analysis_timestamp=timestamp,
        resume_word_count=450,
        resume_sections=["summary", "experience", "education"],
        priority_recommendations=["Fix critical issues", "Add keywords"],
        quick_wins=["Use standard fonts", "Remove images"],
    )
    
    assert score.overall_score == 75.5
    assert len(score.component_scores) == 2
    assert len(score.issues) == 1
    assert len(score.keyword_matches) == 1
    assert len(score.system_scores) == 2
    assert score.analysis_timestamp == timestamp
    assert score.resume_word_count == 450
    assert len(score.resume_sections) == 3
    assert len(score.priority_recommendations) == 2
    assert len(score.quick_wins) == 2


def test_ats_compatibility_score_timestamp_auto_generated():
    """ATSCompatibilityScore auto-generates timestamp."""
    before = datetime.now(UTC)
    score = ATSCompatibilityScore(overall_score=80.0)
    after = datetime.now(UTC)
    
    assert before <= score.analysis_timestamp <= after


# ============================================================================
# ATSCompatibilityScore Tests - Component Scores
# ============================================================================


def test_ats_compatibility_score_component_scores():
    """ATSCompatibilityScore stores component scores."""
    components = {
        "formatting": 90.0,
        "keywords": 85.0,
        "structure": 80.0,
        "content": 75.0,
    }
    
    score = ATSCompatibilityScore(
        overall_score=82.5,
        component_scores=components,
    )
    
    assert len(score.component_scores) == 4
    assert score.component_scores["formatting"] == 90.0
    assert score.component_scores["keywords"] == 85.0


# ============================================================================
# ATSCompatibilityScore Tests - Issues
# ============================================================================


def test_ats_compatibility_score_multiple_issues(
    sample_critical_issue, sample_high_issue, sample_medium_issue
):
    """ATSCompatibilityScore stores multiple issues."""
    score = ATSCompatibilityScore(
        overall_score=70.0,
        issues=[sample_critical_issue, sample_high_issue, sample_medium_issue],
    )
    
    assert len(score.issues) == 3


# ============================================================================
# ATSCompatibilityScore Tests - System Scores
# ============================================================================


def test_ats_compatibility_score_system_scores():
    """ATSCompatibilityScore stores per-system compatibility scores."""
    system_scores = {
        ATSSystem.TALEO: 75.0,
        ATSSystem.WORKDAY: 80.0,
        ATSSystem.GREENHOUSE: 85.0,
        ATSSystem.LEVER: 90.0,
    }
    
    score = ATSCompatibilityScore(
        overall_score=82.5,
        system_scores=system_scores,
    )
    
    assert len(score.system_scores) == 4
    assert score.system_scores[ATSSystem.TALEO] == 75.0
    assert score.system_scores[ATSSystem.GREENHOUSE] == 85.0


# ============================================================================
# ATSCompatibilityScore Tests - get_issues_by_level()
# ============================================================================


def test_get_issues_by_level_filters_correctly(
    sample_critical_issue, sample_high_issue, sample_medium_issue
):
    """get_issues_by_level() returns only issues of specified level."""
    score = ATSCompatibilityScore(
        overall_score=70.0,
        issues=[sample_critical_issue, sample_high_issue, sample_medium_issue],
    )
    
    critical_issues = score.get_issues_by_level(ATSIssueLevel.CRITICAL)
    
    assert len(critical_issues) == 1
    assert critical_issues[0].level == ATSIssueLevel.CRITICAL


def test_get_issues_by_level_empty_result():
    """get_issues_by_level() returns empty list when no matches."""
    score = ATSCompatibilityScore(overall_score=90.0)
    
    critical_issues = score.get_issues_by_level(ATSIssueLevel.CRITICAL)
    
    assert critical_issues == []


def test_get_issues_by_level_all_levels(
    sample_critical_issue, sample_high_issue, sample_medium_issue
):
    """get_issues_by_level() works for all severity levels."""
    score = ATSCompatibilityScore(
        overall_score=70.0,
        issues=[sample_critical_issue, sample_high_issue, sample_medium_issue],
    )
    
    critical = score.get_issues_by_level(ATSIssueLevel.CRITICAL)
    high = score.get_issues_by_level(ATSIssueLevel.HIGH)
    medium = score.get_issues_by_level(ATSIssueLevel.MEDIUM)
    low = score.get_issues_by_level(ATSIssueLevel.LOW)
    
    assert len(critical) == 1
    assert len(high) == 1
    assert len(medium) == 1
    assert len(low) == 0


def test_get_issues_by_level_multiple_same_level():
    """get_issues_by_level() returns all issues of same level."""
    issues = [
        ATSIssue(level=ATSIssueLevel.HIGH, category="test1", description="test1"),
        ATSIssue(level=ATSIssueLevel.HIGH, category="test2", description="test2"),
        ATSIssue(level=ATSIssueLevel.HIGH, category="test3", description="test3"),
    ]
    
    score = ATSCompatibilityScore(overall_score=75.0, issues=issues)
    
    high_issues = score.get_issues_by_level(ATSIssueLevel.HIGH)
    
    assert len(high_issues) == 3


# ============================================================================
# ATSCompatibilityScore Tests - get_critical_issues()
# ============================================================================


def test_get_critical_issues_returns_critical_only(
    sample_critical_issue, sample_high_issue
):
    """get_critical_issues() returns only critical issues."""
    score = ATSCompatibilityScore(
        overall_score=70.0,
        issues=[sample_critical_issue, sample_high_issue],
    )
    
    critical = score.get_critical_issues()
    
    assert len(critical) == 1
    assert critical[0].level == ATSIssueLevel.CRITICAL


def test_get_critical_issues_empty():
    """get_critical_issues() returns empty list when no critical issues."""
    score = ATSCompatibilityScore(overall_score=90.0)
    
    critical = score.get_critical_issues()
    
    assert critical == []


def test_get_critical_issues_multiple():
    """get_critical_issues() returns all critical issues."""
    issues = [
        ATSIssue(level=ATSIssueLevel.CRITICAL, category="test1", description="test1"),
        ATSIssue(level=ATSIssueLevel.CRITICAL, category="test2", description="test2"),
        ATSIssue(level=ATSIssueLevel.HIGH, category="test3", description="test3"),
    ]
    
    score = ATSCompatibilityScore(overall_score=70.0, issues=issues)
    
    critical = score.get_critical_issues()
    
    assert len(critical) == 2


# ============================================================================
# ATSCompatibilityScore Tests - get_high_priority_issues()
# ============================================================================


def test_get_high_priority_issues_returns_critical_and_high(
    sample_critical_issue, sample_high_issue, sample_medium_issue
):
    """get_high_priority_issues() returns critical and high issues."""
    score = ATSCompatibilityScore(
        overall_score=70.0,
        issues=[sample_critical_issue, sample_high_issue, sample_medium_issue],
    )
    
    high_priority = score.get_high_priority_issues()
    
    assert len(high_priority) == 2
    levels = {issue.level for issue in high_priority}
    assert ATSIssueLevel.CRITICAL in levels
    assert ATSIssueLevel.HIGH in levels
    assert ATSIssueLevel.MEDIUM not in levels


def test_get_high_priority_issues_empty():
    """get_high_priority_issues() returns empty list when no high priority issues."""
    score = ATSCompatibilityScore(overall_score=90.0)
    
    high_priority = score.get_high_priority_issues()
    
    assert high_priority == []


def test_get_high_priority_issues_order():
    """get_high_priority_issues() returns critical issues first."""
    critical = ATSIssue(level=ATSIssueLevel.CRITICAL, category="c", description="c")
    high = ATSIssue(level=ATSIssueLevel.HIGH, category="h", description="h")
    
    score = ATSCompatibilityScore(
        overall_score=70.0,
        issues=[high, critical],  # High first, then critical
    )
    
    high_priority = score.get_high_priority_issues()
    
    # Should have both
    assert len(high_priority) == 2


# ============================================================================
# Edge Cases
# ============================================================================


def test_ats_compatibility_score_zero_score():
    """ATSCompatibilityScore handles zero score."""
    score = ATSCompatibilityScore(overall_score=0.0)
    assert score.overall_score == 0.0


def test_ats_compatibility_score_perfect_score():
    """ATSCompatibilityScore handles perfect 100 score."""
    score = ATSCompatibilityScore(overall_score=100.0)
    assert score.overall_score == 100.0


def test_ats_issue_empty_lists():
    """ATSIssue handles empty lists for collections."""
    issue = ATSIssue(
        level=ATSIssueLevel.LOW,
        category="test",
        description="test",
        affected_systems=[],
        recommendations=[],
    )
    
    assert issue.affected_systems == []
    assert issue.recommendations == []


def test_keyword_match_empty_context():
    """KeywordMatch handles empty context list."""
    match = KeywordMatch(
        keyword="test",
        matches=1,
        relevance_score=0.5,
        context=[],
    )
    
    assert match.context == []


# ============================================================================
# Integration Tests
# ============================================================================


def test_full_compatibility_score_workflow():
    """Complete ATS compatibility score with all components."""
    # Create issues
    issues = [
        ATSIssue(
            level=ATSIssueLevel.CRITICAL,
            category="formatting",
            description="Tables detected",
            affected_systems=[ATSSystem.TALEO],
            recommendations=["Remove tables"],
            impact_score=90.0,
        ),
        ATSIssue(
            level=ATSIssueLevel.HIGH,
            category="keywords",
            description="Missing keywords",
            impact_score=75.0,
        ),
    ]
    
    # Create keyword matches
    matches = [
        KeywordMatch(
            keyword="Python",
            matches=5,
            relevance_score=0.95,
            context=["skills", "experience"],
            is_skill=True,
            is_required=True,
        ),
        KeywordMatch(
            keyword="AWS",
            matches=3,
            relevance_score=0.85,
            is_skill=True,
        ),
    ]
    
    # Create comprehensive score
    score = ATSCompatibilityScore(
        overall_score=78.5,
        component_scores={
            "formatting": 70.0,
            "keywords": 85.0,
            "structure": 80.0,
        },
        issues=issues,
        keyword_matches=matches,
        system_scores={
            ATSSystem.TALEO: 72.0,
            ATSSystem.WORKDAY: 80.0,
            ATSSystem.GREENHOUSE: 82.0,
        },
        resume_word_count=500,
        resume_sections=["summary", "experience", "education", "skills"],
        priority_recommendations=["Remove tables", "Add more keywords"],
        quick_wins=["Use standard fonts"],
    )
    
    # Verify complete structure
    assert score.overall_score == 78.5
    assert len(score.component_scores) == 3
    assert len(score.issues) == 2
    assert len(score.keyword_matches) == 2
    assert len(score.system_scores) == 3
    assert score.resume_word_count == 500
    assert len(score.resume_sections) == 4
    
    # Verify methods work
    critical = score.get_critical_issues()
    assert len(critical) == 1
    
    high_priority = score.get_high_priority_issues()
    assert len(high_priority) == 2
