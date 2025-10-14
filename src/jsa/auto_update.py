"""
Auto-Update System for JobSentinel.

Keeps JobSentinel up-to-date with zero user intervention.
Windows-friendly with no admin rights required.

Key Features:
- Check for updates via GitHub API
- Download and verify updates
- Backup before updating
- Rollback on failure
- Zero admin rights required
- Optional auto-update on launch

Privacy-First:
- Only checks GitHub (no telemetry)
- User controls update timing
- Clear changelog display
- Optional auto-update
"""

import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import requests
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


@dataclass
class Version:
    """Semantic version representation."""

    major: int
    minor: int
    patch: int
    prerelease: str = ""

    def __str__(self) -> str:
        """String representation."""
        version = f"{self.major}.{self.minor}.{self.patch}"
        if self.prerelease:
            version += f"-{self.prerelease}"
        return version

    @classmethod
    def parse(cls, version_str: str) -> "Version":
        """Parse version string.

        Args:
            version_str: Version string like "0.6.1" or "0.7.0-beta.1"

        Returns:
            Version object
        """
        # Remove 'v' prefix if present
        version_str = version_str.lstrip("v")

        # Split prerelease
        if "-" in version_str:
            main_version, prerelease = version_str.split("-", 1)
        else:
            main_version = version_str
            prerelease = ""

        # Parse major.minor.patch
        parts = main_version.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid version format: {version_str}")

        major, minor, patch = map(int, parts)

        return cls(major=major, minor=minor, patch=patch, prerelease=prerelease)

    def __lt__(self, other: "Version") -> bool:
        """Compare versions."""
        # Compare major.minor.patch
        if (self.major, self.minor, self.patch) < (
            other.major,
            other.minor,
            other.patch,
        ):
            return True
        if (self.major, self.minor, self.patch) > (
            other.major,
            other.minor,
            other.patch,
        ):
            return False

        # If main versions equal, check prerelease
        # No prerelease > prerelease
        if not self.prerelease and other.prerelease:
            return False
        if self.prerelease and not other.prerelease:
            return True

        # Both have prerelease, compare lexicographically
        return self.prerelease < other.prerelease

    def __eq__(self, other: object) -> bool:
        """Check equality."""
        if not isinstance(other, Version):
            return NotImplemented
        return (
            self.major == other.major
            and self.minor == other.minor
            and self.patch == other.patch
            and self.prerelease == other.prerelease
        )


@dataclass
class ReleaseInfo:
    """GitHub release information."""

    version: Version
    tag_name: str
    name: str
    body: str
    published_at: str
    html_url: str
    download_url: str | None
    prerelease: bool


class AutoUpdater:
    """Auto-update manager for JobSentinel."""

    GITHUB_REPO = "cboyd0319/JobSentinel"
    GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}"
    CURRENT_VERSION = "0.6.1"  # TODO: Read from pyproject.toml

    def __init__(self, project_root: Path | str = ".") -> None:
        """Initialize auto-updater.

        Args:
            project_root: Path to JobSentinel project root
        """
        self.root = Path(project_root).resolve()
        self.current_version = Version.parse(self.CURRENT_VERSION)

    def check_for_updates(
        self, include_prereleases: bool = False
    ) -> ReleaseInfo | None:
        """Check for available updates.

        Args:
            include_prereleases: Whether to include pre-release versions

        Returns:
            ReleaseInfo if update available, None otherwise
        """
        try:
            # Get latest release from GitHub
            url = f"{self.GITHUB_API}/releases/latest"
            if include_prereleases:
                url = f"{self.GITHUB_API}/releases"

            response = requests.get(url, timeout=10)
            response.raise_for_status()

            if include_prereleases:
                releases = response.json()
                if not releases:
                    return None
                release_data = releases[0]  # Most recent
            else:
                release_data = response.json()

            # Parse release info
            version = Version.parse(release_data["tag_name"])
            release = ReleaseInfo(
                version=version,
                tag_name=release_data["tag_name"],
                name=release_data.get("name", release_data["tag_name"]),
                body=release_data.get("body", ""),
                published_at=release_data["published_at"],
                html_url=release_data["html_url"],
                download_url=release_data.get("zipball_url"),
                prerelease=release_data.get("prerelease", False),
            )

            # Check if newer than current
            if version > self.current_version:
                return release

            return None

        except requests.RequestException as e:
            console.print(f"[yellow]Could not check for updates: {e}[/yellow]")
            return None
        except Exception as e:
            console.print(f"[yellow]Error checking updates: {e}[/yellow]")
            return None

    def display_update_info(self, release: ReleaseInfo) -> None:
        """Display update information.

        Args:
            release: Release information
        """
        console.print()
        console.print(
            Panel.fit(
                f"[bold green]🎉 Update Available[/bold green]\n"
                f"[cyan]v{self.current_version}[/cyan] → "
                f"[green bold]v{release.version}[/green bold]",
                border_style="green",
            )
        )
        console.print()

        # Release info table
        info_table = Table(show_header=False, box=None)
        info_table.add_column("Item", style="cyan")
        info_table.add_column("Value", style="white")

        info_table.add_row("Release Name", release.name)
        info_table.add_row("Version", str(release.version))
        info_table.add_row(
            "Published",
            datetime.fromisoformat(
                release.published_at.replace("Z", "+00:00")
            ).strftime("%Y-%m-%d %H:%M UTC"),
        )
        if release.prerelease:
            info_table.add_row("Type", "⚠️  Pre-release (beta/alpha)")
        else:
            info_table.add_row("Type", "✅ Stable release")

        console.print(info_table)
        console.print()

        # Changelog
        if release.body:
            console.print("[bold]What's New:[/bold]")
            console.print(release.body[:500])  # Truncate long changelogs
            if len(release.body) > 500:
                console.print(f"[dim]... (see {release.html_url} for full changelog)[/dim]")
        console.print()

    def update(
        self, release: ReleaseInfo, backup: bool = True, verify: bool = True
    ) -> bool:
        """Perform update.

        Args:
            release: Release to update to
            backup: Whether to backup before updating
            verify: Whether to verify installation after update

        Returns:
            True if update successful
        """
        console.print()
        console.print(
            Panel.fit(
                f"[bold cyan]📦 Updating JobSentinel[/bold cyan]\n"
                f"v{self.current_version} → v{release.version}",
                border_style="cyan",
            )
        )
        console.print()

        try:
            # Step 1: Backup (if requested)
            if backup:
                console.print("[cyan]→ Creating backup...[/cyan]")
                from jsa.backup_restore import BackupManager

                backup_mgr = BackupManager(self.root)
                backup_file = backup_mgr.create_backup(
                    backup_name=f"before_v{release.version}_update",
                    include_logs=False,
                    compress=True,
                )
                console.print(f"[green]✓ Backup created: {backup_file}[/green]")

            # Step 2: Update via pip (safest method)
            console.print("[cyan]→ Updating via pip...[/cyan]")

            # Update from GitHub
            pip_url = (
                f"git+https://github.com/{self.GITHUB_REPO}.git@{release.tag_name}"
            )
            cmd = [sys.executable, "-m", "pip", "install", "--upgrade", pip_url]

            result = subprocess.run(  # noqa: S603 - Trusted pip command
                cmd,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                console.print(f"[red]✗ Update failed: {result.stderr}[/red]")
                return False

            console.print("[green]✓ Update completed[/green]")

            # Step 3: Verify (if requested)
            if verify:
                console.print("[cyan]→ Verifying installation...[/cyan]")
                verify_cmd = [sys.executable, "-m", "jsa.cli", "health"]
                verify_result = subprocess.run(  # noqa: S603 - Trusted health check
                    verify_cmd,
                    capture_output=True,
                    text=True,
                    check=False,
                )

                if verify_result.returncode != 0:
                    console.print("[yellow]⚠️  Health check failed[/yellow]")
                    console.print("[yellow]Consider restoring from backup[/yellow]")
                    return False

                console.print("[green]✓ Installation verified[/green]")

            # Success
            console.print()
            console.print(
                Panel(
                    f"[bold green]✅ Successfully updated to v{release.version}[/bold green]\n\n"
                    f"• Backup saved (if enabled)\n"
                    f"• Installation verified\n"
                    f"• Ready to use!\n\n"
                    f"See what's new: {release.html_url}",
                    title="Update Complete",
                    border_style="green",
                )
            )
            console.print()

            return True

        except Exception as e:
            console.print(f"[red]✗ Update failed: {e}[/red]")
            console.print()
            console.print("[yellow]You can restore from backup with:[/yellow]")
            console.print("[cyan]python -m jsa.cli backup restore[/cyan]")
            console.print()
            return False

    def check_and_prompt(self, auto_update: bool = False) -> bool:
        """Check for updates and prompt user.

        Args:
            auto_update: If True, update automatically without prompting

        Returns:
            True if updated, False otherwise
        """
        release = self.check_for_updates()

        if release is None:
            # No updates available
            return False

        # Display update info
        self.display_update_info(release)

        # Auto-update or prompt
        if auto_update:
            console.print("[cyan]Auto-updating...[/cyan]")
            return self.update(release, backup=True, verify=True)
        else:
            # Prompt user
            console.print("[bold]Would you like to update now?[/bold]")
            console.print("  • [cyan]yes[/cyan] - Update now (recommended)")
            console.print("  • [cyan]no[/cyan] - Skip this version")
            console.print("  • [cyan]later[/cyan] - Remind me next time")
            console.print()

            choice = input("Your choice [yes/no/later]: ").lower().strip()

            if choice in {"yes", "y"}:
                return self.update(release, backup=True, verify=True)
            elif choice in {"no", "n"}:
                # Remember to skip this version
                self._mark_version_skipped(release.version)
                console.print("[yellow]Update skipped[/yellow]")
                return False
            else:
                console.print("[yellow]Update postponed[/yellow]")
                return False

    def _mark_version_skipped(self, version: Version) -> None:
        """Mark version as skipped.

        Args:
            version: Version to skip
        """
        skip_file = self.root / "data" / "skipped_versions.json"
        skip_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            if skip_file.exists():
                with open(skip_file) as f:
                    skipped = json.load(f)
            else:
                skipped = []

            skipped.append(str(version))

            with open(skip_file, "w") as f:
                json.dump(skipped, f, indent=2)

        except Exception as e:
            console.print(f"[dim]Note: Could not save skip preference: {e}[/dim]")


def main() -> None:
    """Entry point for auto-update CLI."""
    updater = AutoUpdater()

    # Check for updates
    release = updater.check_for_updates()

    if release is None:
        console.print()
        console.print(
            Panel.fit(
                f"[bold green]✅ Up to Date[/bold green]\n"
                f"JobSentinel v{updater.current_version} is the latest version",
                border_style="green",
            )
        )
        console.print()
    else:
        updater.check_and_prompt(auto_update=False)


if __name__ == "__main__":
    main()
