#!/bin/bash
# Explicit setup for documentation linting tools.
# This syncs Vale packages and project dependencies. Set INSTALL_HOOKS=1 to
# install the optional repository hook.

set -e

echo "Setting up documentation linting tools..."

# Check for Vale installation
if ! command -v vale &> /dev/null; then
    echo ""
    echo "Vale is not installed. Install it first:"
    echo ""
    echo "  macOS:   brew install vale"
    echo "  Windows: choco install vale"
    echo "  Linux:   Download from https://github.com/errata-ai/vale/releases"
    echo ""
    exit 1
fi

echo "Vale found: $(vale --version)"

# Sync Vale packages
echo ""
echo "Downloading Vale style packages..."
cd "$(dirname "$0")/.."
vale sync

echo ""
echo "Vale styles synced"

# Install npm dependencies through the standard repository initializer
echo ""
echo "Installing npm dependencies..."
./init.sh

echo ""
echo "npm dependencies installed (including husky, lint-staged, markdownlint-cli)"

if [ "${INSTALL_HOOKS:-0}" = "1" ]; then
    echo ""
    echo "Installing the optional repository hook..."
    npx --no-install husky
fi

echo ""
echo "============================================"
echo "Setup complete."
echo ""
echo "Available commands:"
echo "  npm run lint:md      - Check Markdown formatting"
echo "  npm run lint:md:fix  - Fix Markdown issues"
echo "  npm run lint:prose   - Check writing style (docs)"
echo "  npm run lint:docs    - Run all documentation checks"
echo ""
if [ "${INSTALL_HOOKS:-0}" = "1" ]; then
    echo "Pre-commit hooks are active. Recovery bypass: HUSKY=0 git commit ..."
else
    echo "Pre-commit hooks were not installed. Set INSTALL_HOOKS=1 to opt in."
fi
echo "============================================"
