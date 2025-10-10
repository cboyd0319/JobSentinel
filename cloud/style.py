"""
Presentation tokens for cloud bootstrap CLI.

Calm, premium, understated aesthetic with minimal color palette.
"""

# Color palette (HEX for docs, rich color names for terminal)
PALETTE = {
    "primary": "#4C8BF5",      # Calm blue
    "accent": "#22C55E",        # Success green
    "warn": "#F59E0B",          # Warning amber
    "error": "#EF4444",         # Error red
    "text": "#E5E7EB",          # Light gray text
    "muted": "#9CA3AF",         # Muted gray
}

# Rich-compatible color names
RICH_COLORS = {
    "primary": "dodger_blue2",
    "accent": "green",
    "warn": "yellow",
    "error": "red",
    "text": "white",
    "muted": "bright_black",
}

# Unicode symbols (terminal-safe)
SYMBOL = {
    "ok": "✓",
    "fail": "✗",
    "arrow": "→",
    "dot": "•",
    "warn": "⚠",
    "info": "ℹ",
}

# Layout constants
WIDTH = 80
PADDING = 2

# ASCII wordmark (small version)
WORDMARK_SMALL = """
╔══════════════════════════════════════════════╗
║      Job Scraper Cloud Bootstrap v{version}      ║
║         Terraform-First Architecture         ║
╚══════════════════════════════════════════════╝
"""

# Brand name
APP_NAME = "Job Scraper Cloud Bootstrap"
