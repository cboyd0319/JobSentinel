import os
import requests


def format_jobs_for_slack(jobs: list[dict]) -> dict:
    """Formats a list of jobs into a Slack message block with enhanced AI insights."""
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "🚨 New High-Match Jobs Found!"},
        }
    ]

    for job in jobs:
        score_percent = int(job.get("score", 0) * 100)

        # Get scoring metadata for enhanced display
        metadata = job.get("score_metadata", {})
        llm_used = metadata.get("llm_used", False)

        # Build the main job info
        job_text = f"<{job['url']}|*{job['title']}*> at *{job['company'].title()}*\n"
        job_text += f"📍 {job['location']}\n"

        # Enhanced scoring display
        if llm_used:
            rules_score = metadata.get("rules_score", 0)
            llm_score = metadata.get("llm_score", 0)
            job_text += f"📈 Score: *{score_percent}%* (Rules: {int(rules_score*100)}% • AI: {int(llm_score*100)}%)\n"

            # Add AI summary if available
            llm_summary = metadata.get("llm_summary", "")
            if llm_summary:
                job_text += f"🤖 *AI Summary:* {llm_summary}\n"
        else:
            job_text += f"📈 Match Score: *{score_percent}%*\n"

        # Organize reasons by source
        reasons = job.get("score_reasons", [])
        if reasons:
            rules_reasons = [r for r in reasons if r.startswith("Rules:")]
            ai_reasons = [r for r in reasons if r.startswith("AI:")]
            other_reasons = [
                r for r in reasons if not r.startswith(("Rules:", "AI:", "Summary:"))
            ]

            if rules_reasons or other_reasons:
                matched_items = [
                    r.replace("Rules: ", "") for r in rules_reasons
                ] + other_reasons
                job_text += f"✅ *Matched:* {', '.join(matched_items)}\n"

            if ai_reasons:
                job_text += f"🧠 *AI Insights:* {', '.join([r.replace('AI: ', '') for r in ai_reasons])}\n"

        # Add action buttons
        block = {
            "type": "section",
            "text": {"type": "mrkdwn", "text": job_text.strip()},
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "View Job"},
                "url": job["url"],
                "action_id": "view_job",
            },
        }

        blocks.append(block)
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Good Match"
                    },
                    "style": "primary",
                    "value": f"good_{job.get('id')}",
                    "action_id": "good_match"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Bad Match"
                    },
                    "style": "danger",
                    "value": f"bad_{job.get('id')}",
                    "action_id": "bad_match"
                }
            ]
        })

        blocks.append({"type": "divider"})

    # Add footer with scoring info
    total_jobs = len(jobs)
    llm_jobs = len(
        [j for j in jobs if j.get("score_metadata", {}).get("llm_used", False)]
    )

    footer_text = f"Found {total_jobs} high-scoring job{'s' if total_jobs != 1 else ''}"
    if llm_jobs > 0:
        footer_text += f" • {llm_jobs} enhanced with AI analysis"

    blocks.append(
        {"type": "context", "elements": [{"type": "mrkdwn", "text": footer_text}]}
    )

    return {"blocks": blocks}


def format_digest_for_slack(jobs: list[dict]) -> dict:
    """Formats a list of jobs into a daily digest for Slack."""
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "📈 Daily Job Digest"},
        }
    ]

    for job in jobs:
        score_percent = int(job.get("score", 0) * 100)
        job_text = f"<{job['url']}|*{job['title']}*> at *{job['company'].title()}*\n"
        job_text += f"📍 {job['location']} | 📈 Score: *{score_percent}%*\n"
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": job_text.strip()},
        })

    return {"blocks": blocks}

def send_slack_alert(jobs: list[dict], custom_message: dict = None):
    """Sends a formatted list of jobs or custom message to the configured Slack webhook."""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        print("Warning: SLACK_WEBHOOK_URL not set. Cannot send alert.")
        return

    # Use custom message if provided, otherwise format jobs
    if custom_message:
        message = custom_message
    else:
        message = format_jobs_for_slack(jobs)

    retry_count = 3
    retry_delay_seconds = 5
    for i in range(retry_count):
        try:
            response = requests.post(webhook_url, json=message, timeout=10)
            response.raise_for_status()
            return # Success
        except requests.RequestException as e:
            print(f"Error sending Slack alert: {e}. Retrying in {retry_delay_seconds} seconds...")
            if i < retry_count - 1:
                time.sleep(retry_delay_seconds)
                retry_delay_seconds *= 2 # Exponential backoff
            else:
                print("Failed to send Slack alert after multiple retries.")
