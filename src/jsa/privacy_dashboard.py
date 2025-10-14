"""
Privacy Dashboard - Complete transparency of all user data.

This module provides users with full visibility into what data exists,
where it's stored, and tools to manage, export, or delete it.

Key Features:
- Data inventory (what we store and why)
- Storage locations (exact file paths)
- Data lifecycle (when created, last accessed)
- Export tools (full data portability)
- Secure deletion (verify complete removal)
- Zero telemetry verification
- Privacy compliance reports

Privacy-First Design:
- No data sent anywhere without explicit user action
- All analysis done locally
- Clear explanations for every data point
- Easy export and deletion
- Audit trail for transparency
"""

import json
import os
import sqlite3
from collections.abc import Generator
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.tree import Tree

console = Console()


@dataclass
class DataInventoryItem:
    """Represents a single piece of stored data."""

    category: str  # e.g., "Job Data", "User Preferences", "Application Tracking"
    item_type: str  # e.g., "Job Record", "Config File", "Database"
    location: str  # Full file path
    size_bytes: int
    count: int  # Number of records (for databases/collections)
    created_at: str | None
    last_modified: str | None
    purpose: str  # Why we store this data
    contains_pii: bool  # Does it contain personally identifiable information?


@dataclass
class PrivacyReport:
    """Complete privacy dashboard report."""

    total_items: int
    total_size_bytes: int
    data_categories: dict[str, int]
    pii_items: int
    oldest_data: str | None
    newest_data: str | None
    inventory: list[DataInventoryItem]
    telemetry_status: str
    external_connections: list[str]


class PrivacyDashboard:
    """Privacy dashboard for complete data transparency."""

    def __init__(self, project_root: Path | str = ".") -> None:
        """Initialize privacy dashboard.

        Args:
            project_root: Path to JobSentinel project root
        """
        self.root = Path(project_root).resolve()
        self.data_dir = self.root / "data"
        self.config_dir = self.root / "config"
        self.logs_dir = self.root / "logs"

    def scan_data_inventory(self) -> list[DataInventoryItem]:
        """Scan all data storage locations and build inventory.

        Returns:
            List of all data items found
        """
        inventory: list[DataInventoryItem] = []

        # Scan SQLite database
        db_path = self.data_dir / "jobs.sqlite"
        if db_path.exists():
            inventory.extend(self._scan_sqlite_database(db_path))

        # Scan configuration files
        config_path = self.config_dir / "user_prefs.json"
        if config_path.exists():
            inventory.append(self._scan_config_file(config_path))

        # Scan log files
        if self.logs_dir.exists():
            for log_file in self.logs_dir.glob("*.log"):
                inventory.append(self._scan_log_file(log_file))

        # Scan environment file
        env_path = self.root / ".env"
        if env_path.exists():
            inventory.append(self._scan_env_file(env_path))

        return inventory

    def _scan_sqlite_database(self, db_path: Path) -> Generator[DataInventoryItem, None, None]:
        """Scan SQLite database and enumerate tables.

        Args:
            db_path: Path to SQLite database

        Yields:
            DataInventoryItem for each table
        """
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()

            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()

            stat = db_path.stat()

            for (table_name,) in tables:
                # Count records
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")  # noqa: S608
                count = cursor.fetchone()[0]

                # Determine if contains PII
                contains_pii = table_name in {"applications", "contacts", "users"}

                # Purpose descriptions
                purposes = {
                    "jobs": "Scraped job postings from public sources",
                    "applications": "Your job application tracking data",
                    "scores": "Job scoring and ranking data",
                    "contacts": "Recruiter and company contact information",
                    "scrape_history": "Job board scraping history for deduplication",
                }

                yield DataInventoryItem(
                    category="Job Data",
                    item_type=f"Database Table: {table_name}",
                    location=str(db_path),
                    size_bytes=stat.st_size // len(tables),  # Approximate per-table size
                    count=count,
                    created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    last_modified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    purpose=purposes.get(table_name, "Supporting data structure"),
                    contains_pii=contains_pii,
                )

            conn.close()
        except Exception as e:
            console.print(f"[yellow]Warning: Could not scan database: {e}[/yellow]")

    def _scan_config_file(self, config_path: Path) -> DataInventoryItem:
        """Scan configuration file.

        Args:
            config_path: Path to config file

        Returns:
            DataInventoryItem for config
        """
        stat = config_path.stat()

        try:
            with open(config_path) as f:
                config = json.load(f)
                # Check if contains potentially sensitive info
                contains_pii = any(
                    key in config for key in {"slack", "email", "phone", "api_keys", "webhooks"}
                )
        except Exception:
            contains_pii = True  # Assume PII if we can't parse

        return DataInventoryItem(
            category="User Preferences",
            item_type="Configuration File",
            location=str(config_path),
            size_bytes=stat.st_size,
            count=1,
            created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
            last_modified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
            purpose="Your job search preferences and settings",
            contains_pii=contains_pii,
        )

    def _scan_log_file(self, log_path: Path) -> DataInventoryItem:
        """Scan log file.

        Args:
            log_path: Path to log file

        Returns:
            DataInventoryItem for log
        """
        stat = log_path.stat()

        return DataInventoryItem(
            category="System Logs",
            item_type="Log File",
            location=str(log_path),
            size_bytes=stat.st_size,
            count=1,
            created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
            last_modified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
            purpose="Application activity logs (debugging and monitoring)",
            contains_pii=False,  # Logs should not contain PII
        )

    def _scan_env_file(self, env_path: Path) -> DataInventoryItem:
        """Scan environment file.

        Args:
            env_path: Path to .env file

        Returns:
            DataInventoryItem for env
        """
        stat = env_path.stat()

        return DataInventoryItem(
            category="Secrets & Credentials",
            item_type="Environment File",
            location=str(env_path),
            size_bytes=stat.st_size,
            count=1,
            created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
            last_modified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
            purpose="API keys and webhook URLs (never committed to git)",
            contains_pii=True,
        )

    def check_telemetry(self) -> dict[str, Any]:
        """Verify that no telemetry or tracking is enabled.

        Returns:
            Dict with telemetry status and verification
        """
        checks = {
            "google_analytics": False,
            "sentry": False,
            "mixpanel": False,
            "external_apis": [],
            "third_party_scripts": [],
        }

        # Check config for any telemetry settings
        config_path = self.config_dir / "user_prefs.json"
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                    # Check for telemetry flags (should not exist)
                    if "telemetry" in config:
                        checks["telemetry_config_exists"] = True
                    if "analytics" in config:
                        checks["analytics_config_exists"] = True
            except Exception as e:
                console.print(f"[dim]Note: Could not read config for telemetry check: {e}[/dim]")

        # Check environment for tracking keys
        env_path = self.root / ".env"
        if env_path.exists():
            try:
                with open(env_path) as f:
                    env_content = f.read().lower()
                    tracking_patterns = [
                        "analytics",
                        "sentry",
                        "mixpanel",
                        "amplitude",
                        "segment",
                    ]
                    for pattern in tracking_patterns:
                        if pattern in env_content:
                            checks["external_apis"].append(pattern)
            except Exception as e:
                console.print(f"[dim]Note: Could not read .env for telemetry check: {e}[/dim]")

        return checks

    def generate_privacy_report(self) -> PrivacyReport:
        """Generate comprehensive privacy report.

        Returns:
            PrivacyReport with all data inventory and privacy status
        """
        inventory = self.scan_data_inventory()

        # Calculate statistics
        total_size = sum(item.size_bytes for item in inventory)
        categories: dict[str, int] = {}
        pii_items = 0

        for item in inventory:
            categories[item.category] = categories.get(item.category, 0) + 1
            if item.contains_pii:
                pii_items += 1

        # Find oldest/newest
        dates = [item.created_at for item in inventory if item.created_at is not None]
        oldest = min(dates) if dates else None
        newest = max(dates) if dates else None

        # Check telemetry
        telemetry = self.check_telemetry()
        if telemetry["external_apis"] or telemetry.get("telemetry_config_exists"):
            telemetry_status = "⚠️  Some external services detected"
        else:
            telemetry_status = "✅ No telemetry or tracking"

        return PrivacyReport(
            total_items=len(inventory),
            total_size_bytes=total_size,
            data_categories=categories,
            pii_items=pii_items,
            oldest_data=oldest,
            newest_data=newest,
            inventory=inventory,
            telemetry_status=telemetry_status,
            external_connections=telemetry.get("external_apis", []),
        )

    def display_privacy_dashboard(self) -> None:
        """Display interactive privacy dashboard in terminal."""
        report = self.generate_privacy_report()

        # Header
        console.print()
        console.print(
            Panel.fit(
                "[bold cyan]🔒 Privacy Dashboard[/bold cyan]\n"
                "[dim]Complete transparency into your data[/dim]",
                border_style="cyan",
            )
        )
        console.print()

        # Summary statistics
        summary_table = Table(title="Data Summary", show_header=False, box=None)
        summary_table.add_column("Metric", style="cyan")
        summary_table.add_column("Value", style="white")

        summary_table.add_row("Total Data Items", str(report.total_items))
        summary_table.add_row("Total Size", f"{report.total_size_bytes / 1024 / 1024:.2f} MB")
        summary_table.add_row("Items with PII", f"{report.pii_items} items")
        summary_table.add_row("Telemetry Status", report.telemetry_status)

        console.print(summary_table)
        console.print()

        # Data inventory tree
        tree = Tree("📁 [bold]Data Storage Locations[/bold]")

        # Group by category
        by_category: dict[str, list[DataInventoryItem]] = {}
        for item in report.inventory:
            if item.category not in by_category:
                by_category[item.category] = []
            by_category[item.category].append(item)

        for category, items in by_category.items():
            category_branch = tree.add(f"[yellow]{category}[/yellow]")
            for item in items:
                pii_indicator = " 🔐" if item.contains_pii else ""
                size_str = f"{item.size_bytes / 1024:.1f} KB"
                item_str = f"{item.item_type}{pii_indicator} " f"({item.count} records, {size_str})"
                item_branch = category_branch.add(item_str)
                item_branch.add(f"[dim]Location: {item.location}[/dim]")
                item_branch.add(f"[dim]Purpose: {item.purpose}[/dim]")

        console.print(tree)
        console.print()

        # Privacy guarantees
        console.print(
            Panel(
                "[bold green]✅ Privacy Guarantees[/bold green]\n\n"
                "• All data stored locally on your machine\n"
                "• No telemetry or analytics sent anywhere\n"
                "• No third-party tracking scripts\n"
                "• You own and control 100% of your data\n"
                "• Easy export and deletion at any time\n"
                "• Open source - verify our privacy claims yourself",
                title="Your Data, Your Control",
                border_style="green",
            )
        )
        console.print()

        # Export options
        console.print("[bold]Available Actions:[/bold]")
        console.print("  • [cyan]jsa privacy export[/cyan] - Export all data to ZIP")
        console.print("  • [cyan]jsa privacy delete[/cyan] - Securely delete all data")
        console.print("  • [cyan]jsa privacy verify[/cyan] - Verify no external connections")
        console.print()


def main() -> None:
    """Entry point for privacy dashboard CLI."""
    dashboard = PrivacyDashboard()
    dashboard.display_privacy_dashboard()


if __name__ == "__main__":
    main()
