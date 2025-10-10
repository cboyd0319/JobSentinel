#!/bin/bash
# Development Tools Setup Script
# Sets up local security scanning and pre-commit hooks

set -euo pipefail

echo "Setting up development security tools..."

# Install pre-commit if not already installed
if ! command -v pre-commit &> /dev/null; then
    echo "Installing pre-commit..."
    pip install pre-commit
fi

# Install development dependencies
echo "Installing security and development tools..."
pip install bandit flake8 black isort mypy yamllint codespell pylint autoflake radon pip-licenses semgrep

# Install pre-commit hooks
echo "Installing pre-commit hooks..."
pre-commit install

# Install CodeQL CLI (optional, for advanced users)
if command -v gh &> /dev/null; then
    echo "GitHub CLI detected. You can also install CodeQL CLI with:"
    echo "gh extension install github/gh-codeql"
fi

echo ""
echo "Development tools setup complete!"
echo ""
echo "Available commands:"
echo "=================="
echo "Security & Quality:"
echo "  scripts/precommit-security-scan.sh   # Pre-commit security scan (Bandit)"
echo "  pre-commit run --all-files           # All pre-commit checks"
echo ""
echo "Individual Tools:"
echo "  bandit -r . -x ./.venv               # Security vulnerabilities"
echo "  osv-scanner .                        # OSV vulnerability database"
echo "  semgrep --config=auto .              # Advanced security analysis"
echo "  flake8 --max-line-length=120         # Code quality & style"
echo "  pylint src/                          # Comprehensive code analysis"
echo "  mypy src/                            # Type checking"
echo "  black --check .                      # Code formatting check"
echo "  pip-licenses                         # License compliance"
echo ""
echo "Pre-commit Stages:"
echo "  git commit                           # Runs fast checks (basic security, formatting)"
echo "  pre-commit run --hook-stage manual   # Runs comprehensive security scan"
echo "  pre-commit run --hook-stage push     # Runs before git push"
echo ""
echo "Pre-commit hooks will now run automatically on git commit!"
echo "Reports will be saved as JSON files for detailed analysis"
