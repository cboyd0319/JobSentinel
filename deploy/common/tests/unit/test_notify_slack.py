"""
Comprehensive unit tests for notify.slack module.

Tests cover Slack formatting, message sending, retry logic,
rate limiting, and defensive text handling.
"""

from __future__ import annotations

from unittest.mock import MagicMock, Mock, patch

import pytest
import requests

from notify.slack import (
    MAX_FIELD_CHARS,
    _create_action_block,
    _create_footer_block,
    _create_job_block,
    _truncate,
    format_digest_for_slack,
    format_jobs_for_slack,
    send_slack_alert,
)


# ============================================================================
# Test Data Fixtures
# ============================================================================


@pytest.fixture
def sample_job():
    """Provide a basic job dictionary."""
    return {
        "id": "job123",
        "title": "Senior Python Developer",
        "company": "tech corp",
        "location": "San Francisco, CA",
        "url": "https://example.com/job123",
        "score": 0.85,
        "score_reasons": ["Rules: Keyword matched 'Python'", "Rules: Location matched"],
        "score_metadata": {"llm_used": False},
    }


@pytest.fixture
def llm_job():
    """Provide a job with LLM scoring."""
    return {
        "id": "job456",
        "title": "Backend Engineer",
        "company": "startup inc",
        "location": "Remote",
        "url": "https://example.com/job456",
        "score": 0.92,
        "score_reasons": [
            "Rules: Keyword matched 'Backend'",
            "AI: Strong technical skills match",
            "AI: Good culture fit indicators",
        ],
        "score_metadata": {
            "llm_used": True,
            "rules_score": 0.75,
            "llm_score": 0.95,
            "llm_summary": "Excellent match for backend development role with modern stack",
        },
    }


# ============================================================================
# Test: _truncate - Text Truncation
# ============================================================================


def test_truncate_short_text():
    """Test that short text is not truncated."""
    text = "Short text"
    result = _truncate(text)
    assert result == text


def test_truncate_at_limit():
    """Test text exactly at limit is not truncated."""
    text = "x" * MAX_FIELD_CHARS
    result = _truncate(text)
    assert result == text


def test_truncate_over_limit():
    """Test that long text is truncated with ellipsis."""
    text = "x" * (MAX_FIELD_CHARS + 100)
    result = _truncate(text)
    
    assert len(result) == MAX_FIELD_CHARS
    assert result.endswith("...")
    assert result[:-3] == "x" * (MAX_FIELD_CHARS - 3)


def test_truncate_custom_limit():
    """Test truncation with custom limit."""
    text = "x" * 200
    result = _truncate(text, limit=100)
    
    assert len(result) == 100
    assert result.endswith("...")


def test_truncate_empty_string():
    """Test truncation of empty string."""
    result = _truncate("")
    assert result == ""


def test_truncate_unicode_text():
    """Test truncation preserves Unicode characters."""
    text = "Hello 世界 " * 500
    result = _truncate(text, limit=100)
    
    assert len(result) == 100
    assert result.endswith("...")


# ============================================================================
# Test: _create_job_block - Basic Job Formatting
# ============================================================================


def test_create_job_block_structure(sample_job):
    """Test that job block has correct Slack structure."""
    block = _create_job_block(sample_job)
    
    assert block["type"] == "section"
    assert "text" in block
    assert block["text"]["type"] == "mrkdwn"
    assert "accessory" in block
    assert block["accessory"]["type"] == "button"


def test_create_job_block_includes_title(sample_job):
    """Test that job title is included in block."""
    block = _create_job_block(sample_job)
    
    assert "Senior Python Developer" in block["text"]["text"]


def test_create_job_block_includes_company(sample_job):
    """Test that company name is included (title-cased)."""
    block = _create_job_block(sample_job)
    
    assert "Tech Corp" in block["text"]["text"]  # Should be title-cased


def test_create_job_block_includes_location(sample_job):
    """Test that location is included."""
    block = _create_job_block(sample_job)
    
    assert "San Francisco, CA" in block["text"]["text"]


def test_create_job_block_includes_score(sample_job):
    """Test that score is formatted as percentage."""
    block = _create_job_block(sample_job)
    
    assert "85%" in block["text"]["text"]


def test_create_job_block_button_url(sample_job):
    """Test that button has correct URL."""
    block = _create_job_block(sample_job)
    
    assert block["accessory"]["url"] == "https://example.com/job123"
    assert block["accessory"]["text"]["text"] == "View Job"


def test_create_job_block_includes_reasons(sample_job):
    """Test that job reasons are included."""
    block = _create_job_block(sample_job)
    text = block["text"]["text"]
    
    assert "Matched" in text
    assert "Keyword matched 'Python'" in text


# ============================================================================
# Test: _create_job_block - LLM Integration
# ============================================================================


def test_create_job_block_llm_scores(llm_job):
    """Test that LLM jobs show both rules and AI scores."""
    block = _create_job_block(llm_job)
    text = block["text"]["text"]
    
    assert "92%" in text  # Final score
    assert "Rules: 75%" in text
    assert "AI: 95%" in text


def test_create_job_block_llm_summary(llm_job):
    """Test that LLM summary is included."""
    block = _create_job_block(llm_job)
    text = block["text"]["text"]
    
    assert "AI Summary" in text
    assert "Excellent match" in text


def test_create_job_block_separates_ai_reasons(llm_job):
    """Test that AI reasons are shown separately."""
    block = _create_job_block(llm_job)
    text = block["text"]["text"]
    
    assert "AI Insights" in text
    assert "Strong technical skills match" in text
    assert "Good culture fit indicators" in text


def test_create_job_block_no_llm_used(sample_job):
    """Test formatting when LLM is not used."""
    block = _create_job_block(sample_job)
    text = block["text"]["text"]
    
    assert "AI Summary" not in text
    assert "AI Insights" not in text
    assert "Match Score: *85%*" in text


# ============================================================================
# Test: _create_job_block - Defensive Handling
# ============================================================================


def test_create_job_block_missing_url():
    """Test handling of missing URL."""
    job = {"title": "Test Job", "company": "Company", "location": "Location", "score": 0.8}
    
    block = _create_job_block(job)
    
    # Should not crash, use empty URL
    assert block["accessory"]["url"] == ""


def test_create_job_block_missing_title():
    """Test handling of missing title."""
    job = {"company": "Company", "location": "Location", "url": "https://example.com", "score": 0.8}
    
    block = _create_job_block(job)
    text = block["text"]["text"]
    
    assert "(No Title)" in text


def test_create_job_block_missing_company():
    """Test handling of missing company."""
    job = {"title": "Job", "location": "Location", "url": "https://example.com", "score": 0.8}
    
    block = _create_job_block(job)
    text = block["text"]["text"]
    
    assert "(Unknown)" in text


def test_create_job_block_missing_location():
    """Test handling of missing location."""
    job = {"title": "Job", "company": "Company", "url": "https://example.com", "score": 0.8}
    
    block = _create_job_block(job)
    text = block["text"]["text"]
    
    assert "(Unspecified)" in text


def test_create_job_block_missing_score():
    """Test handling of missing score."""
    job = {"title": "Job", "company": "Company", "location": "Location", "url": "https://example.com"}
    
    block = _create_job_block(job)
    text = block["text"]["text"]
    
    assert "0%" in text


def test_create_job_block_truncates_long_title(sample_job):
    """Test that very long titles are truncated."""
    sample_job["title"] = "A" * 200
    
    block = _create_job_block(sample_job)
    text = block["text"]["text"]
    
    assert len(text) <= MAX_FIELD_CHARS


def test_create_job_block_truncates_long_summary(llm_job):
    """Test that very long LLM summaries are truncated."""
    llm_job["score_metadata"]["llm_summary"] = "X" * 1000
    
    block = _create_job_block(llm_job)
    text = block["text"]["text"]
    
    assert len(text) <= MAX_FIELD_CHARS


# ============================================================================
# Test: _create_action_block - Action Buttons
# ============================================================================


def test_create_action_block_structure(sample_job):
    """Test that action block has correct structure."""
    block = _create_action_block(sample_job)
    
    assert block["type"] == "actions"
    assert "elements" in block
    assert len(block["elements"]) == 2


def test_create_action_block_good_match_button(sample_job):
    """Test 'Good Match' button configuration."""
    block = _create_action_block(sample_job)
    
    good_button = block["elements"][0]
    assert good_button["type"] == "button"
    assert good_button["text"]["text"] == "Good Match"
    assert good_button["style"] == "primary"
    assert good_button["value"] == "good_job123"
    assert good_button["action_id"] == "good_match"


def test_create_action_block_bad_match_button(sample_job):
    """Test 'Bad Match' button configuration."""
    block = _create_action_block(sample_job)
    
    bad_button = block["elements"][1]
    assert bad_button["type"] == "button"
    assert bad_button["text"]["text"] == "Bad Match"
    assert bad_button["style"] == "danger"
    assert bad_button["value"] == "bad_job123"
    assert bad_button["action_id"] == "bad_match"


def test_create_action_block_missing_id():
    """Test action block with missing job ID."""
    job = {"title": "Job"}
    
    block = _create_action_block(job)
    
    # Should use 'unknown' as fallback
    assert "unknown" in block["elements"][0]["value"]


# ============================================================================
# Test: _create_footer_block - Footer Summary
# ============================================================================


def test_create_footer_block_single_job(sample_job):
    """Test footer with single job."""
    block = _create_footer_block([sample_job])
    
    assert block["type"] == "context"
    text = block["elements"][0]["text"]
    assert "Found 1 high-scoring job" in text
    assert "jobs" not in text  # Singular, not plural


def test_create_footer_block_multiple_jobs(sample_job, llm_job):
    """Test footer with multiple jobs."""
    block = _create_footer_block([sample_job, llm_job])
    
    text = block["elements"][0]["text"]
    assert "Found 2 high-scoring jobs" in text  # Plural


def test_create_footer_block_llm_count(sample_job, llm_job):
    """Test footer shows LLM analysis count."""
    block = _create_footer_block([sample_job, llm_job])
    
    text = block["elements"][0]["text"]
    assert "1 AI-analyzed" in text


def test_create_footer_block_no_llm(sample_job):
    """Test footer without LLM jobs."""
    sample_job2 = sample_job.copy()
    sample_job2["id"] = "job2"
    
    block = _create_footer_block([sample_job, sample_job2])
    
    text = block["elements"][0]["text"]
    assert "AI-analyzed" not in text


def test_create_footer_block_all_llm(llm_job):
    """Test footer when all jobs use LLM."""
    llm_job2 = llm_job.copy()
    llm_job2["id"] = "job2"
    
    block = _create_footer_block([llm_job, llm_job2])
    
    text = block["elements"][0]["text"]
    assert "2 AI-analyzed" in text


# ============================================================================
# Test: format_jobs_for_slack - Full Message Formatting
# ============================================================================


def test_format_jobs_for_slack_structure(sample_job):
    """Test that formatted message has correct structure."""
    message = format_jobs_for_slack([sample_job], critical=True)
    
    assert "blocks" in message
    assert len(message["blocks"]) > 0


def test_format_jobs_for_slack_critical_header(sample_job):
    """Test critical header is used when critical=True."""
    message = format_jobs_for_slack([sample_job], critical=True)
    
    header = message["blocks"][0]
    assert header["type"] == "header"
    assert "[CRITICAL]" in header["text"]["text"]


def test_format_jobs_for_slack_normal_header(sample_job):
    """Test normal header when critical=False."""
    message = format_jobs_for_slack([sample_job], critical=False)
    
    header = message["blocks"][0]
    assert "[CRITICAL]" not in header["text"]["text"]
    assert "Job Matches" in header["text"]["text"]


def test_format_jobs_for_slack_includes_job_blocks(sample_job, llm_job):
    """Test that all jobs are included as blocks."""
    message = format_jobs_for_slack([sample_job, llm_job])
    blocks = message["blocks"]
    
    # Should have: header + (job + actions + divider)*2 + footer
    # = 1 + 6 + 1 = 8 blocks
    assert len(blocks) == 8


def test_format_jobs_for_slack_includes_dividers(sample_job, llm_job):
    """Test that dividers are added between jobs."""
    message = format_jobs_for_slack([sample_job, llm_job])
    blocks = message["blocks"]
    
    dividers = [b for b in blocks if b.get("type") == "divider"]
    assert len(dividers) == 2


def test_format_jobs_for_slack_includes_footer(sample_job):
    """Test that footer is included."""
    message = format_jobs_for_slack([sample_job])
    blocks = message["blocks"]
    
    # Last block should be footer
    last_block = blocks[-1]
    assert last_block["type"] == "context"


# ============================================================================
# Test: format_digest_for_slack - Digest Formatting
# ============================================================================


def test_format_digest_for_slack_structure(sample_job):
    """Test digest format structure."""
    message = format_digest_for_slack([sample_job])
    
    assert "blocks" in message
    header = message["blocks"][0]
    assert header["type"] == "header"
    assert "Daily Job Digest" in header["text"]["text"]


def test_format_digest_for_slack_simpler_format(sample_job):
    """Test that digest format is simpler than critical alerts."""
    digest = format_digest_for_slack([sample_job, sample_job])
    alert = format_jobs_for_slack([sample_job, sample_job])
    
    # Digest should have fewer blocks (no actions, no dividers per job)
    assert len(digest["blocks"]) < len(alert["blocks"])


def test_format_digest_for_slack_includes_jobs(sample_job, llm_job):
    """Test that digest includes all jobs."""
    message = format_digest_for_slack([sample_job, llm_job])
    blocks = message["blocks"]
    
    # Should have sections for each job
    sections = [b for b in blocks if b.get("type") == "section"]
    assert len(sections) == 2


# ============================================================================
# Test: send_slack_alert - Configuration and Sending
# ============================================================================


def test_send_slack_alert_no_webhook_url(monkeypatch, sample_job):
    """Test that missing webhook URL returns False."""
    monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)
    
    result = send_slack_alert([sample_job])
    
    assert result is False


@patch("notify.slack.requests.post")
def test_send_slack_alert_success(mock_post, monkeypatch, sample_job):
    """Test successful Slack alert sending."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.content = b"ok"
    mock_post.return_value = mock_response
    
    result = send_slack_alert([sample_job])
    
    assert result is True
    mock_post.assert_called_once()


@patch("notify.slack.requests.post")
def test_send_slack_alert_uses_webhook_url(mock_post, monkeypatch, sample_job):
    """Test that correct webhook URL is used."""
    webhook_url = "https://hooks.slack.com/services/TEST123"
    monkeypatch.setenv("SLACK_WEBHOOK_URL", webhook_url)
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.content = b"ok"
    mock_post.return_value = mock_response
    
    send_slack_alert([sample_job])
    
    mock_post.assert_called_with(webhook_url, json=mock_post.call_args[1]["json"], timeout=10)


@patch("notify.slack.requests.post")
def test_send_slack_alert_custom_message(mock_post, monkeypatch):
    """Test sending custom message instead of formatted jobs."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.content = b"ok"
    mock_post.return_value = mock_response
    
    custom = {"text": "Custom message"}
    result = send_slack_alert([], custom_message=custom)
    
    assert result is True
    call_args = mock_post.call_args
    assert call_args[1]["json"] == custom


# ============================================================================
# Test: send_slack_alert - Retry Logic
# ============================================================================


@patch("notify.slack.requests.post")
@patch("notify.slack.time.sleep")
def test_send_slack_alert_retries_on_failure(mock_sleep, mock_post, monkeypatch, sample_job):
    """Test that failed requests are retried."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    mock_post.side_effect = requests.exceptions.RequestException("Network error")
    
    result = send_slack_alert([sample_job])
    
    assert result is False
    assert mock_post.call_count == 3  # 3 attempts
    assert mock_sleep.call_count == 2  # Sleep between retries


@patch("notify.slack.requests.post")
@patch("notify.slack.time.sleep")
def test_send_slack_alert_exponential_backoff(mock_sleep, mock_post, monkeypatch, sample_job):
    """Test exponential backoff between retries."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    mock_post.side_effect = requests.exceptions.RequestException("Network error")
    
    send_slack_alert([sample_job])
    
    # First retry: 5s, second retry: 10s
    sleep_calls = [call[0][0] for call in mock_sleep.call_args_list]
    assert sleep_calls[0] == 5
    assert sleep_calls[1] == 10


@patch("notify.slack.requests.post")
def test_send_slack_alert_success_on_retry(mock_post, monkeypatch, sample_job):
    """Test success on second retry."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    
    # Fail first, succeed second
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.content = b"ok"
    mock_post.side_effect = [
        requests.exceptions.RequestException("Network error"),
        mock_response,
    ]
    
    result = send_slack_alert([sample_job])
    
    assert result is True
    assert mock_post.call_count == 2


# ============================================================================
# Test: send_slack_alert - Rate Limiting
# ============================================================================


@patch("notify.slack.requests.post")
@patch("notify.slack.time.sleep")
def test_send_slack_alert_handles_rate_limit(mock_sleep, mock_post, monkeypatch, sample_job):
    """Test handling of Slack rate limiting."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    
    # First call: rate limited, second call: success
    rate_limit_response = Mock()
    rate_limit_response.status_code = 429
    rate_limit_response.headers = {"Retry-After": "30"}
    rate_limit_response.content = b"rate_limited"
    
    success_response = Mock()
    success_response.status_code = 200
    success_response.content = b"ok"
    
    mock_post.side_effect = [rate_limit_response, success_response]
    
    result = send_slack_alert([sample_job])
    
    assert result is True
    mock_sleep.assert_called_once_with(30)


@patch("notify.slack.requests.post")
@patch("notify.slack.time.sleep")
def test_send_slack_alert_caps_retry_after(mock_sleep, mock_post, monkeypatch, sample_job):
    """Test that Retry-After is capped at 120 seconds."""
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    
    rate_limit_response = Mock()
    rate_limit_response.status_code = 429
    rate_limit_response.headers = {"Retry-After": "300"}  # 5 minutes
    rate_limit_response.content = b"rate_limited"
    
    success_response = Mock()
    success_response.status_code = 200
    success_response.content = b"ok"
    
    mock_post.side_effect = [rate_limit_response, success_response]
    
    send_slack_alert([sample_job])
    
    # Should cap at 120 seconds, not use 300
    mock_sleep.assert_called_once_with(120)
