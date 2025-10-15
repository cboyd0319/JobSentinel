# Development Resources

This directory contains development tools, configurations, and build resources for JobSentinel.

## Contents

### Build & Automation
- **Makefile** - Development task automation (install, test, lint, format)
  - Run `make help` for all available commands
  - Common: `make dev`, `make test`, `make lint`

### Editor Configuration
- Recommended: enable format-on-save and lint-on-save in your editor

### Code Quality
- **.pre-commit-config.yaml** - Pre-commit hooks configuration
  - Install: `make precommit-install` (or `pre-commit install`)
  - Runs linters, formatters, and checks before commits
  - Enforces code quality standards automatically

## Quick Start

```bash
# Install development environment
make dev

# Install pre-commit hooks
make precommit-install

# Run tests
make test

# Run linters
make lint

# Format code
make fmt
```

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System design and structure
- [Contributing](../../CONTRIBUTING.md) - Contribution guidelines
- [Quickstart](../QUICKSTART.md) - Getting started guide
