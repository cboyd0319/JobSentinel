#!/usr/bin/env python3
"""
Database initialization script for JobSentinel.

This script ensures:
- data/ directory exists
- SQLite database is created
- All tables are initialized
- Proper file permissions (Windows-compatible)

Safe to run multiple times (idempotent).
"""

import asyncio
import os
import sys
from pathlib import Path


def ensure_data_directory() -> Path:
    """Ensure data directory exists with proper permissions."""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    
    if not data_dir.exists():
        print(f"Creating data directory: {data_dir}")
        data_dir.mkdir(parents=True, exist_ok=True)
        print("✓ Data directory created")
    else:
        print(f"✓ Data directory already exists: {data_dir}")
    
    return data_dir


def check_database_file(data_dir: Path) -> bool:
    """Check if database file exists."""
    db_file = data_dir / "jobs.sqlite"
    exists = db_file.exists()
    
    if exists:
        size_mb = db_file.stat().st_size / (1024 * 1024)
        print(f"✓ Database file exists: {db_file} ({size_mb:.2f} MB)")
    else:
        print(f"ℹ Database file will be created: {db_file}")
    
    return exists


async def initialize_database() -> None:
    """Initialize database tables."""
    try:
        # Add project root to Python path for imports
        project_root = Path(__file__).parent.parent
        sys.path.insert(0, str(project_root))
        
        # Import database module
        import src.database as db
        
        print("Initializing database tables...")
        await db.init_db()
        print("✓ Database tables initialized")
        
    except ImportError as e:
        print(f"✗ Failed to import database module: {e}")
        print("  Make sure dependencies are installed: pip install -e .")
        raise
    except Exception as e:
        print(f"✗ Failed to initialize database: {e}")
        raise


def verify_database() -> None:
    """Verify database is working."""
    try:
        import src.database as db
        from sqlmodel import select
        
        print("Verifying database connection...")
        
        # Try to query the database
        with db.get_sync_session() as session:
            statement = select(db.Job).limit(1)
            _ = session.exec(statement).first()
        
        print("✓ Database connection verified")
        
    except Exception as e:
        print(f"✗ Failed to verify database: {e}")
        raise


def print_database_info(data_dir: Path) -> None:
    """Print database location and information."""
    db_file = data_dir / "jobs.sqlite"
    
    print("\n" + "=" * 70)
    print("Database Information")
    print("=" * 70)
    print(f"Type:     SQLite (embedded, no server needed)")
    print(f"Location: {db_file.absolute()}")
    
    if db_file.exists():
        size_mb = db_file.stat().st_size / (1024 * 1024)
        print(f"Size:     {size_mb:.2f} MB")
    else:
        print(f"Size:     (not yet created)")
    
    print(f"\nBackup:   Copy '{db_file.name}' to safe location")
    print(f"Privacy:  100% local, no cloud, no telemetry")
    print("=" * 70)


async def main() -> int:
    """Main initialization flow."""
    print("")
    print("=" * 70)
    print("JobSentinel - Database Initialization")
    print("=" * 70)
    print("")
    
    try:
        # Step 1: Ensure data directory
        data_dir = ensure_data_directory()
        print("")
        
        # Step 2: Check database file
        db_exists = check_database_file(data_dir)
        print("")
        
        # Step 3: Initialize database
        await initialize_database()
        print("")
        
        # Step 4: Verify database
        verify_database()
        print("")
        
        # Step 5: Print info
        print_database_info(data_dir)
        print("")
        
        if db_exists:
            print("✓ Database was already initialized (no changes made)")
        else:
            print("✓ Database initialized successfully!")
        
        print("")
        return 0
        
    except Exception as e:
        print("")
        print("=" * 70)
        print("Database Initialization Failed")
        print("=" * 70)
        print(f"Error: {e}")
        print("")
        print("Troubleshooting:")
        print("  1. Ensure virtual environment is activated")
        print("  2. Install dependencies: pip install -e .")
        print("  3. Check file permissions in data/ directory")
        print("  4. See docs/WINDOWS_TROUBLESHOOTING.md")
        print("")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
