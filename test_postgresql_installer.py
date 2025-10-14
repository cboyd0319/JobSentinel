#!/usr/bin/env python3
"""
Test script for PostgreSQL installer.

This script tests the automated PostgreSQL installation on macOS.
It will:
1. Check if PostgreSQL is already installed
2. Install PostgreSQL if not present
3. Set up the jobsentinel database
4. Verify the installation
5. Save connection details to .env

Usage:
    python test_postgresql_installer.py
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from rich.console import Console
from jsa.postgresql_installer import install_postgresql_automated

console = Console()


def main():
    """Run the PostgreSQL installer test."""
    console.print("\n[bold cyan]Testing PostgreSQL Installer[/bold cyan]\n")
    console.print("[yellow]⚠️  This will install PostgreSQL on your system if not present[/yellow]")
    console.print("[yellow]⚠️  Press Ctrl+C to cancel within 5 seconds...[/yellow]\n")
    
    import time
    for i in range(5, 0, -1):
        console.print(f"Starting in {i}...", end="\r")
        time.sleep(1)
    
    console.print("\n[cyan]Starting installation...[/cyan]\n")
    
    success, db_url = install_postgresql_automated()
    
    if success:
        console.print("\n[bold green]✅ PostgreSQL installer test PASSED[/bold green]")
        console.print(f"[green]Database URL: {db_url}[/green]")
        
        # Check if .env was created
        env_path = Path(".env")
        if env_path.exists():
            console.print(f"[green]✓ .env file created at {env_path}[/green]")
        else:
            console.print("[yellow]⚠️  .env file not found[/yellow]")
        
        return 0
    else:
        console.print("\n[bold red]❌ PostgreSQL installer test FAILED[/bold red]")
        return 1


if __name__ == "__main__":
    sys.exit(main())
