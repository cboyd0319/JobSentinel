"""
Windows Desktop Shortcut Creation

Creates user-friendly desktop shortcuts for JobSentinel on Windows 11+.
No admin rights required - creates shortcuts in user's Desktop folder.

Features:
- Creates .lnk files using Windows COM interface
- Supports custom icons
- Sets working directory automatically
- Handles paths with spaces and special characters
"""

import sys
from pathlib import Path
from typing import Optional


def create_desktop_shortcut(
    name: str,
    target: str,
    arguments: str = "",
    description: str = "",
    icon: str | None = None,
    working_dir: str | None = None,
) -> bool:
    """
    Create a Windows desktop shortcut (.lnk file).

    Args:
        name: Name of the shortcut (without .lnk extension)
        target: Path to the executable to run
        arguments: Command-line arguments to pass
        description: Description shown on hover
        icon: Path to icon file (.ico), or None for default
        working_dir: Working directory for the command

    Returns:
        True if shortcut created successfully, False otherwise
    """
    # Only works on Windows
    if sys.platform != "win32":
        return False

    try:
        import win32com.client

        # Get Desktop path
        desktop = Path.home() / "Desktop"
        shortcut_path = desktop / f"{name}.lnk"

        # Create shortcut using Windows COM
        shell = win32com.client.Dispatch("WScript.Shell")
        shortcut = shell.CreateShortcut(str(shortcut_path))

        shortcut.TargetPath = target
        shortcut.Arguments = arguments
        shortcut.Description = description
        shortcut.WorkingDirectory = working_dir or str(Path(target).parent)

        if icon:
            shortcut.IconLocation = icon

        shortcut.Save()
        return True

    except ImportError:
        # win32com not available - fall back to creating batch file
        return _create_batch_shortcut(name, target, arguments, working_dir)
    except Exception as e:
        print(f"Warning: Could not create shortcut '{name}': {e}")
        return False


def _create_batch_shortcut(
    name: str,
    target: str,
    arguments: str = "",
    working_dir: str | None = None,
) -> bool:
    """
    Fallback: Create a .bat file instead of .lnk when win32com unavailable.

    Args:
        name: Name of the shortcut (without .bat extension)
        target: Path to the executable to run
        arguments: Command-line arguments to pass
        working_dir: Working directory for the command

    Returns:
        True if batch file created successfully, False otherwise
    """
    try:
        desktop = Path.home() / "Desktop"
        batch_path = desktop / f"{name}.bat"

        # Build batch file content
        lines = [
            "@echo off",
            f"REM {name} - JobSentinel Launcher",
            "",
        ]

        if working_dir:
            # Change to working directory
            drive = Path(working_dir).drive
            if drive:
                lines.append(f"{drive}")
            lines.append(f'cd /d "{working_dir}"')
            lines.append("")

        # Run the command
        lines.append(f'"{target}" {arguments}')

        # Write batch file
        batch_path.write_text("\n".join(lines), encoding="utf-8")
        return True

    except Exception as e:
        print(f"Warning: Could not create batch file '{name}': {e}")
        return False


def create_jobsentinel_shortcuts(project_root: Path) -> dict[str, bool]:
    """
    Create all JobSentinel desktop shortcuts.

    Args:
        project_root: Path to JobSentinel project root

    Returns:
        Dictionary mapping shortcut names to success status
    """
    # Get Python executable path
    python_exe = sys.executable

    # Define shortcuts
    shortcuts = {
        "Run JobSentinel": {
            "target": python_exe,
            "arguments": "-m jsa.cli run-once",
            "description": "Run JobSentinel job search (one-time)",
            "working_dir": str(project_root),
        },
        "Configure JobSentinel": {
            "target": python_exe,
            "arguments": "-m jsa.cli setup",
            "description": "Configure JobSentinel preferences",
            "working_dir": str(project_root),
        },
        "JobSentinel Dashboard": {
            "target": python_exe,
            "arguments": "-m jsa.cli web",
            "description": "Open JobSentinel web dashboard",
            "working_dir": str(project_root),
        },
        "JobSentinel Health Check": {
            "target": python_exe,
            "arguments": "-m jsa.cli health",
            "description": "Check JobSentinel system health",
            "working_dir": str(project_root),
        },
    }

    # Create each shortcut
    results = {}
    for name, props in shortcuts.items():
        success = create_desktop_shortcut(
            name=name,
            target=props["target"],
            arguments=props["arguments"],
            description=props["description"],
            working_dir=props["working_dir"],
        )
        results[name] = success

    return results


def main():
    """CLI entry point for creating shortcuts."""
    # Find project root (go up from this file)
    project_root = Path(__file__).parent.parent.parent

    print("Creating JobSentinel desktop shortcuts...")
    print(f"Project root: {project_root}")
    print()

    results = create_jobsentinel_shortcuts(project_root)

    # Print results
    print("Results:")
    for name, success in results.items():
        status = "✓" if success else "✗"
        print(f"  {status} {name}")

    # Summary
    success_count = sum(1 for s in results.values() if s)
    total_count = len(results)

    print()
    if success_count == total_count:
        print(f"✅ All {total_count} shortcuts created successfully!")
    elif success_count > 0:
        print(f"⚠️  {success_count}/{total_count} shortcuts created")
    else:
        print("❌ No shortcuts created")
        print()
        print("Note: Shortcuts require Windows platform")
        print("On Windows, install pywin32: pip install pywin32")

    return 0 if success_count > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
