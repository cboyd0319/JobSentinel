"""
Enhanced error formatting with actionable suggestions.

Provides user-friendly error messages with context and next steps.
"""

from pathlib import Path
from typing import Any


class ErrorFormatter:
    """Format errors with helpful context and suggestions."""

    @staticmethod
    def format_config_error(error_msg: str, config_path: str | Path) -> str:
        """
        Format configuration validation errors with suggestions.

        Args:
            error_msg: Original error message
            config_path: Path to configuration file

        Returns:
            Formatted error message with suggestions
        """
        config_path = Path(config_path)
        example_path = config_path.parent / "user_prefs.example.json"

        lines = [
            "❌ Configuration Error",
            "",
            f"   {error_msg}",
            "",
            "📝 How to fix:",
        ]

        # Specific error patterns
        if "keywords_boost" in error_msg.lower():
            lines.extend(
                [
                    "   Add 'keywords_boost' to your config file:",
                    '   "keywords_boost": ["python", "backend", "remote"]',
                    "",
                ]
            )
        elif "missing" in error_msg.lower() or "required" in error_msg.lower():
            lines.extend(
                [
                    f"   1. Check the example config: {example_path}",
                    f"   2. Compare with your config: {config_path}",
                    "   3. Add any missing required fields",
                    "",
                ]
            )
        elif "invalid json" in error_msg.lower():
            lines.extend(
                [
                    "   Your config file has invalid JSON syntax.",
                    "   Common issues:",
                    "     • Missing comma between fields",
                    "     • Trailing comma after last item",
                    "     • Unescaped quotes in strings",
                    "",
                    "   Validate your JSON at: https://jsonlint.com",
                    "",
                ]
            )

        # General help
        lines.extend(
            [
                "📚 Resources:",
                f"   • Example config: {example_path}",
                "   • Documentation: docs/quickstart.md",
                "   • Run setup wizard: python -m jsa.cli setup",
                "",
            ]
        )

        return "\n".join(lines)

    @staticmethod
    def format_install_error(error_msg: str, missing_package: str | None = None) -> str:
        """
        Format installation errors with fix instructions.

        Args:
            error_msg: Original error message
            missing_package: Name of missing package (if known)

        Returns:
            Formatted error message with install commands
        """
        lines = [
            "❌ Installation Error",
            "",
            f"   {error_msg}",
            "",
        ]

        if missing_package:
            lines.extend(
                [
                    "📦 To fix, install the missing package:",
                    "",
                    f"   pip install {missing_package}",
                    "",
                ]
            )

        if "playwright" in error_msg.lower():
            lines.extend(
                [
                    "🎭 Playwright requires additional setup:",
                    "",
                    "   1. Install Playwright: pip install playwright",
                    "   2. Install browser: playwright install chromium",
                    "",
                ]
            )
        elif "no module named" in error_msg.lower():
            lines.extend(
                [
                    "💡 Common causes:",
                    "   • Virtual environment not activated",
                    "   • Package not installed in editable mode",
                    "",
                    "🔧 To fix:",
                    "   1. Activate venv: source .venv/bin/activate",
                    "   2. Install package: pip install -e .",
                    "",
                ]
            )

        return "\n".join(lines)

    @staticmethod
    def format_slack_error(error_msg: str, webhook_url: str | None = None) -> str:
        """
        Format Slack webhook errors with troubleshooting steps.

        Args:
            error_msg: Original error message
            webhook_url: Webhook URL (if available)

        Returns:
            Formatted error message with troubleshooting
        """
        lines = [
            "❌ Slack Notification Error",
            "",
            f"   {error_msg}",
            "",
            "🔧 Troubleshooting:",
        ]

        if "401" in error_msg or "403" in error_msg or "invalid" in error_msg.lower():
            lines.extend(
                [
                    "   Your webhook URL appears to be invalid.",
                    "",
                    "   To get a valid webhook:",
                    "   1. Go to https://api.slack.com/apps",
                    "   2. Create a new app or select existing",
                    "   3. Enable 'Incoming Webhooks'",
                    "   4. Add webhook to workspace",
                    "   5. Copy the webhook URL (starts with https://hooks.slack.com/)",
                    "",
                ]
            )
        elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
            lines.extend(
                [
                    "   Network connection issue.",
                    "",
                    "   Check:",
                    "   • Internet connection is working",
                    "   • No firewall blocking outbound HTTPS",
                    "   • Slack is not down (check status.slack.com)",
                    "",
                ]
            )

        lines.extend(
            [
                "🧪 Test your webhook:",
                "   curl -X POST -H 'Content-type: application/json' \\",
                '     --data \'{"text":"Test from JobSentinel"}\' \\',
            ]
        )

        if webhook_url and len(webhook_url) > 20:
            # Show partial URL for security
            lines.append(f"     {webhook_url[:40]}...")
        else:
            lines.append("     YOUR_WEBHOOK_URL")

        lines.extend(["", ""])

        return "\n".join(lines)

    @staticmethod
    def format_scraper_error(error_msg: str, source: str, url: str | None = None) -> str:
        """
        Format scraper errors with source-specific advice.

        Args:
            error_msg: Original error message
            source: Name of the job source
            url: URL that failed (if applicable)

        Returns:
            Formatted error message with suggestions
        """
        lines = [
            f"❌ Scraper Error ({source})",
            "",
            f"   {error_msg}",
            "",
        ]

        if url:
            lines.extend([f"   URL: {url}", ""])

        if "rate limit" in error_msg.lower():
            lines.extend(
                [
                    "⏱️  Rate Limit Hit",
                    "",
                    "   The job board is limiting requests.",
                    "",
                    "   Solutions:",
                    "   • Wait 5-10 minutes before retrying",
                    "   • Reduce scraping frequency in config",
                    "   • Check if API key is required",
                    "",
                ]
            )
        elif "robots.txt" in error_msg.lower():
            lines.extend(
                [
                    "🤖 robots.txt Restriction",
                    "",
                    f"   {source} blocks automated access via robots.txt",
                    "",
                    "   JobSentinel respects robots.txt by design.",
                    f"   Consider using {source}'s official API if available.",
                    "",
                ]
            )
        elif "403" in error_msg or "401" in error_msg:
            lines.extend(
                [
                    "🔐 Authentication Required",
                    "",
                    "   This source may require:",
                    "   • API key",
                    "   • User authentication",
                    "   • Request headers",
                    "",
                    f"   Check {source} documentation for API access.",
                    "",
                ]
            )

        return "\n".join(lines)

    @staticmethod
    def format_database_error(error_msg: str) -> str:
        """
        Format database errors with recovery steps.

        Args:
            error_msg: Original error message

        Returns:
            Formatted error message with recovery steps
        """
        lines = [
            "❌ Database Error",
            "",
            f"   {error_msg}",
            "",
            "🔧 Recovery steps:",
        ]

        if "locked" in error_msg.lower():
            lines.extend(
                [
                    "   Database file is locked (another process using it).",
                    "",
                    "   1. Check for other JobSentinel processes",
                    "   2. Wait a moment and try again",
                    "   3. If persistent, restart your system",
                    "",
                ]
            )
        elif "corrupt" in error_msg.lower():
            lines.extend(
                [
                    "   Database file may be corrupted.",
                    "",
                    "   1. Backup: cp data/jobs.db data/jobs.db.backup",
                    "   2. Try repair: sqlite3 data/jobs.db 'PRAGMA integrity_check'",
                    "   3. If repair fails, restore from backup",
                    "",
                ]
            )
        else:
            lines.extend(
                [
                    "   1. Check file permissions on data/ directory",
                    "   2. Ensure enough disk space",
                    "   3. Try running: python -m jsa.cli health",
                    "",
                ]
            )

        return "\n".join(lines)
