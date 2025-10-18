"""Watch mode for real-time job alerts using RipGrep and entr.

This module provides RipGrep-powered file watching for real-time job monitoring.
Requires both RipGrep and entr to be installed for full functionality.
"""

from __future__ import annotations

import shutil
import subprocess
import sys


def watch_for_new_jobs(jobs_dir: str, callback_script: str | None = None) -> None:
    """Use ripgrep + entr to watch for new job files.

    Args:
        jobs_dir: Directory to watch for new job files
        callback_script: Optional script to run when new files are detected

    Raises:
        SystemExit: If required tools are not installed
    """
    # Check if entr is available
    if not shutil.which("entr"):
        print("Error: 'entr' not installed. Install with:")
        print("  # macOS")
        print("  brew install entr")
        print("")
        print("  # Linux")
        print("  apt install entr  # Debian/Ubuntu")
        print("  yum install entr  # RHEL/CentOS")
        sys.exit(1)

    # Check if ripgrep is available
    if not shutil.which("rg"):
        print("Error: 'rg' (ripgrep) not installed. Install with:")
        print("  # macOS")
        print("  brew install ripgrep")
        print("")
        print("  # Linux")
        print("  apt install ripgrep  # Debian/Ubuntu")
        print("  yum install ripgrep  # RHEL/CentOS")
        sys.exit(1)

    # Start watching
    print(f"Watching {jobs_dir} for new jobs...")

    try:
        # List all JSON files and pipe to entr
        list_files = subprocess.Popen(
            ["rg", "--files", "--type", "json", jobs_dir], stdout=subprocess.PIPE
        )

        # Default callback if none provided
        if callback_script is None:
            callback_script = "python -m jsa.cli health --verbose"

        # Use entr to watch for changes
        subprocess.run(
            ["entr", "-p", *callback_script.split()], stdin=list_files.stdout, check=True
        )

    except KeyboardInterrupt:
        print("\nStopping watch mode...")
    except subprocess.CalledProcessError as e:
        print(f"Error: Watch mode failed: {e}")
        sys.exit(1)
