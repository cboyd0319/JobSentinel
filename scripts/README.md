# Scripts Directory

This directory contains utility scripts for development, deployment, and maintenance of JobSentinel.

## Available Scripts

### Dependabot Management

#### `approve_dependabot_prs.py`
Approve and merge all waiting Dependabot PRs.

**Usage:**
```bash
# Dry run (list PRs without making changes)
python scripts/approve_dependabot_prs.py --dry-run

# Approve and merge all Dependabot PRs
python scripts/approve_dependabot_prs.py

# Use a specific token
python scripts/approve_dependabot_prs.py --token "ghp_..."
```

**Requirements:**
- Python 3.11+
- GitHub CLI (`gh`) installed and authenticated
- GitHub token with `repo` and `pull-requests` permissions

**See Also:** [Dependabot Management Guide](../docs/DEPENDABOT_MANAGEMENT.md)

### Resume Analysis

#### `ats_cli.py`
ATS (Applicant Tracking System) scanner and resume analyzer.

**Usage:**
```bash
python scripts/ats_cli.py scan --resume examples/sample_resume.txt
```

#### `resume_ats_scanner.py`
Comprehensive ATS scanning with industry-specific analysis.

#### `resume_enhancer.py`
Enhance resumes for better ATS compatibility.

### Setup Wizards

#### `setup_wizard.py`
Interactive setup wizard for configuring JobSentinel.

#### `slack_setup.py`
Setup Slack webhook integration.

#### `zero_knowledge_setup.py`
Setup wizard for users with zero technical knowledge.

### Security

#### `security_scan.py`
Run security scans on the codebase.

**Usage:**
```bash
python scripts/security_scan.py
```

### Maintenance

#### `fix_deprecated_imports.py`
Fix deprecated import statements in the codebase.

#### `create_release_tag.sh`
Create a new release tag with proper versioning.

**Usage:**
```bash
./scripts/create_release_tag.sh v0.6.2
```

### Installation

#### `install.py`
Custom installation script with dependency checking.

## Development Guidelines

### Adding New Scripts

When adding a new script to this directory:

1. **Make it executable:** `chmod +x scripts/your_script.py`
2. **Add a shebang:** `#!/usr/bin/env python3` for Python scripts
3. **Include a docstring:** Describe what the script does and how to use it
4. **Add CLI help:** Use `argparse` for Python scripts with `--help` support
5. **Update this README:** Add your script to the appropriate section above
6. **Add tests:** Create tests in `tests/` if appropriate
7. **Document:** Add detailed docs to `docs/` for complex scripts

### Script Standards

- Use Python 3.11+ features
- Follow PEP 8 style guidelines
- Include error handling and helpful error messages
- Support `--dry-run` or `--verbose` flags where appropriate
- Use environment variables for sensitive data (never hardcode secrets)
- Exit with appropriate status codes (0 for success, non-zero for errors)

### Testing Scripts

```bash
# Python syntax check
python3 -m py_compile scripts/your_script.py

# Dry run (if supported)
python scripts/your_script.py --dry-run

# Full test
python scripts/your_script.py
```

## Common Patterns

### Argument Parsing

```python
import argparse

def main():
    parser = argparse.ArgumentParser(description="Script description")
    parser.add_argument("--dry-run", action="store_true", help="Dry run mode")
    args = parser.parse_args()
    
    if args.dry_run:
        print("Running in dry run mode...")
```

### Environment Variables

```python
import os

token = os.environ.get("GITHUB_TOKEN")
if not token:
    print("Error: GITHUB_TOKEN not set", file=sys.stderr)
    sys.exit(1)
```

### Exit Status

```python
import sys

def main():
    try:
        # Script logic
        return 0  # Success
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1  # Failure

if __name__ == "__main__":
    sys.exit(main())
```

## Troubleshooting

### Permission Denied

```bash
chmod +x scripts/your_script.py
```

### Python Module Not Found

```bash
# Install in development mode
make dev

# Or manually install dependencies
pip install -e .[dev,resume]
```

### GitHub CLI Not Found

```bash
# Install GitHub CLI
brew install gh  # macOS
# or see: https://cli.github.com/
```

## Related Documentation

- [Contributing Guide](../docs/governance/CONTRIBUTING.md)
- [Development Tools](../docs/development/)
- [Dependabot Management](../docs/DEPENDABOT_MANAGEMENT.md)
- [Security Policy](../docs/governance/SECURITY.md)
