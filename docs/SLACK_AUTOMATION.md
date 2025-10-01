# Slack Setup Automation Options

## TL;DR

Full automation blocked by Slack's OAuth requirements. Best we can do: validation + quick-start links.

## What's already automated

**Current flow** (`cloud/providers/gcp/gcp.py:750-829`):
- Step-by-step instructions
- URL validation (checks `https://hooks.slack.com/`)
- Placeholder detection
- Format verification
- Test message on deploy completion

**Good enough for:** Single user, one-time setup

## Why full automation is hard

### Slack API limitations

**Incoming webhooks require:**
1. User creates Slack app manually (no API for this)
2. User installs app to workspace (OAuth flow, needs browser)
3. User selects channel interactively
4. Slack generates webhook URL

**Can't automate:**
- App creation (no Slack API endpoint)
- Initial OAuth consent (requires user browser interaction)
- Channel selection (part of OAuth flow)
- Workspace admin approval (if not admin)

### OAuth flow requirements

Slack OAuth needs:
- Redirect URI (callback URL)
- Web server to handle callback
- User to click "Allow" in browser
- Client ID/secret (from manually created app)

**Problem:** Requires pre-existing app, defeats automation purpose.

## What we could improve

### 1. QR code for mobile setup

Generate QR code with pre-filled URL:

```python
import qrcode

def show_slack_setup_qr():
    url = "https://api.slack.com/apps?new_app=1"
    qr = qrcode.QRCode()
    qr.add_data(url)
    qr.print_ascii()
```

**Benefit:** Scan with phone, create app on mobile.

**Implementation:**
```bash
pip install qrcode
```

Add to `gcp.py:740`:
```python
if confirm("Show QR code for mobile setup?"):
    show_slack_setup_qr()
```

### 2. Pre-built Slack app manifest

Slack supports app manifests (JSON config). Can't auto-install, but speeds setup.

**Create:** `config/slack_app_manifest.json`
```json
{
  "display_information": {
    "name": "Job Scraper",
    "description": "Sends job match notifications",
    "background_color": "#2c3e50"
  },
  "features": {
    "bot_user": {
      "display_name": "Job Scraper Bot"
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["incoming-webhook"]
    }
  },
  "settings": {
    "org_deploy_enabled": false,
    "socket_mode_enabled": false
  }
}
```

**Usage:**
1. Go to https://api.slack.com/apps?new_app=1
2. Click "From an app manifest"
3. Paste JSON
4. Click "Create"

**Automation:**
```python
manifest_path = project_root / "config/slack_app_manifest.json"
manifest = manifest_path.read_text()

print("📋 Copy this manifest:")
print("-" * 50)
print(manifest)
print("-" * 50)
print("Paste at: https://api.slack.com/apps?new_app=1")
```

**Benefit:** Reduces setup from 7 clicks to 3.

### 3. Browser automation (risky)

Use Playwright/Selenium to automate browser flow:

```python
from playwright.sync_api import sync_playwright

def auto_create_slack_app(email, password):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("https://api.slack.com/apps")
        page.fill("input[name='email']", email)
        page.fill("input[name='password']", password)
        # ... click through OAuth flow
```

**Problems:**
- Requires user Slack password (security risk)
- Breaks on Slack UI changes
- Violates Slack ToS (automation prohibited)
- 2FA blocks automation
- CAPTCHA blocks automation

**Verdict:** Don't do this.

### 4. Webhook testing automation

Already partially done. Could improve:

```python
async def test_webhook_with_retry(webhook_url, max_retries=3):
    """Test webhook and auto-retry on failure."""
    for attempt in range(max_retries):
        try:
            response = requests.post(
                webhook_url,
                json={"text": "✅ Job Scraper setup test"},
                timeout=10
            )
            if response.status_code == 200:
                logger.info("✓ Webhook test successful!")
                return True
        except Exception as e:
            logger.warning(f"Attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)

    logger.error("❌ Webhook test failed after {max_retries} attempts")
    return False
```

### 5. Smart URL detection

Auto-detect webhook from clipboard:

```python
import pyperclip

def try_clipboard_webhook():
    """Check if clipboard contains valid webhook URL."""
    try:
        clip = pyperclip.paste()
        if clip.startswith("https://hooks.slack.com/services/"):
            print(f"✓ Found webhook in clipboard: {clip[:50]}...")
            if confirm("Use this webhook?"):
                return clip
    except:
        pass
    return None
```

**Usage:**
```python
# Before prompting user
webhook = try_clipboard_webhook()
if not webhook:
    webhook = input("Paste webhook URL: ")
```

**Benefit:** One-click paste, no typing.

**Implementation:**
```bash
pip install pyperclip
```

### 6. Pre-configured workspace template

Offer workspace invitation link with pre-configured settings:

**Limitation:** Can't distribute workspace. Each user needs own workspace.

**Alternative:** Provide workspace settings JSON for import (if Slack adds this feature).

## Recommendation

Implement **#2 (manifest)** + **#5 (clipboard)** + **#4 (better testing)**.

**Why:**
- Manifest reduces clicks (7 → 3)
- Clipboard detection reduces errors
- Better testing catches issues early
- All stay within Slack ToS
- No security risks
- Low maintenance

**Skip:**
- QR codes (marginal benefit)
- Browser automation (ToS violation, brittle)
- Workspace templates (not possible)

## Implementation estimate

**Manifest + clipboard + testing:** 1-2 hours

```python
# cloud/slack_automation.py

import pyperclip
import requests
from pathlib import Path

async def guided_slack_setup(logger, project_root):
    """Enhanced Slack setup with clipboard + manifest."""

    # Try clipboard first
    webhook = try_clipboard_webhook()
    if webhook:
        if await test_webhook_with_retry(webhook):
            return webhook

    # Show manifest option
    manifest_path = project_root / "config/slack_app_manifest.json"
    if manifest_path.exists():
        print("\n📋 Quick setup option:")
        print("1. Copy manifest below")
        print("2. Go to: https://api.slack.com/apps?new_app=1")
        print("3. Click 'From an app manifest' → Paste → Create")
        print("")
        print(manifest_path.read_text())
        print("")

    # Manual entry with validation
    while True:
        webhook = input("Paste webhook URL: ").strip()
        if validate_webhook(webhook):
            if await test_webhook_with_retry(webhook):
                return webhook
```

## Alternative: Use Slack OAuth library

**If** Slack adds app-creation API (currently doesn't exist), could use:

```python
from slack_sdk.oauth import AuthorizeUrlGenerator
from slack_sdk.web import WebClient

# Still requires manual app creation first
generator = AuthorizeUrlGenerator(
    client_id=env["SLACK_CLIENT_ID"],
    scopes=["incoming-webhook"],
    redirect_uri="http://localhost:8080/callback"
)

url = generator.generate(state="random_state")
print(f"Visit: {url}")
# User clicks "Allow", we get code, exchange for webhook
```

**Problem:** Needs pre-existing app with client ID. Circular dependency.

## Community request

Slack feature request: API endpoint for programmatic app creation.

Current limitation acknowledged in Slack docs:
> "Apps must be created manually via the Slack App Management UI."

**Workaround:** Use Slack Enterprise Grid API (enterprise only, overkill for personal use).

## References

- Slack App Manifest docs: https://api.slack.com/reference/manifests
- OAuth limitations: https://api.slack.com/authentication/oauth-v2
- Enterprise Grid API: https://api.slack.com/enterprise/grid
- ToS automation clause: https://slack.com/terms-of-service/api
