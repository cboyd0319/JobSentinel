"""
Interactive setup wizard for JobSentinel.

Guides new users through first-time configuration with a friendly CLI experience.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table


console = Console()


def welcome_screen() -> None:
    """Display welcome message."""
    console.print()
    console.print(
        Panel.fit(
            "[bold cyan]Welcome to JobSentinel! 🎯[/bold cyan]\n\n"
            "Let's get you set up in just a few minutes.\n"
            "We'll help you configure:\n"
            "  • Job search preferences (keywords, locations)\n"
            "  • Job sources to scrape\n"
            "  • Slack notifications (optional)\n"
            "  • Scoring weights",
            title="JobSentinel Setup",
            border_style="cyan",
        )
    )
    console.print()


def get_keywords() -> list[str]:
    """Prompt for job search keywords."""
    console.print("[bold]Step 1: Job Search Keywords[/bold]")
    console.print("Enter keywords for your job search (e.g., python, backend, remote)")
    console.print("Tip: Use 3-7 keywords for best results\n")

    keywords_input = Prompt.ask(
        "Keywords (comma-separated)",
        default="python,backend,remote",
    )

    keywords = [k.strip() for k in keywords_input.split(",") if k.strip()]

    if len(keywords) < 2:
        console.print(
            "[yellow]⚠️  You only entered 1 keyword. Add more for better matches![/yellow]\n"
        )

    console.print(f"[green]✓[/green] Got {len(keywords)} keywords: {', '.join(keywords)}\n")
    return keywords


def get_locations() -> list[str]:
    """Prompt for preferred locations."""
    console.print("[bold]Step 2: Preferred Locations[/bold]")
    console.print('Enter locations (e.g., Remote, San Francisco, New York)')
    console.print('Tip: "Remote" is highly recommended!\n')

    locations_input = Prompt.ask(
        "Locations (comma-separated)",
        default="Remote",
    )

    locations = [loc.strip() for loc in locations_input.split(",") if loc.strip()]
    console.print(f"[green]✓[/green] Got {len(locations)} locations: {', '.join(locations)}\n")
    return locations


def get_salary_min() -> int:
    """Prompt for minimum salary."""
    console.print("[bold]Step 3: Salary Expectations[/bold]")
    console.print("What's your minimum desired salary (USD)?\n")

    salary_str = Prompt.ask(
        "Minimum salary",
        default="100000",
    )

    try:
        salary = int(salary_str.replace(",", "").replace("$", ""))
        console.print(f"[green]✓[/green] Minimum salary: ${salary:,}\n")
        return salary
    except ValueError:
        console.print("[yellow]⚠️  Invalid number, using default $100,000[/yellow]\n")
        return 100000


def configure_job_sources() -> dict[str, Any]:
    """Configure which job sources to enable."""
    console.print("[bold]Step 4: Job Sources[/bold]")
    console.print("Select which job boards to scrape:\n")

    sources = {
        "jobswithgpt": {"enabled": False, "description": "JobsWithGPT (10K+ remote jobs)"},
        "greenhouse": {"enabled": False, "description": "Greenhouse boards (tech companies)"},
        "lever": {"enabled": False, "description": "Lever boards (startups)"},
        "reed": {"enabled": False, "api_key": "", "description": "Reed.co.uk (UK jobs, API key required)"},
    }

    # Quick option: Enable all free sources
    enable_all = Confirm.ask(
        "Enable all free sources (JobsWithGPT, Greenhouse, Lever)?",
        default=True,
    )

    if enable_all:
        sources["jobswithgpt"]["enabled"] = True
        sources["greenhouse"]["enabled"] = True
        sources["lever"]["enabled"] = True
        console.print("[green]✓[/green] Enabled all free sources\n")
    else:
        # Individual selection
        for source_key, source_info in sources.items():
            if source_key == "reed":
                continue  # Handle Reed separately
            enabled = Confirm.ask(
                f"Enable {source_key}? ({source_info['description']})",
                default=True,
            )
            sources[source_key]["enabled"] = enabled

        console.print()

    # Reed (requires API key)
    enable_reed = Confirm.ask(
        "Enable Reed.co.uk? (Requires free API key from https://www.reed.co.uk/developers)",
        default=False,
    )

    if enable_reed:
        api_key = Prompt.ask("Reed API key", password=True)
        sources["reed"]["enabled"] = True
        sources["reed"]["api_key"] = api_key
        console.print("[green]✓[/green] Reed enabled\n")
    else:
        console.print()

    return sources


def configure_slack() -> dict[str, Any]:
    """Configure Slack notifications."""
    console.print("[bold]Step 5: Slack Notifications (Optional)[/bold]")
    console.print("Get notified of high-quality job matches in Slack\n")

    enable_slack = Confirm.ask(
        "Configure Slack notifications now?",
        default=True,
    )

    if not enable_slack:
        console.print("[yellow]Skipping Slack setup (you can add it later)[/yellow]\n")
        return {"webhook_url": "", "channel": "#job-alerts", "enabled": False}

    console.print("\nTo get your Slack webhook URL:")
    console.print("1. Go to https://api.slack.com/apps")
    console.print("2. Create a new app (or select existing)")
    console.print("3. Enable 'Incoming Webhooks'")
    console.print("4. Add webhook to workspace")
    console.print("5. Copy the webhook URL\n")

    webhook_url = Prompt.ask("Slack webhook URL (starts with https://hooks.slack.com/)")

    channel = Prompt.ask(
        "Slack channel",
        default="#job-alerts",
    )

    console.print("[green]✓[/green] Slack configured\n")

    return {
        "webhook_url": webhook_url,
        "channel": channel,
        "enabled": True,
        "min_score": 0.7,  # Only alert on high-quality matches
    }


def review_config(config: dict[str, Any]) -> None:
    """Display config summary for review."""
    console.print("\n[bold]Configuration Summary[/bold]\n")

    table = Table(show_header=True, header_style="bold cyan")
    table.add_column("Setting", style="cyan")
    table.add_column("Value")

    table.add_row("Keywords", ", ".join(config["keywords"]))
    table.add_row("Locations", ", ".join(config["locations"]))
    table.add_row("Min Salary", f"${config['salary_min']:,}")

    enabled_sources = [
        name for name, info in config["job_sources"].items() if info.get("enabled", False)
    ]
    table.add_row("Job Sources", ", ".join(enabled_sources) if enabled_sources else "None")

    if config["slack"]["enabled"]:
        table.add_row("Slack", f"Enabled ({config['slack']['channel']})")
    else:
        table.add_row("Slack", "Disabled")

    console.print(table)
    console.print()


def save_config(config: dict[str, Any], config_path: Path) -> None:
    """Save configuration to file."""
    config_path.parent.mkdir(parents=True, exist_ok=True)

    with open(config_path, "w") as f:
        json.dump(config, indent=2, fp=f)

    console.print(f"[green]✓[/green] Configuration saved to: {config_path}\n")


def run_first_scrape() -> bool:
    """Ask if user wants to run first scrape."""
    console.print("[bold]Step 6: First Run[/bold]")

    run_now = Confirm.ask(
        "Run your first job search now? (This will take 1-2 minutes)",
        default=True,
    )

    return run_now


def run_wizard() -> None:
    """Run the interactive setup wizard."""
    welcome_screen()

    # Collect configuration
    keywords = get_keywords()
    locations = get_locations()
    salary_min = get_salary_min()
    job_sources = configure_job_sources()
    slack_config = configure_slack()

    # Build full config
    config = {
        "keywords": keywords,
        "locations": locations,
        "salary_min": salary_min,
        "denied_companies": [],
        "keywords_boost": keywords[:3],  # Use top 3 keywords as boost
        "job_sources": job_sources,
        "slack": slack_config,
        "scoring_weights": {
            "skills": 0.4,
            "salary": 0.25,
            "location": 0.2,
            "company": 0.1,
            "recency": 0.05,
        },
    }

    # Review and save
    review_config(config)

    if not Confirm.ask("Save this configuration?", default=True):
        console.print("[yellow]Setup cancelled[/yellow]")
        sys.exit(0)

    config_dir = Path(__file__).parent.parent.parent / "config"
    config_path = config_dir / "user_prefs.json"

    save_config(config, config_path)

    # Offer to run first scrape
    if run_first_scrape():
        console.print("\n[cyan]Starting first job search...[/cyan]\n")
        os.system("python -m jsa.cli run-once")
    else:
        console.print("\n[bold green]Setup complete! 🎉[/bold green]")
        console.print("\nTo start your job search, run:")
        console.print("  [cyan]python -m jsa.cli run-once[/cyan]\n")
        console.print("For help:")
        console.print("  [cyan]python -m jsa.cli --help[/cyan]\n")


if __name__ == "__main__":
    run_wizard()
