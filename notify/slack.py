import os
import time

import requests
from utils.cost_tracker import tracker

MAX_FIELD_CHARS = 2800  # Slack block text practical safe limit


def _truncate(text: str, limit: int = MAX_FIELD_CHARS) -> str:
    """Truncate text to Slack safe length with ellipsis."""
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _create_job_block(job: dict) -> dict:
    """Create a Slack block for a single job with defensive formatting."""
    url = job.get("url", "")
    title = job.get("title", "(No Title)")
    company = job.get("company", "(Unknown)")
    location = job.get("location", "(Unspecified)")

    score_percent = int((job.get("score") or 0) * 100)
    metadata = job.get("score_metadata") or {}
    llm_used = bool(metadata.get("llm_used"))

    # Base header line
    job_text = f"<{url}|*{_truncate(title, 120)}*> at *{company.title()}*\n {location}\n"

    if llm_used:
        rules_score = int((metadata.get("rules_score") or 0) * 100)
        llm_score = int((metadata.get("llm_score") or 0) * 100)
        job_text += f" Score: *{score_percent}%* (Rules: {rules_score}% • AI: {llm_score}%)\n"
        llm_summary = metadata.get("llm_summary") or ""
        if llm_summary:
            job_text += f" *AI Summary:* {_truncate(llm_summary, 400)}\n"
    else:
        job_text += f" Match Score: *{score_percent}%*\n"

    reasons = job.get("score_reasons") or []
    if reasons:
        rules_reasons = [r for r in reasons if r.startswith("Rules:")]
        ai_reasons = [r for r in reasons if r.startswith("AI:")]
        other_reasons = [r for r in reasons if not r.startswith(("Rules:", "AI:", "Summary:"))]

        if rules_reasons or other_reasons:
            matched_items = [r.replace("Rules: ", "") for r in rules_reasons] + other_reasons
            job_text += f"[OK] *Matched:* {_truncate(', '.join(matched_items), 500)}\n"

        if ai_reasons:
            insights = [r.replace("AI: ", "") for r in ai_reasons]
            job_text += f" *AI Insights:* {_truncate(', '.join(insights), 400)}\n"

    return {
        "type": "section",
        "text": {"type": "mrkdwn", "text": _truncate(job_text.strip())},
        "accessory": {
            "type": "button",
            "text": {"type": "plain_text", "text": "View Job"},
            "url": url,
            "action_id": "view_job",
        },
    }


def _create_action_block(job: dict) -> dict:
    """Create an action block for match feedback (future interactive use)."""
    job_id = job.get("id", "unknown")
    return {
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {"type": "plain_text", "text": "Good Match"},
                "style": "primary",
                "value": f"good_{job_id}",
                "action_id": "good_match",
            },
            {
                "type": "button",
                "text": {"type": "plain_text", "text": "Bad Match"},
                "style": "danger",
                "value": f"bad_{job_id}",
                "action_id": "bad_match",
            },
        ],
    }


def _create_footer_block(jobs: list[dict]) -> dict:
    """Create a footer summarizing results."""
    total_jobs = len(jobs)
    llm_jobs = sum(1 for j in jobs if (j.get("score_metadata") or {}).get("llm_used"))
    footer_text = f"Found {total_jobs} high-scoring job{'s' if total_jobs != 1 else ''}"
    if llm_jobs:
        footer_text += f" • {llm_jobs} AI-analyzed"
    return {"type": "context", "elements": [{"type": "mrkdwn", "text": footer_text}]}


def format_jobs_for_slack(jobs: list[dict], critical: bool = True) -> dict:
    """Format jobs into Slack Block Kit structure.

    Args:
        jobs: list of job dicts
        critical: whether to use urgent header labeling
    """
    header_text = "[CRITICAL] New High-Match Jobs Found!" if critical else "Job Matches"
    blocks: list[dict] = [
        {"type": "header", "text": {"type": "plain_text", "text": header_text}},
    ]
    for job in jobs:
        blocks.append(_create_job_block(job))
        blocks.append(_create_action_block(job))
        blocks.append({"type": "divider"})
    blocks.append(_create_footer_block(jobs))
    return {"blocks": blocks}


def format_digest_for_slack(jobs: list[dict]) -> dict:
    """Format a digest (less verbose)."""
    blocks: list[dict] = [
        {"type": "header", "text": {"type": "plain_text", "text": "Daily Job Digest"}},
    ]
    for job in jobs:
        url = job.get("url", "")
        title = job.get("title", "(No Title)")
        company = job.get("company", "(Unknown)")
        location = job.get("location", "(Unspecified)")
        score_percent = int((job.get("score") or 0) * 100)
        job_text = f"<{url}|*{_truncate(title,120)}*> at *{company.title()}*\n {location} | Score: *{score_percent}%*\n"
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": job_text.strip()}})
    return {"blocks": blocks}


def send_slack_alert(
    jobs: list[dict], custom_message: dict | None = None, critical: bool = True
) -> bool:
    """Send formatted list of jobs or custom message to Slack incoming webhook.

    Returns True on success, False otherwise.
    """
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        print("Warning: SLACK_WEBHOOK_URL not set. Cannot send alert.")
        return False

    message = custom_message or format_jobs_for_slack(jobs, critical=critical)

    retry_count = 3
    retry_delay_seconds = 5
    for attempt in range(1, retry_count + 1):
        try:
            response = requests.post(webhook_url, json=message, timeout=10)
            # Approximate: count HTTP call; can't know bytes exactly without content-length
            tracker.incr_http(bytes_downloaded=len(response.content) if response.content else 0)
            if response.status_code == 429:  # Rate limit
                retry_after = int(response.headers.get("Retry-After", "60"))
                print(f"Rate limited by Slack. Waiting {retry_after}s before retry...")
                time.sleep(min(retry_after, 120))
                continue
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            if attempt < retry_count:
                print(
                    f"Slack send failed (attempt {attempt}/{retry_count}): {e}. Retrying in {retry_delay_seconds}s"
                )
                time.sleep(retry_delay_seconds)
                retry_delay_seconds *= 2
            else:
                print(f"Failed to send Slack alert after {retry_count} attempts: {e}")
                return False
    return False
