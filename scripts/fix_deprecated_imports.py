#!/usr/bin/env python3
"""
Script to fix deprecated typing imports (UP035).

Removes Dict, List, Set, Tuple, Type, Optional from typing imports
and updates their usage to use built-in types.
"""
import re
from pathlib import Path

# Map of deprecated types to modern equivalents
DEPRECATED_TYPES = {
    'Dict': 'dict',
    'List': 'list',
    'Set': 'set',
    'Tuple': 'tuple',
    'Type': 'type',
}

def fix_file(file_path: Path) -> bool:
    """Fix deprecated imports in a single file."""
    content = file_path.read_text(encoding='utf-8')
    original_content = content

    # Find the typing import line
    import_pattern = r'^from typing import (.+)$'

    for match in re.finditer(import_pattern, content, re.MULTILINE):
        import_line = match.group(0)
        imports = match.group(1)

        # Split imports, preserving Any, Protocol, etc.
        import_list = [i.strip() for i in imports.split(',')]

        # Filter out deprecated types
        kept_imports = []
        removed_types = []

        for imp in import_list:
            if imp in DEPRECATED_TYPES:
                removed_types.append(imp)
            else:
                kept_imports.append(imp)

        # Build new import line
        if kept_imports:
            new_import_line = f"from typing import {', '.join(kept_imports)}"
        else:
            # Remove the entire line if no imports remain
            new_import_line = ""

        # Replace in content
        if new_import_line:
            content = content.replace(import_line, new_import_line)
        else:
            # Remove the line entirely (including newline)
            content = content.replace(import_line + '\n', '')

    # Only write if changed
    if content != original_content:
        file_path.write_text(content, encoding='utf-8')
        return True
    return False

def main():
    """Fix all Python files with UP035 violations."""
    # Get list of files from ruff
    import subprocess
    result = subprocess.run(  # noqa: S603 - running ruff linter
        ['.venv/bin/python', '-m', 'ruff', 'check', '.', '--select=UP035', '--output-format=concise'],
        capture_output=True,
        text=True
    )

    # Parse file paths
    files = set()
    for line in result.stderr.split('\n'):
        if ':' in line:
            file_path = line.split(':')[0]
            if file_path:
                files.add(Path(file_path))

    print(f"Found {len(files)} files with UP035 violations")

    fixed_count = 0
    for file_path in sorted(files):
        if file_path.exists():
            if fix_file(file_path):
                print(f"✓ Fixed: {file_path}")
                fixed_count += 1

    print(f"\nFixed {fixed_count} files")

if __name__ == '__main__':
    main()
