#!/usr/bin/env bash
# Script to help maintainers create and push release tags following semantic versioning
# Usage: ./scripts/create_release_tag.sh <version> [description]
# Example: ./scripts/create_release_tag.sh 0.7.0 "LinkedIn scraper and email digest support"

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Version number required"
    echo "Usage: $0 <version> [description]"
    echo "Example: $0 0.7.0 'LinkedIn scraper and email digest support'"
    exit 1
fi

VERSION="$1"
DESCRIPTION="${2:-Release version $VERSION}"

# Validate semantic versioning format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Error: Version must follow semantic versioning format (X.Y.Z)"
    echo "Example: 0.7.0, 1.0.0, 1.2.3"
    exit 1
fi

TAG="v$VERSION"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "❌ Error: Tag $TAG already exists"
    echo "To delete and recreate: git tag -d $TAG"
    exit 1
fi

# Verify pyproject.toml version matches
PYPROJECT_VERSION=$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml', 'rb'))['project']['version'])")
if [ "$VERSION" != "$PYPROJECT_VERSION" ]; then
    echo "⚠️  Warning: Tag version ($VERSION) does not match pyproject.toml ($PYPROJECT_VERSION)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create annotated tag
echo "📝 Creating annotated tag: $TAG"
git tag -a "$TAG" -m "$DESCRIPTION"

echo "✅ Tag $TAG created successfully"
echo ""
echo "Next steps:"
echo "1. Push the tag to GitHub:"
echo "   git push origin $TAG"
echo ""
echo "2. Create a GitHub Release:"
echo "   - Go to: https://github.com/cboyd0319/JobSentinel/releases/new"
echo "   - Select tag: $TAG"
echo "   - Title: v$VERSION - <brief description>"
echo "   - Copy relevant section from CHANGELOG.md"
echo "   - Publish release"
