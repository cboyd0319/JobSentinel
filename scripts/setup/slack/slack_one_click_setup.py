#!/usr/bin/env python3
"""DEPRECATED: Use scripts/slack_setup.py instead.

Retained to avoid breaking older instructions; delegates to unified script.
"""
from rich.console import Console
from rich.panel import Panel
import subprocess
import sys

console = Console()


def main() -> int:
    console.print(Panel("slack_one_click_setup.py is deprecated. Redirecting to slack_setup.py", style="yellow"))
    try:
        return subprocess.call([sys.executable, 'scripts/slack_setup.py'])
    except FileNotFoundError:
        console.print('[red]scripts/slack_setup.py not found. Please pull the latest repository changes.[/red]')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())