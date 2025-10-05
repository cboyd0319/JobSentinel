# Setup Guide

**TL;DR:** How to configure Slack, email, and external job sources.

## Slack Integration

**Quick setup:**
```bash
python scripts/setup/slack/slack_setup.py
```

**Manual setup:**

1. **Create Slack app:**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name: "Job Alerts", pick your workspace

2. **Configure bot:**
   - Go to "OAuth & Permissions"
   - Add scopes: `chat:write`, `channels:read`
   - Install app to workspace
   - Copy "Bot User OAuth Token"

3. **Set up channel:**
   - Create #job-alerts channel
   - Invite the bot: `/invite @JobAlerts`

4. **Add token to config:**
```json
{
  "slack": {
    "bot_token": "xoxb-your-token-here",
    "channel": "#job-alerts"
  }
}
```

5. **Test:**
```bash
python notify/slack.py test
```

## Email Alerts

**Quick setup:**
```json
{
  "email": {
    "enabled": true,
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "username": "your-email@gmail.com",
    "password": "your-app-password",
    "to": "your-email@gmail.com"
  }
}
```

**Gmail setup:**
1. Enable 2FA on Gmail
2. Generate App Password (not your regular password)
3. Use the App Password in config

**Test:**
```bash
python notify/emailer.py test
```

## Job Sources (MCP)

The scraper uses Model Context Protocol (MCP) for external job sources.

**Supported sources:**
- JobSpy (Indeed, LinkedIn via unofficial APIs)
- JobsWithGPT (GPT-4 enhanced search)
- Reed.co.uk
- Greenhouse (company career pages)

**Configure in user_prefs.json:**
```json
{
  "sources": {
    "jobspy": {
      "enabled": true,
      "sites": ["indeed", "linkedin"],
      "country": "USA"
    },
    "reed": {
      "enabled": true,
      "api_key": "your-reed-api-key"
    }
  }
}
```

**Get Reed API key:**
1. Go to https://www.reed.co.uk/developers
2. Register for free account
3. Copy API key to config

**Test sources:**
```bash
python sources/jobspy_mcp_scraper.py
python sources/reed_mcp_scraper.py
```

## Resume Analysis

**Enable ATS scoring:**
```json
{
  "resume": {
    "enabled": true,
    "file_path": "/path/to/resume.pdf",
    "analysis_level": "detailed"
  }
}
```

**Supported formats:**
- PDF (best)
- DOCX (good)
- TXT (basic)

**Test:**
```bash
python utils/ats_analyzer.py /path/to/resume.pdf
```

## Troubleshooting

**Slack messages not appearing:**
- Check bot is in channel: `/invite @YourBot`
- Verify token has `chat:write` scope
- Test with: `python notify/slack.py test`

**Email not working:**
- Use App Password, not regular password
- Check SMTP settings for your provider
- Test with: `python notify/emailer.py test`

**No jobs found:**
- Broaden your keywords
- Check source configuration
- Run with debug: `python -m src.agent --mode poll --verbose`

**High API costs:**
- Reed has usage limits (check dashboard)
- JobSpy can hit rate limits
- Monitor with: `python scripts/monitoring/enhanced-cost-monitor.py`