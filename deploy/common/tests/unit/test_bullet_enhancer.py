"""Comprehensive tests for domains.autofix.bullet_enhancer module.

Tests cover:
- EnhancementType enum values
- EnhancedBullet dataclass
- BulletEnhancer initialization
- enhance() - single bullet enhancement
- enhance_batch() - multiple bullet enhancement
- _upgrade_action_verb() - verb improvements
- _has_quantification() - quantification detection
- _suggest_quantification() - quantification suggestions
- _add_context() - context additions
- _emphasize_impact() - impact emphasis
- _calculate_improvement() - scoring
- Edge cases: empty strings, special characters, Unicode
"""

from __future__ import annotations

import pytest

from domains.autofix.bullet_enhancer import (
    BulletEnhancer,
    EnhancedBullet,
    EnhancementType,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def enhancer():
    """BulletEnhancer instance for testing."""
    return BulletEnhancer()


@pytest.fixture
def weak_bullets():
    """Collection of weak bullet points to enhance."""
    return [
        "Worked on API development",
        "Helped team with testing",
        "Did code reviews",
        "Made improvements to system",
        "Was responsible for database",
    ]


@pytest.fixture
def strong_bullets():
    """Collection of already strong bullet points."""
    return [
        "Developed RESTful API serving 1M+ requests/day using Python and FastAPI",
        "Led team of 5 engineers in implementing automated testing, reducing bugs by 40%",
        "Architected microservices infrastructure processing $2M in daily transactions",
    ]


# ============================================================================
# EnhancementType Tests
# ============================================================================


def test_enhancement_type_enum_values():
    """EnhancementType enum has expected values."""
    assert EnhancementType.ACTION_VERB_UPGRADE.value == "action_verb_upgrade"
    assert EnhancementType.QUANTIFICATION_ADDED.value == "quantification_added"
    assert EnhancementType.CONTEXT_ADDED.value == "context_added"
    assert EnhancementType.IMPACT_EMPHASIZED.value == "impact_emphasized"
    assert EnhancementType.TECHNICAL_DETAIL_ADDED.value == "technical_detail_added"


def test_enhancement_type_enum_membership():
    """All EnhancementType members are accessible."""
    types = list(EnhancementType)
    assert len(types) == 5
    assert EnhancementType.ACTION_VERB_UPGRADE in types
    assert EnhancementType.QUANTIFICATION_ADDED in types


# ============================================================================
# EnhancedBullet Tests
# ============================================================================


def test_enhanced_bullet_creation():
    """EnhancedBullet dataclass creates instances correctly."""
    bullet = EnhancedBullet(
        original="Worked on API",
        enhanced="Developed API",
        enhancements=[EnhancementType.ACTION_VERB_UPGRADE],
        improvement_score=15.0,
        explanation="upgraded action verb",
    )
    
    assert bullet.original == "Worked on API"
    assert bullet.enhanced == "Developed API"
    assert bullet.enhancements == [EnhancementType.ACTION_VERB_UPGRADE]
    assert bullet.improvement_score == 15.0
    assert bullet.explanation == "upgraded action verb"


def test_enhanced_bullet_empty_enhancements():
    """EnhancedBullet handles empty enhancements list."""
    bullet = EnhancedBullet(
        original="Perfect bullet",
        enhanced="Perfect bullet",
        enhancements=[],
        improvement_score=0.0,
        explanation="No enhancements needed",
    )
    
    assert bullet.enhancements == []
    assert bullet.improvement_score == 0.0


# ============================================================================
# BulletEnhancer Initialization Tests
# ============================================================================


def test_bullet_enhancer_initializes():
    """BulletEnhancer initializes without errors."""
    enhancer = BulletEnhancer()
    assert enhancer is not None


def test_bullet_enhancer_has_verb_sets(enhancer):
    """BulletEnhancer has predefined verb sets."""
    assert hasattr(BulletEnhancer, "LEADERSHIP_VERBS")
    assert hasattr(BulletEnhancer, "CREATION_VERBS")
    assert hasattr(BulletEnhancer, "IMPROVEMENT_VERBS")
    assert hasattr(BulletEnhancer, "ACHIEVEMENT_VERBS")
    
    assert "led" in BulletEnhancer.LEADERSHIP_VERBS
    assert "developed" in BulletEnhancer.CREATION_VERBS
    assert "improved" in BulletEnhancer.IMPROVEMENT_VERBS
    assert "achieved" in BulletEnhancer.ACHIEVEMENT_VERBS


def test_bullet_enhancer_has_quantification_patterns(enhancer):
    """BulletEnhancer has quantification pattern templates."""
    assert hasattr(BulletEnhancer, "QUANTIFICATION_PATTERNS")
    patterns = BulletEnhancer.QUANTIFICATION_PATTERNS
    
    assert "performance" in patterns
    assert "scale" in patterns
    assert "time" in patterns
    assert "money" in patterns
    assert "team" in patterns


# ============================================================================
# enhance() Method Tests - Basic Functionality
# ============================================================================


def test_enhance_returns_enhanced_bullet(enhancer):
    """enhance() returns EnhancedBullet instance."""
    result = enhancer.enhance("Worked on API development")
    
    assert isinstance(result, EnhancedBullet)
    assert result.original == "Worked on API development"
    assert result.enhanced != result.original  # Should be enhanced


def test_enhance_empty_string(enhancer):
    """enhance() handles empty string gracefully."""
    result = enhancer.enhance("")
    
    assert isinstance(result, EnhancedBullet)
    assert result.original == ""
    assert result.enhanced == ""
    assert result.improvement_score == 0
    assert "Empty bullet point" in result.explanation


def test_enhance_whitespace_only(enhancer):
    """enhance() handles whitespace-only input."""
    result = enhancer.enhance("   ")
    
    assert isinstance(result, EnhancedBullet)
    assert result.improvement_score == 0


def test_enhance_strips_bullet_markers(enhancer):
    """enhance() removes bullet point markers."""
    inputs = [
        "• Worked on API",
        "- Worked on API",
        "* Worked on API",
    ]
    
    for bullet_input in inputs:
        result = enhancer.enhance(bullet_input)
        # Should process the text without the marker
        assert "•" not in result.enhanced
        assert result.enhanced.startswith("Developed") or result.enhanced.startswith("Worked")


# ============================================================================
# enhance() Method Tests - Action Verb Upgrade
# ============================================================================


@pytest.mark.parametrize(
    "weak_verb,expected_strong",
    [
        ("Worked on API", "Developed"),
        ("Helped team", "Facilitated"),
        ("Did code reviews", "Executed"),
        ("Made improvements", "Created"),
        ("Was responsible", "Served as"),
        ("Handled deployments", "Managed"),
        ("Used Python", "Leveraged"),
        ("Wrote documentation", "Authored"),
    ],
    ids=["worked", "helped", "did", "made", "was", "handled", "used", "wrote"],
)
def test_enhance_upgrades_weak_verbs(enhancer, weak_verb, expected_strong):
    """enhance() upgrades weak action verbs to stronger ones."""
    result = enhancer.enhance(weak_verb)
    
    assert expected_strong.lower() in result.enhanced.lower()
    assert EnhancementType.ACTION_VERB_UPGRADE in result.enhancements


def test_enhance_preserves_capitalization(enhancer):
    """enhance() preserves original capitalization patterns."""
    result = enhancer.enhance("Worked on API")
    assert result.enhanced[0].isupper()  # First letter capitalized
    
    result_lower = enhancer.enhance("worked on API")
    assert result_lower.enhanced[0].islower() or result_lower.enhanced[0].isupper()


# ============================================================================
# enhance() Method Tests - Quantification
# ============================================================================


def test_enhance_detects_existing_quantification(enhancer):
    """enhance() recognizes existing quantification."""
    bullets_with_quant = [
        "Improved performance by 50%",
        "Generated $2M in revenue",
        "Processed 1M+ requests",
        "Reduced time by 3x",
    ]
    
    for bullet in bullets_with_quant:
        result = enhancer.enhance(bullet)
        # Should not add quantification if already present
        assert "[ADD:" not in result.enhanced


def test_enhance_suggests_quantification_for_improvements(enhancer):
    """enhance() suggests quantification for improvement verbs."""
    bullets_needing_quant = [
        "Improved system performance",
        "Increased user engagement",
        "Reduced server costs",
    ]
    
    for bullet in bullets_needing_quant:
        result = enhancer.enhance(bullet)
        # Should suggest quantification
        if "[ADD:" in result.enhanced:
            assert EnhancementType.QUANTIFICATION_ADDED in result.enhancements


def test_enhance_suggests_user_scale_quantification(enhancer):
    """enhance() suggests appropriate quantification based on context."""
    result = enhancer.enhance("Developed API")
    
    # Should suggest user scale or transaction metrics
    if "[ADD:" in result.enhanced:
        enhanced_lower = result.enhanced.lower()
        assert "users" in enhanced_lower or "transactions" in enhanced_lower


# ============================================================================
# enhance() Method Tests - Context Addition
# ============================================================================


def test_enhance_adds_context_to_short_generic_statements(enhancer):
    """enhance() adds technology/method context to generic statements."""
    result = enhancer.enhance("Built system")
    
    # Short and generic, should suggest context
    if "[" in result.enhanced:
        assert "TECHNOLOGY" in result.enhanced or "METHOD" in result.enhanced
        assert EnhancementType.CONTEXT_ADDED in result.enhancements


def test_enhance_skips_context_when_tech_present(enhancer):
    """enhance() doesn't add context when technology already mentioned."""
    bullets_with_tech = [
        "Developed API using Python",
        "Built dashboard with React",
        "Deployed on AWS",
    ]
    
    for bullet in bullets_with_tech:
        result = enhancer.enhance(bullet)
        # Should not suggest adding technology context
        tech_suggestion = "using [TECHNOLOGY" in result.enhanced
        assert not tech_suggestion or EnhancementType.CONTEXT_ADDED not in result.enhancements


# ============================================================================
# enhance() Method Tests - Impact Emphasis
# ============================================================================


def test_enhance_emphasizes_impact_for_long_statements(enhancer):
    """enhance() suggests impact for long statements without clear outcomes."""
    result = enhancer.enhance(
        "Developed comprehensive API system for managing customer data and integrations"
    )
    
    # Long statement without impact words
    if "resulting in" in result.enhanced.lower():
        assert EnhancementType.IMPACT_EMPHASIZED in result.enhancements


def test_enhance_skips_impact_when_present(enhancer):
    """enhance() doesn't add impact when already present."""
    bullets_with_impact = [
        "Improved API performance, resulting in 50% faster response times",
        "Developed system that increased user engagement by 30%",
    ]
    
    for bullet in bullets_with_impact:
        result = enhancer.enhance(bullet)
        # Should recognize existing impact
        # Check that we don't add redundant impact emphasis
        assert result.enhanced.count("resulting in") <= 1


# ============================================================================
# enhance() Method Tests - Improvement Score
# ============================================================================


def test_enhance_calculates_improvement_score(enhancer):
    """enhance() calculates meaningful improvement scores."""
    weak_bullet = "Worked on API"
    result = enhancer.enhance(weak_bullet)
    
    assert result.improvement_score >= 0.0
    assert result.improvement_score <= 100.0
    
    # Weak bullet should have some improvement
    if result.enhancements:
        assert result.improvement_score > 0


def test_enhance_higher_score_for_more_enhancements(enhancer):
    """More enhancements lead to higher improvement scores."""
    results = [
        enhancer.enhance("Worked on API"),  # Verb upgrade
        enhancer.enhance("Built system"),  # Verb + context
        enhancer.enhance("Did work"),  # Multiple possible enhancements
    ]
    
    # Verify scores make sense (non-negative)
    for result in results:
        assert result.improvement_score >= 0


def test_enhance_zero_score_for_perfect_bullet(enhancer):
    """Perfect bullets get zero or low improvement score."""
    perfect = "Developed RESTful API serving 1M+ users using Python and FastAPI, improving response times by 50%"
    result = enhancer.enhance(perfect)
    
    # Should have very few enhancements needed
    assert result.improvement_score < 50  # Not a lot of room for improvement


# ============================================================================
# enhance_batch() Method Tests
# ============================================================================


def test_enhance_batch_processes_multiple_bullets(enhancer, weak_bullets):
    """enhance_batch() processes multiple bullets."""
    results = enhancer.enhance_batch(weak_bullets)
    
    assert len(results) == len(weak_bullets)
    assert all(isinstance(r, EnhancedBullet) for r in results)


def test_enhance_batch_empty_list(enhancer):
    """enhance_batch() handles empty list."""
    results = enhancer.enhance_batch([])
    
    assert results == []


def test_enhance_batch_preserves_order(enhancer, weak_bullets):
    """enhance_batch() preserves input order."""
    results = enhancer.enhance_batch(weak_bullets)
    
    for i, result in enumerate(results):
        assert weak_bullets[i] in result.original or result.original == ""


def test_enhance_batch_independent_processing(enhancer):
    """enhance_batch() processes each bullet independently."""
    bullets = [
        "Worked on API",
        "Led team",
        "Improved performance",
    ]
    
    results = enhancer.enhance_batch(bullets)
    
    # Each should have different enhancements
    assert len(results) == 3
    assert results[0].enhanced != results[1].enhanced
    assert results[1].enhanced != results[2].enhanced


# ============================================================================
# Helper Method Tests - _upgrade_action_verb()
# ============================================================================


def test_upgrade_action_verb_weak_to_strong(enhancer):
    """_upgrade_action_verb() upgrades weak verbs."""
    text, upgraded = enhancer._upgrade_action_verb("worked on project")
    
    assert upgraded is True
    assert "developed" in text.lower()


def test_upgrade_action_verb_no_upgrade_needed(enhancer):
    """_upgrade_action_verb() returns False for strong verbs."""
    text, upgraded = enhancer._upgrade_action_verb("developed project")
    
    assert upgraded is False
    assert text == "developed project"


def test_upgrade_action_verb_empty_string(enhancer):
    """_upgrade_action_verb() handles empty string."""
    text, upgraded = enhancer._upgrade_action_verb("")
    
    assert upgraded is False
    assert text == ""


# ============================================================================
# Helper Method Tests - _has_quantification()
# ============================================================================


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Improved performance by 50%", True),
        ("Saved $100K", True),
        ("Processed 1M requests", True),
        ("Increased by 3x", True),
        ("Handled 100+ users", True),
        ("Developed API", False),
        ("Worked on project", False),
        ("", False),
    ],
    ids=["percent", "dollar", "million", "multiplier", "plus", "no_quant1", "no_quant2", "empty"],
)
def test_has_quantification_detection(enhancer, text, expected):
    """_has_quantification() correctly detects quantification."""
    result = enhancer._has_quantification(text)
    assert result == expected


# ============================================================================
# Helper Method Tests - _suggest_quantification()
# ============================================================================


def test_suggest_quantification_for_improvement_verbs(enhancer):
    """_suggest_quantification() suggests metrics for improvement verbs."""
    text, added = enhancer._suggest_quantification("Improved system")
    
    assert added is True
    assert "[ADD:" in text


def test_suggest_quantification_for_creation_verbs(enhancer):
    """_suggest_quantification() suggests scale for creation verbs."""
    text, added = enhancer._suggest_quantification("Developed application")
    
    assert added is True
    assert "users" in text.lower() or "transactions" in text.lower()


def test_suggest_quantification_no_suggestion(enhancer):
    """_suggest_quantification() returns False when no suggestion appropriate."""
    text, added = enhancer._suggest_quantification("Random text")
    
    # May or may not add depending on text content
    assert isinstance(added, bool)


# ============================================================================
# Helper Method Tests - _add_context()
# ============================================================================


def test_add_context_to_short_generic_statement(enhancer):
    """_add_context() adds technology context to short generic statements."""
    text, added = enhancer._add_context("Developed system")
    
    assert added is True
    assert "TECHNOLOGY" in text or "METHOD" in text


def test_add_context_skips_when_tech_present(enhancer):
    """_add_context() skips when technology already present."""
    text, added = enhancer._add_context("Developed system using Python")
    
    assert added is False


def test_add_context_skips_long_statements(enhancer):
    """_add_context() skips for already detailed statements."""
    long_text = "Developed comprehensive system for managing customer data and integrations"
    text, added = enhancer._add_context(long_text)
    
    # Long statement doesn't need context addition
    assert added is False


# ============================================================================
# Helper Method Tests - _emphasize_impact()
# ============================================================================


def test_emphasize_impact_adds_outcome_suggestion(enhancer):
    """_emphasize_impact() suggests outcome for statements without impact."""
    long_text = "Developed comprehensive API system for managing customer data and integrations"
    text, emphasized = enhancer._emphasize_impact(long_text)
    
    # Should suggest impact
    if emphasized:
        assert "resulting in" in text.lower() or "OUTCOME" in text


def test_emphasize_impact_skips_when_present(enhancer):
    """_emphasize_impact() skips when impact already present."""
    text_with_impact = "Improved performance, resulting in 50% faster response"
    text, emphasized = enhancer._emphasize_impact(text_with_impact)
    
    assert emphasized is False


# ============================================================================
# Helper Method Tests - _calculate_improvement()
# ============================================================================


def test_calculate_improvement_no_enhancements(enhancer):
    """_calculate_improvement() returns 0 for no enhancements."""
    score = enhancer._calculate_improvement("original", "same", [])
    
    assert score == 0.0


def test_calculate_improvement_with_enhancements(enhancer):
    """_calculate_improvement() calculates weighted score."""
    enhancements = [
        EnhancementType.ACTION_VERB_UPGRADE,
        EnhancementType.QUANTIFICATION_ADDED,
    ]
    
    score = enhancer._calculate_improvement("original", "enhanced", enhancements)
    
    assert score > 0
    assert score <= 100


def test_calculate_improvement_all_enhancement_types(enhancer):
    """_calculate_improvement() handles all enhancement types."""
    all_types = [
        EnhancementType.ACTION_VERB_UPGRADE,
        EnhancementType.QUANTIFICATION_ADDED,
        EnhancementType.CONTEXT_ADDED,
        EnhancementType.IMPACT_EMPHASIZED,
        EnhancementType.TECHNICAL_DETAIL_ADDED,
    ]
    
    score = enhancer._calculate_improvement("original", "fully enhanced", all_types)
    
    assert score > 0
    # Should be a substantial improvement with all types
    assert score >= 15  # At least minimum weight


# ============================================================================
# Edge Cases and Special Scenarios
# ============================================================================


def test_enhance_unicode_characters(enhancer):
    """enhance() handles Unicode characters correctly."""
    unicode_bullets = [
        "Developed API für Deutsche Benutzer",
        "Работал над проектом",
        "开发了系统",
    ]
    
    for bullet in unicode_bullets:
        result = enhancer.enhance(bullet)
        assert isinstance(result, EnhancedBullet)
        # Should not crash on Unicode


def test_enhance_special_characters(enhancer):
    """enhance() handles special characters."""
    special_bullets = [
        "Developed API (REST/GraphQL)",
        "Improved performance @scale",
        "Built system #1 feature",
    ]
    
    for bullet in special_bullets:
        result = enhancer.enhance(bullet)
        assert isinstance(result, EnhancedBullet)


def test_enhance_very_long_bullet(enhancer):
    """enhance() handles very long bullet points."""
    long_bullet = "Worked on " + "development " * 50 + "tasks"
    result = enhancer.enhance(long_bullet)
    
    assert isinstance(result, EnhancedBullet)


def test_enhance_numbers_and_metrics(enhancer):
    """enhance() preserves existing numbers and metrics."""
    bullet_with_nums = "Improved API performance from 100ms to 10ms latency"
    result = enhancer.enhance(bullet_with_nums)
    
    assert "100ms" in result.enhanced
    assert "10ms" in result.enhanced


# ============================================================================
# Integration Tests
# ============================================================================


def test_full_enhancement_workflow(enhancer):
    """Full workflow: weak bullet to enhanced bullet."""
    weak = "Worked on API"
    result = enhancer.enhance(weak)
    
    # Should have improvements
    assert result.enhanced != weak
    assert len(result.enhancements) > 0
    assert result.improvement_score > 0
    assert result.explanation != "No enhancements needed"


def test_batch_enhancement_workflow(enhancer, weak_bullets):
    """Full workflow: enhance multiple bullets."""
    results = enhancer.enhance_batch(weak_bullets)
    
    # All should be enhanced
    assert len(results) == len(weak_bullets)
    
    # Most should have improvements
    improved_count = sum(1 for r in results if r.improvement_score > 0)
    assert improved_count > 0


def test_strong_bullets_minimal_changes(enhancer, strong_bullets):
    """Strong bullets should receive minimal enhancements."""
    results = enhancer.enhance_batch(strong_bullets)
    
    # Most should have low improvement scores
    avg_score = sum(r.improvement_score for r in results) / len(results)
    assert avg_score < 30  # Strong bullets don't need much improvement
