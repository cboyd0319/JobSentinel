#!/usr/bin/env python3
"""Interactive helper for provisioning Slack incoming webhooks.

This tool keeps the process non-technical by walking through every
required Slack click and optionally writes the resulting webhook URL
into the local `.env` file used by the job scraper.
"""

from __future__ import annotations

import os
from pathlib import Path
from textwrap import dedent
from typing import Dict

from rich.console import Console
from rich.panel import Panel

console = Console()
ENV_PATH = Path(".env")
MANIFEST_PATH = Path("config/slack_app_manifest.yml")


def load_env() -> Dict[str, str]:
    """Parse the local .env file into a dictionary."""
    env: Dict[str, str] = {}
    if not ENV_PATH.exists():
        return env

    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def write_env(env: Dict[str, str]) -> None:
    """Write environment variables back to the .env file."""
    lines = ["# Environment variables for the job scraper", "# Updated by scripts/slack_bootstrap.py"]
    for key in sorted(env):
        lines.append(f"{key}={env[key]}")
    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def prompt_yes_no(question: str, default: bool = True) -> bool:
    """Simple yes/no prompt with a default value."""
    default_hint = "Y/n" if default else "y/N"
    while True:
        answer = console.input(f"[cyan]{question}[/cyan] [{default_hint}]: ").strip().lower()
        if not answer:
            return default
        if answer in {"y", "yes"}:
            return True
        if answer in {"n", "no"}:
            return False
        console.print("[yellow]Please answer with y or n.[/yellow]")


def explain_prerequisites() -> None:
    """Print a high-level overview of what the script will do."""
    welcome = dedent(
        """
        [bold magenta]🚀 Slack Setup Wizard[/bold magenta]

        This wizard will automate your Slack setup for job alerts.
        [yellow]✅ Zero technical knowledge required![/yellow] I'll guide you through each step.

        [bold cyan]What happens next:[/bold cyan]
        1. 🆓 Create a FREE Slack workspace (or use existing)
        2. 📱 Install a pre-configured Slack app (1-click setup)
        3. 🔗 Enable webhooks for instant job notifications
        4. ✅ Test everything to ensure it works perfectly

        [bold green]💰 Cost: Completely FREE (no credit card required)[/bold green]
        [dim]⏱️  Time needed: 5-10 minutes[/dim]
        
        [bold red]⚠️  Important:[/bold red] This is ALPHA software. Test thoroughly before relying on it.
        """
    ).strip()

    console.print(Panel.fit(welcome, border_style="magenta"))
    console.print()


def ensure_manifest_exists() -> None:
    """Warn the user if the manifest file is missing."""
    if MANIFEST_PATH.exists():
        return
    console.print(
        Panel(
            "Slack manifest not found. A template will be written now.",
            style="yellow",
        )
    )
    manifest_contents = dedent(
        """
        _metadata:
          major_version: 1
          minor_version: 0
        display_information:
          name: Job Scraper Alerts
        features:
          bot_user:
            display_name: Job Alerts Bot
            always_online: false
          incoming_webhooks:
            url: https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN
            description: Job matches from the private scraper
            channel: job-alerts
            channel_id: null
            icon_url: https://a.slack-edge.com/80588/img/api/homepage_build/icon-incoming-webhook.png
        oauth_config:
          scopes:
            bot:
              - incoming-webhook
        settings:
          interactivity:
            is_enabled: false
          org_deploy_enabled: false
          socket_mode_enabled: false
          token_rotation_enabled: false
        """
    ).strip()
    MANIFEST_PATH.write_text(manifest_contents + "\n", encoding="utf-8")
    console.print(f"[green]Created manifest template at {MANIFEST_PATH}[/green]")


def collect_webhook(existing: str | None) -> str:
    """Prompt the user for a webhook URL with basic validation."""
    console.print()
    console.print("Paste the webhook URL Slack shows after enabling Incoming Webhooks.")
    console.print("It should look like: https://hooks.slack.com/services/AAA/BBB/CCC")

    while True:
        default = f" (current: {existing})" if existing else ""
        value = console.input(f"[cyan]Webhook URL{default}: [/cyan]").strip()
        if not value and existing:
            return existing
        if value.startswith("https://hooks.slack.com/services/"):
            return value
        console.print("[yellow]That does not look like a Slack webhook. Try again.[/yellow]")


def test_webhook(url: str) -> None:
    """Send a short test message to confirm the webhook works."""
    if not prompt_yes_no("Send a test message now?", default=True):
        return

    try:
        import requests

        response = requests.post(
            url,
            json={"text": "Test message from job-search-automation setup."},
            timeout=10,
        )
        response.raise_for_status()
        console.print("[green]Webhook accepted the test message.[/green]")
    except Exception as exc:  # nosec B110 - we just surface the failure
        console.print(
            Panel(
                f"Webhook test failed: {exc}\nVisit Slack to confirm the webhook URL is correct.",
                style="red",
            )
        )


def guide_workspace_creation() -> None:
    """Interactive guide for creating a Slack workspace."""
    console.print("\n[bold cyan]Step 1: Create or Select a Slack Workspace[/bold cyan]")
    console.print()
    console.print("Do you already have a Slack workspace you want to use?")
    console.print("[dim](A workspace is like a team or organization in Slack)[/dim]")

    has_workspace = prompt_yes_no("Do you have a workspace?", default=False)

    if not has_workspace:
        console.print()
        console.print("[yellow]Let's create a FREE Slack workspace:[/yellow]")
        console.print()
        console.print("1. Open this link in your browser:")
        console.print("   [link=https://slack.com/get-started#/createnew]https://slack.com/get-started#/createnew[/link]")
        console.print()
        console.print("2. Enter your EMAIL ADDRESS and click 'Continue'")
        console.print("3. Check your email for a 6-digit code and enter it")
        console.print("4. Give your workspace a name (example: 'My Job Search')")
        console.print("5. Skip adding teammates (click 'Skip for now')")
        console.print("6. You're done! Slack will open your new workspace")
        console.print()
        input("Press ENTER when you've created your workspace...")
    else:
        console.print("[green]Great! You can use your existing workspace.[/green]")


def guide_app_creation() -> None:
    """Interactive guide for creating a Slack App."""
    console.print("\n[bold cyan]Step 2: Create a Slack App[/bold cyan]")
    console.print()
    console.print("Now you'll create an 'app' that sends job alerts to your workspace.")
    console.print("[dim](Don't worry, it's just a few clicks!)[/dim]")
    console.print()
    console.print("[yellow]Follow these steps:[/yellow]")
    console.print()
    console.print("1. Open this link in your browser:")
    console.print("   [link=https://api.slack.com/apps?new_app=1]https://api.slack.com/apps?new_app=1[/link]")
    console.print()
    console.print("2. Click the '[bold]From an app manifest[/bold]' tab")
    console.print()
    console.print("3. Select your workspace from the dropdown")
    console.print()
    console.print(f"4. Copy the ENTIRE contents of: [bold]{MANIFEST_PATH}[/bold]")
    console.print("   [dim](Open the file and copy everything inside)[/dim]")
    console.print()
    console.print("5. Paste it into the Slack manifest box")
    console.print()
    console.print("6. Click '[bold]Next[/bold]', review the settings, then click '[bold]Create[/bold]'")
    console.print()
    console.print("7. You'll see a confirmation screen with your new app")
    console.print()
    input("Press ENTER when you've created the app...")


def guide_webhook_setup() -> None:
    """Interactive guide for enabling webhooks."""
    console.print("\n[bold cyan]Step 3: Enable Incoming Webhooks[/bold cyan]")
    console.print()
    console.print("Almost there! Now you'll get the webhook URL.")
    console.print()
    console.print("[yellow]Follow these steps:[/yellow]")
    console.print()
    console.print("1. In your Slack App settings (should still be open), look for")
    console.print("   '[bold]Incoming Webhooks[/bold]' in the left sidebar under 'Features'")
    console.print()
    console.print("2. Toggle the switch to '[bold]On[/bold]' (if it isn't already)")
    console.print()
    console.print("3. Scroll down and click '[bold]Add New Webhook to Workspace[/bold]'")
    console.print()
    console.print("4. Select the channel where you want job alerts")
    console.print("   [dim](Tip: Create a new channel called #job-alerts)[/dim]")
    console.print()
    console.print("5. Click '[bold]Allow[/bold]'")
    console.print()
    console.print("6. You'll see a webhook URL that starts with:")
    console.print("   [dim]https://hooks.slack.com/services/...[/dim]")
    console.print()
    console.print("7. [bold]Copy that ENTIRE URL[/bold] - you'll paste it in the next step")
    console.print()
    input("Press ENTER when you have the webhook URL copied...")


def main() -> None:
    explain_prerequisites()
    ensure_manifest_exists()

    env = load_env()
    existing_url = env.get("SLACK_WEBHOOK_URL")

    if existing_url:
        console.print(f"Current webhook: [green]{existing_url}[/green]")
        if not prompt_yes_no("Do you want to replace the existing webhook?", default=False):
            test_webhook(existing_url)
            return

    # Interactive wizard for new users
    if not existing_url:
        guide_workspace_creation()
        guide_app_creation()
        guide_webhook_setup()

    webhook_url = collect_webhook(existing_url)
    env["SLACK_WEBHOOK_URL"] = webhook_url
    write_env(env)
    console.print(f"[green]✓ Saved webhook to {ENV_PATH}[/green]")

    test_webhook(webhook_url)
    console.print("\n[bold green]✓ Slack webhook configuration complete![/bold green]")
    console.print("\n[dim]Your job alerts will now be sent to Slack.[/dim]")


if __name__ == "__main__":
    main()
