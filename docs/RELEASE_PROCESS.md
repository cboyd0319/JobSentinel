# Automated Releases with Semantic Release

This project uses `python-semantic-release` to automate version bumping, changelog generation, and GitHub releases. This ensures consistent versioning (SemVer) and a clear changelog based on conventional commit messages.

## Versioning

*   **Semantic Versioning (SemVer):** `MAJOR.MINOR.PATCH`
    *   `PATCH` for bug fixes.
    *   `MINOR` for new features.
    *   `MAJOR` for breaking changes.

## How it Works

1.  **Conventional Commits:** All commit messages should follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/). This allows `semantic-release` to automatically determine the next version number and generate the changelog.
    *   `fix:` for bug fixes (bumps PATCH version).
    *   `feat:` for new features (bumps MINOR version).
    *   `BREAKING CHANGE:` in commit body for breaking changes (bumps MAJOR version).
    *   `chore:`, `docs:`, `ci:`, `refactor:`, `test:`, etc., for non-version-bumping changes.
2.  **CI/CD Trigger:** A `push` to the `main` branch triggers the `release` workflow in `.github/workflows/release.yml`.
3.  **`semantic-release publish`:** This command performs the following actions:
    *   Analyzes commit history to determine the next semantic version.
    *   Updates the version in `pyproject.toml`.
    *   Generates or updates `CHANGELOG.md`.
    *   Creates a Git tag (e.g., `v0.4.5`).
    *   Creates a GitHub Release with the generated changelog.
    *   Pushes the new version commit and tag back to the `main` branch.

## Creating a Release

To create a new release, simply merge your changes into the `main` branch using conventional commit messages. `semantic-release` will handle the rest.

```bash
# Example: Merge a feature branch into main
git checkout main
git pull origin main
git merge feature/my-new-feature # Ensure feature branch commits follow conventional commits
git push origin main
```

## Hotfixes

For hotfixes, create a new branch from `main`, apply the fix with a `fix:` commit message, and merge it back into `main`. `semantic-release` will automatically create a new patch release.

## Check Version at Runtime

You can check the current version of the application at runtime:

```bash
python3 -m src.agent --version
```

## Notes

*   **Commit Messages:** Clear and descriptive commit messages are crucial for accurate changelog generation.
*   **Breaking Changes:** Document breaking changes thoroughly in the commit body of your `BREAKING CHANGE:` commits.
*   **Manual Intervention:** Avoid manually bumping versions or creating tags/releases, as this can conflict with the automated process.
