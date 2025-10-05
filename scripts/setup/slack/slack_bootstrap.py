#!/usr/bin/env python3
"""DEPRECATED: Use scripts/slack_setup.py instead.

This legacy wizard remains for backward compatibility but simply
delegates to the unified Slack setup script. All new improvements
live in `scripts/slack_setup.py`.

Kept to avoid breaking existing documentation or user muscle memory.
"""

from rich.console import Console
from rich.panel import Panel
import subprocess
import sys

console = Console()


def main() -> int:
	console.print(Panel("slack_bootstrap.py is deprecated. Using unified slack_setup.py instead.", style="yellow"))
	try:
		return subprocess.call([sys.executable, 'scripts/slack_setup.py'])
	except FileNotFoundError:
		console.print("[red]scripts/slack_setup.py not found. Please update your repository.[/red]")
		return 1


if __name__ == '__main__':
	raise SystemExit(main())
