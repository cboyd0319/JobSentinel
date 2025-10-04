#!/usr/bin/env python3
"""Unified Slack setup script for job-search-automation.

Zero-knowledge friendly. Safely provisions (or reuses) a Slack Incoming Webhook
for job alerts and writes SLACK_WEBHOOK_URL into .env.

Usage (quick):
  python scripts/slack_setup.py           # Interactive wizard
  python scripts/slack_setup.py --webhook https://hooks.slack.com/services/AAA/BBB/CCC  # Non-interactive set
  python scripts/slack_setup.py --test-only   # Only test existing webhook

Flags:
  --webhook URL          Provide a webhook directly (non-interactive)
  --channel NAME         Hint channel name during wizard (default job-alerts)
  --test-only            Do not modify .env; just test existing webhook
  --non-interactive      Fail if interaction required and missing flags
  --print-manifest       Print (or create) manifest path then exit
  --force                Overwrite existing SLACK_WEBHOOK_URL without prompt
  --quiet                Suppress non-error chatter
  --no-test              Skip sending test message (useful offline)

Exit Codes:
  0 success
  2 invalid input / precondition not met
  3 network/test failure

ALPHA Disclaimer: This project is ALPHA. No warranty. Verify behavior before
relying on notifications for critical workflows.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Dict
from urllib.parse import urlparse

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

console = Console()
ENV_PATH = Path('.env')
MANIFEST_PATH = Path('config/slack_app_manifest.yml')
DEFAULT_CHANNEL = 'job-alerts'


class SlackSetupError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Unified Slack setup for job-search-automation')
    p.add_argument('--webhook', help='Provide a Slack Incoming Webhook URL directly')
    p.add_argument('--channel', default=DEFAULT_CHANNEL, help='Preferred channel name to create/select')
    # Using underscore form to avoid attribute access issues (args.test_only)
    p.add_argument('--test-only', dest='test_only', action='store_true', help='Only test existing webhook; do not modify .env')
    p.add_argument('--non-interactive', action='store_true', help='Fail instead of prompting when info missing')
    p.add_argument('--print-manifest', action='store_true', help='Print manifest path (create if missing) and exit')
    p.add_argument('--force', action='store_true', help='Overwrite existing SLACK_WEBHOOK_URL without prompting')
    p.add_argument('--quiet', action='store_true', help='Reduce non-error output')
    p.add_argument('--no-test', action='store_true', help='Skip sending test message')
    return p.parse_args()


def load_env() -> Dict[str, str]:
    data: Dict[str, str] = {}
    if not ENV_PATH.exists():
        return data
    try:
        for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            data[k.strip()] = v.strip()
    except Exception as e:  # pragma: no cover - defensive
        console.print(f"[yellow]Warning reading .env: {e}[/yellow]")
    return data


def save_env(env: Dict[str, str], quiet: bool = False) -> None:
    lines = [
        '# Environment variables for job-search-automation',
        f"# Updated {time.strftime('%Y-%m-%d %H:%M:%S')}",
    ]
    for k in sorted(env):
        lines.append(f"{k}={env[k]}")
    ENV_PATH.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    if not quiet:
        console.print(f"[green]Saved SLACK_WEBHOOK_URL to {ENV_PATH}[/green]")


MANIFEST_TEMPLATE = """_metadata:
  major_version: 1
  minor_version: 0
display_information:
  name: Job Search Automation
  description: Automated job alerts and notifications
features:
  bot_user:
    display_name: Job Alert Bot
    always_online: false
  incoming_webhooks:
    - url: https://hooks.slack.com/services/PLACEHOLDER/PLACEHOLDER/PLACEHOLDER
      description: Job match notifications
      channel: job-alerts
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


def ensure_manifest(quiet: bool = False) -> Path:
    if not MANIFEST_PATH.exists():
        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(MANIFEST_TEMPLATE, encoding='utf-8')
        if not quiet:
            console.print(f"[green]Created Slack manifest at {MANIFEST_PATH}[/green]")
    return MANIFEST_PATH


def validate_webhook(url: str | None) -> bool:
    if not url:
        return False
    try:
        p = urlparse(url)
        if p.scheme != 'https' or p.netloc != 'hooks.slack.com':
            return False
        if not p.path.startswith('/services/'):
            return False
        # path parts like ['', 'services', 'AAA', 'BBB', 'CCC']
        return len(p.path.split('/')) >= 5
    except Exception:
        return False


def test_webhook(url: str, quiet: bool = False) -> bool:
    try:
        import requests  # local dependency, optional runtime
    except Exception:
        if not quiet:
            console.print("[yellow]requests not installed; skipping webhook test.[/yellow]")
        return True

    payload = {
        'text': '🎉 Slack integration verified!',
        'blocks': [
            {
                'type': 'section',
                'text': {'type': 'mrkdwn', 'text': '✅ *Slack setup complete!* Job alerts will appear here.'},
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f"Test at {time.strftime('%Y-%m-%d %H:%M:%S')}"}
                ],
            },
        ],
    }
    try:
        resp = requests.post(url, json=payload, timeout=12)
        if resp.status_code == 200:
            if not quiet:
                console.print('[green]Test message sent successfully.[/green]')
            return True
        if not quiet:
            console.print(f"[red]Webhook test failed (HTTP {resp.status_code}).[/red]")
        return False
    except Exception as e:
        if not quiet:
            console.print(f'[red]Webhook test error: {e}[/red]')
        return False


def wizard(channel: str, quiet: bool = False) -> str:
    if not quiet:
        console.print(Panel("Slack Setup Wizard — minimal clicks. You'll copy a webhook URL from Slack.", border_style='magenta'))
    if not quiet:
        console.print('[bold cyan]Step 1:[/bold cyan] Create (or reuse) a Slack workspace.')
    has_workspace = Confirm.ask('Do you already have a Slack workspace?', default=False) if not quiet else True
    if not has_workspace and not quiet:
        console.print('\nOpen: https://slack.com/get-started#/createnew')
        console.print('Create a FREE workspace (skip teammates).')
        input('Press ENTER once workspace is ready...')
    if not quiet:
        console.print('\n[bold cyan]Step 2:[/bold cyan] Create the Slack App via manifest.')
        console.print('Open: https://api.slack.com/apps?new_app=1 -> From an app manifest')
        console.print(f'Copy contents of {MANIFEST_PATH} into the manifest field, then create the app.')
        input('Press ENTER once the app is created...')
        console.print('\n[bold cyan]Step 3:[/bold cyan] Enable incoming webhooks & create one.')
        console.print("In the app settings, go to 'Incoming Webhooks' -> toggle ON -> 'Add New Webhook to Workspace'.")
        console.print(f'Select or create channel #{channel}. Copy the resulting URL.')
    while True:
        url = Prompt.ask('Paste the webhook URL', default='').strip()
        if validate_webhook(url):
            return url
        console.print('[yellow]That does not look like a valid Slack webhook URL. Try again.[/yellow]')


def main() -> int:
    args = parse_args()
    env = load_env()

    ensure_manifest(quiet=args.quiet)

    if args.print_manifest:
        console.print(str(MANIFEST_PATH))
        return 0

    existing = env.get('SLACK_WEBHOOK_URL')

    if args.test_only:
        if not existing:
            console.print('[red]No existing SLACK_WEBHOOK_URL to test.[/red]')
            return 2
        ok = test_webhook(existing, quiet=args.quiet)
        return 0 if ok else 3

    # Determine target webhook
    target = args.webhook or existing
    if args.webhook:
        if not validate_webhook(args.webhook):
            console.print('[red]Provided --webhook is invalid.[/red]')
            return 2
        target = args.webhook
    elif not target:
        if args.non_interactive:
            console.print('[red]Missing webhook and non-interactive mode set.[/red]')
            return 2
        target = wizard(args.channel, quiet=args.quiet)

    # If existing differs and not forced, prompt
    if existing and target != existing and not args.force and not args.quiet:
        if not Confirm.ask(f'Replace existing webhook {existing[:45]}...?'):  # truncate display
            console.print('[yellow]Aborted (existing retained).[/yellow]')
            return 0

    env['SLACK_WEBHOOK_URL'] = target
    save_env(env, quiet=args.quiet)

    if not args.no_test:
        if not test_webhook(target, quiet=args.quiet):
            return 3

    if not args.quiet:
        console.print(Panel('Slack setup complete. You will start receiving job alerts here when matches are found.', border_style='green'))
    return 0


if __name__ == '__main__':  # pragma: no cover
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        console.print('\n[yellow]Cancelled by user.[/yellow]')
        raise SystemExit(130)
