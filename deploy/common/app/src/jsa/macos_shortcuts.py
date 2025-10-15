"""
macOS Shortcut/Alias Creation

Creates user-friendly shortcuts for JobSentinel on macOS 15+.
No admin rights required - creates .command files in user's Desktop folder.

Features:
- Creates .command files (double-clickable shell scripts)
- Handles paths with spaces and special characters
- Sets executable permissions automatically
- Optional: Creates aliases in ~/bin or adds to Dock
"""

import os
import stat
import sys
from pathlib import Path


def create_command_file(
    name: str,
    command: str,
    description: str = "",
    working_dir: str | None = None,
) -> bool:
    """
    Create a macOS .command file (double-clickable shell script).

    Args:
        name: Name of the shortcut (without .command extension)
        command: Shell command to run
        description: Description shown in comments
        working_dir: Working directory for the command

    Returns:
        True if shortcut created successfully, False otherwise
    """
    # Only works on macOS
    if sys.platform != "darwin":
        return False

    try:
        # Get Desktop path
        desktop = Path.home() / "Desktop"
        command_path = desktop / f"{name}.command"

        # Build .command file content
        lines = [
            "#!/usr/bin/env bash",
            f"# {name} - JobSentinel",
            "",
        ]

        if description:
            lines.extend([f"# {description}", ""])

        # Change to working directory if specified
        if working_dir:
            lines.append(f"cd '{working_dir}' || exit 1")
            lines.append("")

        # Add the command
        lines.append(command)

        # Add pause so user can see output
        lines.append("")
        lines.append('echo ""')
        lines.append('read -p "Press Enter to close..."')

        # Write file
        command_path.write_text("\n".join(lines))

        # Make executable
        current_permissions = command_path.stat().st_mode
        command_path.chmod(current_permissions | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

        return True

    except Exception as e:
        print(f"Warning: Could not create command file '{name}': {e}")
        return False


def create_shell_alias(
    name: str,
    command: str,
    shell: str = "zsh",  # zsh is default on macOS 10.15+
) -> bool:
    """
    Create a shell alias in user's shell config file.

    Args:
        name: Alias name
        command: Command to alias
        shell: Shell type ('zsh' or 'bash')

    Returns:
        True if alias created successfully, False otherwise
    """
    # Only works on macOS
    if sys.platform != "darwin":
        return False

    try:
        # Determine config file
        if shell == "zsh":
            config_file = Path.home() / ".zshrc"
        elif shell == "bash":
            config_file = Path.home() / ".bash_profile"
        else:
            return False

        # Check if alias already exists
        if config_file.exists():
            content = config_file.read_text()
            if f"alias {name}=" in content:
                return True  # Already exists

        # Add alias
        alias_line = f'\nalias {name}="{command}"\n'

        with config_file.open("a") as f:
            f.write(alias_line)

        return True

    except Exception as e:
        print(f"Warning: Could not create shell alias '{name}': {e}")
        return False


def create_jobsentinel_shortcuts(project_root: Path) -> dict[str, bool]:
    """
    Create all JobSentinel shortcuts on macOS.

    Args:
        project_root: Path to JobSentinel project root

    Returns:
        Dictionary mapping shortcut names to success status
    """
    results = {}

    # Determine Python command (python3 is standard on macOS)
    python_cmd = "python3"
    if not os.path.exists("/usr/bin/python3"):
        python_cmd = "python"

    # Shortcut definitions
    shortcuts = {
        "Run JobSentinel": {
            "command": f"{python_cmd} -m jsa.cli run-once",
            "description": "Search for jobs and send alerts",
        },
        "JobSentinel Dashboard": {
            "command": f"{python_cmd} -m jsa.cli web",
            "description": "Open web dashboard in browser",
        },
        "Configure JobSentinel": {
            "command": f"{python_cmd} -m jsa.cli setup",
            "description": "Change job preferences and settings",
        },
        "JobSentinel Health Check": {
            "command": f"{python_cmd} -m jsa.cli health",
            "description": "Check system status and configuration",
        },
        "JobSentinel Dry Run": {
            "command": f"{python_cmd} -m jsa.cli run-once --dry-run",
            "description": "Test job search without sending alerts",
        },
    }

    # Create .command files on Desktop
    print("Creating desktop shortcuts...")
    for name, config in shortcuts.items():
        success = create_command_file(
            name=name,
            command=config["command"],
            description=config["description"],
            working_dir=str(project_root),
        )
        results[name] = success

        if success:
            print(f"   ✅ {name}.command")
        else:
            print(f"   ❌ {name}.command")

    # Optional: Create shell aliases
    print("\nCreating shell aliases...")
    aliases = {
        "jobsentinel-run": f"{python_cmd} -m jsa.cli run-once",
        "jobsentinel-web": f"{python_cmd} -m jsa.cli web",
        "jobsentinel-setup": f"{python_cmd} -m jsa.cli setup",
        "jobsentinel-health": f"{python_cmd} -m jsa.cli health",
    }

    for alias_name, alias_command in aliases.items():
        # Try zsh first (default on modern macOS)
        success = create_shell_alias(alias_name, alias_command, shell="zsh")
        if success:
            results[f"alias_{alias_name}"] = True
            print(f"   ✅ {alias_name} (zsh)")
        else:
            # Try bash as fallback
            success = create_shell_alias(alias_name, alias_command, shell="bash")
            results[f"alias_{alias_name}"] = success
            if success:
                print(f"   ✅ {alias_name} (bash)")
            else:
                print(f"   ⚠️  {alias_name} (could not create)")

    return results


def create_launcher_script(project_root: Path, script_name: str = "launch-gui.command") -> bool:
    """
    Create a launcher script for the GUI.

    Args:
        project_root: Path to JobSentinel project root
        script_name: Name of the launcher script

    Returns:
        True if launcher created successfully, False otherwise
    """
    try:
        launcher_path = project_root / script_name

        # Determine Python command
        python_cmd = "python3"
        if not os.path.exists("/usr/bin/python3"):
            python_cmd = "python"

        content = f"""#!/usr/bin/env bash
# JobSentinel GUI Launcher
# Double-click this file to launch the JobSentinel GUI

cd "{project_root}" || exit 1

echo "Launching JobSentinel GUI..."
echo ""

{python_cmd} launcher_gui.py

echo ""
echo "JobSentinel GUI closed."
read -p "Press Enter to close..."
"""

        launcher_path.write_text(content)

        # Make executable
        current_permissions = launcher_path.stat().st_mode
        launcher_path.chmod(current_permissions | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

        print(f"✅ Created {script_name}")
        return True

    except Exception as e:
        print(f"❌ Could not create launcher script: {e}")
        return False


def main():
    """CLI entry point for shortcut creation."""

    # Get project root: this file is in deploy/common/app/src/jsa/
    # So we need to go up 5 levels to reach the repository root
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent.parent.parent.parent

    print()
    print("JobSentinel macOS Shortcut Creator")
    print()
    print(f"Project root: {project_root}")
    print()

    # Create shortcuts
    results = create_jobsentinel_shortcuts(project_root)

    # Create launcher
    create_launcher_script(project_root)

    # Summary
    print()
    success_count = sum(1 for v in results.values() if v)
    total_count = len(results)

    if success_count == total_count:
        print(f"✅ All {total_count} shortcuts created successfully!")
    elif success_count > 0:
        print(f"⚠️  Created {success_count}/{total_count} shortcuts")
    else:
        print("❌ Could not create any shortcuts")

    print()
    print("Desktop shortcuts: ~/Desktop/*.command")
    print("Shell aliases: Check ~/.zshrc or ~/.bash_profile")
    print("GUI launcher: launch-gui.command")
    print()

    return 0 if success_count > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
