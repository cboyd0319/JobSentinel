#!/bin/bash
# Setup script for documentation linting tools
# Run this after cloning the repo: ./scripts/setup-docs-linting.sh

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

echo "✓ Vale found: $(vale --version)"

# Sync Vale packages
echo ""
echo "Downloading Vale style packages..."
cd "$(dirname "$0")/.."
vale sync

echo ""
echo "✓ Vale styles synced"

# Install npm dependencies
echo ""
echo "Installing npm dependencies..."
npm install

echo ""
echo "✓ npm dependencies installed (including husky, lint-staged, markdownlint-cli2)"

# Set up husky
echo ""
echo "Setting up git hooks..."
npx husky

echo ""
echo "============================================"
echo "✓ Setup complete!"
echo ""
echo "Available commands:"
echo "  npm run lint:md      - Check Markdown formatting"
echo "  npm run lint:md:fix  - Fix Markdown issues"
echo "  npm run lint:prose   - Check writing style (docs)"
echo "  npm run lint:docs    - Run all documentation checks"
echo ""
echo "Pre-commit hooks are now active."
echo "============================================"
