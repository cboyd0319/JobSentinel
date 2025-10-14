"""
Interactive setup wizard for JobSentinel.

Guides new users through first-time configuration with a friendly CLI experience.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import requests
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table

console = Console()


def test_slack_webhook(webhook_url: str) -> bool:
    """Test a Slack webhook by sending a test message.

    Args:
        webhook_url: The Slack webhook URL to test

    Returns:
        True if test successful, False otherwise
    """
    try:
        response = requests.post(
            webhook_url,
            json={
                "text": "🎯 JobSentinel Setup Test",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*JobSentinel Setup*\n\nThis is a test message from your JobSentinel setup wizard. If you see this, your Slack integration is working perfectly! ✅",
                        },
                    }
                ],
            },
            timeout=10,
        )
        return response.status_code == 200
    except Exception:
        return False


def test_database_connection(db_url: str) -> bool:
    """Test database connection.

    Args:
        db_url: Database connection URL

    Returns:
        True if connection successful, False otherwise
    """
    try:
        # Import here to avoid dependency issues
        import sqlalchemy
        from sqlalchemy import create_engine, text

        # For SQLite, use synchronous URL for testing
        sync_url = db_url.replace("sqlite+aiosqlite://", "sqlite://")

        # Create engine and test connection
        engine = create_engine(sync_url, echo=False)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


def welcome_screen() -> None:
    """Display welcome message."""
    console.print()
    console.print(
        Panel.fit(
            "[bold cyan]Welcome to JobSentinel! 🎯[/bold cyan]\n\n"
            "[bold]Your AI-Powered Job Search Assistant[/bold]\n\n"
            "Let's get you set up in just a few minutes.\n\n"
            "[cyan]We'll help you configure:[/cyan]\n"
            "  • 🔍 Job search preferences (keywords, locations)\n"
            "  • 🌐 Job sources to scrape\n"
            "  • 💬 Slack notifications (optional)\n"
            "  • 🗄️  Local SQLite database (automatic)\n"
            "  • ⚖️  Scoring weights\n\n"
            "[bold green]100% Local • 100% Private • 100% Free • Zero Setup[/bold green]",
            title="🚀 JobSentinel Setup Wizard",
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
    console.print("Enter locations (e.g., Remote, San Francisco, New York)")
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


def configure_database() -> dict[str, Any]:
    """Configure database - SQLite only (automatic, no setup required)."""
    console.print("[bold]Step 3.5: Database Setup[/bold]")
    console.print()
    
    console.print(
        Panel.fit(
            "[bold green]SQLite Database (Automatic)[/bold green]\n\n"
            "✓ No installation required\n"
            "✓ No admin rights needed\n"
            "✓ 100% private (single file)\n"
            "✓ Perfect for personal job search\n"
            "✓ Portable - copy file anywhere\n\n"
            "[cyan]Database file:[/cyan] data/jobs.sqlite",
            border_style="green",
        )
    )
    console.print()
    
    console.print("[green]✓[/green] SQLite configured automatically")
    console.print("[dim]No further setup required - ready to use![/dim]\n")
    
    return {
        "type": "sqlite",
        "url": "sqlite+aiosqlite:///data/jobs.sqlite",
        "configured": True,
    }


def configure_job_sources() -> dict[str, Any]:
    """Configure which job sources to enable."""
    console.print()
    console.print(
        Panel.fit(
            "[bold cyan]Step 4: Job Sources[/bold cyan]\n\n"
            "Select which job boards to scrape.\n"
            "More sources = more opportunities! 🌟",
            border_style="cyan",
        )
    )
    console.print()

    sources = {
        "jobswithgpt": {"enabled": False, "description": "JobsWithGPT - 10K+ remote jobs"},
        "greenhouse": {"enabled": False, "description": "Greenhouse - Tech companies"},
        "lever": {"enabled": False, "description": "Lever - Startups & scale-ups"},
        "reed": {
            "enabled": False,
            "api_key": "",
            "description": "Reed.co.uk - UK jobs (API key required)",
        },
    }

    # Quick option: Enable all free sources
    enable_all = Confirm.ask(
        "🚀 Enable all free sources? (JobsWithGPT, Greenhouse, Lever - Recommended)",
        default=True,
    )

    if enable_all:
        sources["jobswithgpt"]["enabled"] = True
        sources["greenhouse"]["enabled"] = True
        sources["lever"]["enabled"] = True
        console.print("[green]✓ Enabled all free sources[/green]")
        console.print("[dim]  • JobsWithGPT: 10K+ remote opportunities[/dim]")
        console.print("[dim]  • Greenhouse: Top tech companies[/dim]")
        console.print("[dim]  • Lever: Innovative startups[/dim]\n")
    else:
        # Individual selection
        console.print("[bold]Select individual sources:[/bold]\n")
        for source_key, source_info in sources.items():
            if source_key == "reed":
                continue  # Handle Reed separately
            enabled = Confirm.ask(
                f"  Enable {source_key}? ({source_info['description']})",
                default=True,
            )
            sources[source_key]["enabled"] = enabled

        console.print()

    # Reed (requires API key)
    console.print("[bold]Additional source (requires API key):[/bold]\n")
    enable_reed = Confirm.ask(
        "Enable Reed.co.uk? (Free API key from https://www.reed.co.uk/developers)",
        default=False,
    )

    if enable_reed:
        console.print("[cyan]Get your free API key at: https://www.reed.co.uk/developers[/cyan]")
        api_key = Prompt.ask("Reed API key", password=True)
        if api_key:
            sources["reed"]["enabled"] = True
            sources["reed"]["api_key"] = api_key
            console.print("[green]✓ Reed enabled[/green]\n")
        else:
            console.print("[yellow]⚠️  Skipping Reed (no API key provided)[/yellow]\n")
    else:
        console.print()

    # Show summary
    enabled_count = sum(1 for s in sources.values() if s.get("enabled", False))
    console.print(f"[green]✓ Configured {enabled_count} job source(s)[/green]\n")

    return sources


def configure_slack() -> dict[str, Any]:
    """Configure Slack notifications."""
    console.print()
    console.print(
        Panel.fit(
            "[bold cyan]Step 5: Slack Notifications (Optional)[/bold cyan]\n\n"
            "Get instant notifications of high-quality job matches! 💬\n"
            "Never miss a great opportunity again.",
            border_style="cyan",
        )
    )
    console.print()

    enable_slack = Confirm.ask(
        "🔔 Configure Slack notifications now?",
        default=True,
    )

    if not enable_slack:
        console.print("[yellow]⏭️  Skipping Slack setup (you can add it later in config/user_prefs.json)[/yellow]\n")
        return {"webhook_url": "", "channel": "#job-alerts", "enabled": False}

    console.print()
    console.print(
        Panel.fit(
            "[bold]How to get your Slack webhook URL:[/bold]\n\n"
            "1. Visit: [cyan]https://api.slack.com/apps[/cyan]\n"
            "2. Click 'Create New App' (or select existing)\n"
            "3. Enable 'Incoming Webhooks'\n"
            "4. Click 'Add New Webhook to Workspace'\n"
            "5. Select your channel and copy the webhook URL",
            border_style="blue",
        )
    )
    console.print()

    webhook_url = Prompt.ask("📥 Slack webhook URL (starts with https://hooks.slack.com/)")

    # Validate webhook URL format
    if webhook_url and not webhook_url.startswith("https://hooks.slack.com/"):
        console.print("[yellow]⚠️  Warning: Webhook URL doesn't look like a Slack webhook[/yellow]")
        console.print("[yellow]   Expected format: https://hooks.slack.com/services/...[/yellow]\n")
        if not Confirm.ask("Continue anyway?", default=False):
            console.print("[yellow]⏭️  Skipping Slack setup (you can add it later)[/yellow]\n")
            return {"webhook_url": "", "channel": "#job-alerts", "enabled": False}

    # Test webhook if provided and user wants
    if webhook_url:
        test_webhook = Confirm.ask("🧪 Test Slack webhook now? (sends a test message)", default=True)
        if test_webhook:
            console.print("[dim]Sending test message...[/dim]")
            test_result = test_slack_webhook(webhook_url)
            if test_result:
                console.print("[green]✓ Slack webhook test successful! Check your Slack channel.[/green]\n")
            else:
                console.print("[red]✗ Slack webhook test failed[/red]")
                console.print("[dim]Troubleshooting:[/dim]")
                console.print("[dim]  • Check your webhook URL is correct[/dim]")
                console.print("[dim]  • Verify Slack app permissions[/dim]")
                console.print("[dim]  • Make sure the webhook is active[/dim]\n")
                if not Confirm.ask("Continue with this webhook anyway?", default=False):
                    console.print("[yellow]⏭️  Skipping Slack setup (you can add it later)[/yellow]\n")
                    return {"webhook_url": "", "channel": "#job-alerts", "enabled": False}

    channel = Prompt.ask(
        "📢 Slack channel",
        default="#job-alerts",
    )

    console.print("[green]✓ Slack configured successfully![/green]")
    console.print("[dim]  • Webhook: " + webhook_url[:40] + "..." + "[/dim]")
    console.print(f"[dim]  • Channel: {channel}[/dim]")
    console.print("[dim]  • Minimum score for alerts: 0.7 (70% match)[/dim]\n")

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

    # Database info
    db_type = config.get("database", {}).get("type", "sqlite")
    table.add_row("Database", db_type.upper())

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


def check_existing_config() -> dict[str, Any] | None:
    """Check if configuration already exists and offer to import it.
    
    Returns:
        Existing configuration dict if user wants to import, None otherwise
    """
    config_dir = Path(__file__).parent.parent.parent / "config"
    config_path = config_dir / "user_prefs.json"
    
    if not config_path.exists():
        return None
        
    console.print("\n[cyan]Existing configuration detected![/cyan]\n")
    
    import_config = Confirm.ask(
        "Would you like to import your existing configuration?",
        default=True,
    )
    
    if not import_config:
        console.print("[yellow]Starting fresh setup...[/yellow]\n")
        return None
        
    try:
        with open(config_path) as f:
            existing_config: dict[str, Any] = json.load(f)
        console.print("[green]✓ Configuration loaded successfully[/green]\n")
        
        # Show summary
        console.print("[bold]Current Configuration:[/bold]")
        console.print(f"• Keywords: {', '.join(existing_config.get('keywords', []))}")
        console.print(f"• Locations: {', '.join(existing_config.get('locations', []))}")
        console.print(f"• Min Salary: ${existing_config.get('salary_min', 0):,}")
        db_type = existing_config.get('database', {}).get('type', 'sqlite')
        console.print(f"• Database: {db_type.upper()}")
        enabled_sources = [
            name for name, info in existing_config.get('job_sources', {}).items() 
            if info.get('enabled', False)
        ]
        console.print(f"• Job Sources: {', '.join(enabled_sources) if enabled_sources else 'None'}")
        slack_enabled = existing_config.get('slack', {}).get('enabled', False)
        console.print(f"• Slack: {'Enabled' if slack_enabled else 'Disabled'}\n")
        
        use_existing = Confirm.ask("Use this configuration?", default=True)
        if use_existing:
            return existing_config
        else:
            console.print("[yellow]Starting fresh setup...[/yellow]\n")
            return None
            
    except (json.JSONDecodeError, KeyError) as e:
        console.print(f"[red]✗ Error loading configuration: {e}[/red]")
        console.print("[yellow]Starting fresh setup...[/yellow]\n")
        return None


def run_wizard() -> None:
    """Run the interactive setup wizard."""
    welcome_screen()
    
    # Check for existing configuration
    existing_config = check_existing_config()
    
    if existing_config:
        # Ask which parts to reconfigure
        console.print("[bold]What would you like to update?[/bold]\n")
        reconfigure = {
            'keywords': Confirm.ask("Update keywords?", default=False),
            'locations': Confirm.ask("Update locations?", default=False),
            'salary': Confirm.ask("Update salary?", default=False),
            'database': Confirm.ask("Update database?", default=False),
            'sources': Confirm.ask("Update job sources?", default=False),
            'slack': Confirm.ask("Update Slack?", default=False),
        }
        console.print()
        
        # Use existing or reconfigure each section
        keywords = get_keywords() if reconfigure['keywords'] else existing_config.get('keywords', [])
        locations = get_locations() if reconfigure['locations'] else existing_config.get('locations', [])
        salary_min = get_salary_min() if reconfigure['salary'] else existing_config.get('salary_min', 0)
        database_config = configure_database() if reconfigure['database'] else existing_config.get('database', {})
        job_sources = configure_job_sources() if reconfigure['sources'] else existing_config.get('job_sources', {})
        slack_config = configure_slack() if reconfigure['slack'] else existing_config.get('slack', {})
    else:
        # Collect configuration from scratch
        keywords = get_keywords()
        locations = get_locations()
        salary_min = get_salary_min()
        database_config = configure_database()
        job_sources = configure_job_sources()
        slack_config = configure_slack()

    # Build full config
    config: dict[str, Any] = {
        "keywords": keywords,
        "locations": locations,
        "salary_min": salary_min,
        "denied_companies": [],
        "keywords_boost": keywords[:3],  # Use top 3 keywords as boost
        "database": database_config,
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

    # SQLite database URL is set in .env.example - no need to write to .env
    # Database file will be created automatically at data/jobs.sqlite

    # Offer to run first scrape
    if run_first_scrape():
        console.print("\n[cyan]Starting first job search...[/cyan]\n")
        subprocess.run([sys.executable, "-m", "jsa.cli", "run-once"], check=False)
        console.print("\n[bold green]Setup complete! 🎉[/bold green]")
    else:
        console.print("\n[bold green]Setup complete! 🎉[/bold green]")

    # Show next steps
    console.print(
        Panel.fit(
            "[bold]Next Steps:[/bold]\n\n"
            "1. [cyan]Run your first job search:[/cyan]\n"
            "   python -m jsa.cli run-once\n\n"
            "2. [cyan]Start the modern web UI:[/cyan]\n"
            "   python -m jsa.cli api\n"
            "   Then visit: http://localhost:5000\n\n"
            "3. [cyan]Check system health:[/cyan]\n"
            "   python -m jsa.cli health\n\n"
            "4. [cyan]View all commands:[/cyan]\n"
            "   python -m jsa.cli --help\n\n"
            "[bold]Documentation:[/bold]\n"
            "• Beginner Guide: docs/BEGINNER_GUIDE.md\n"
            "• Troubleshooting: docs/troubleshooting.md\n"
            "• All Docs: docs/DOCUMENTATION_INDEX.md",
            title="🎯 JobSentinel Ready!",
            border_style="green",
        )
    )
    console.print()


if __name__ == "__main__":
    run_wizard()
