# Contributing to JobSentinel

Thank you for your interest in contributing to JobSentinel! This guide will help you get started.

---

## For AI Assistants (READ FIRST)

**If you're an AI assistant (Claude, GPT, Copilot, etc.) working on this codebase:**

1. Read [AGENTS.md](../../AGENTS.md).
2. Read [Harness Engineering](../harness/README.md).
3. Use [Change Contract](../harness/change-contract.md) for non-trivial work.
4. Run sensors from [Verification Matrix](../harness/verification-matrix.md).
5. Update docs when behavior, setup, architecture, commands, or security changes.

### Documentation Updates

After any significant change, update all relevant docs:

| Change Type       | Must Update                                                      |
| ----------------- | ---------------------------------------------------------------- |
| New feature       | `CHANGELOG.md`, `docs/features/`, `README.md`, active plan or roadmap |
| New Tauri command | `AGENTS.md` if workflow changes, `docs/harness/`, `docs/README.md` |
| Bug fix           | `CHANGELOG.md`                                                   |
| Refactoring       | `docs/plans/tech-debt-tracker.md` when debt changes              |
| New scraper       | `docs/features/job-sources.md`, `CHANGELOG.md`                      |
| Test changes      | `docs/developer/TESTING.md`                                      |

Before committing, ask: "Did I update all relevant docs?"

### File Size Policy

Use the current maintainable file-size policy in
[Harness Engineering](../harness/README.md). The enforceable caps live in
`validation/file_size_contract.json`, and `npm run lint:bloat` fails when a
tracked file exceeds its scope cap or an exception grows past its frozen limit.

**Test organization:** Move test modules to separate `tests.rs` files when
tests start to obscure main logic or a file approaches the tracked
maintainability thresholds.

See `docs/plans/tech-debt-tracker.md` for current refactor and debt items.

### Check Current Status

Check `package.json` for the current release package version. See
`ROADMAP.md` for public product priorities, `docs/ROADMAP.md` for developer
planning, and `docs/plans/tech-debt-tracker.md` for current technical debt.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Features](#adding-new-features)
- [Reporting Problems](#reporting-problems)
- [Improvement Ideas](#improvement-ideas)

---

## Code of Conduct

**Be respectful, inclusive, and collaborative.** We're all here to make job searching easier.

- **Do:** Provide constructive feedback
- **Do:** Help others learn and grow
- **Do:** Assume good intentions
- **Do not:** Harass, discriminate, or belittle others
- **Do not:** Spam or self-promote
- **Do not:** Share private information

---

## Project Ethos

JobSentinel is free, will always stay free, and will always remain MIT
licensed. The code is here to help people find work without giving up privacy
or control.

Contributions to JobSentinel are welcome. So are forks, adaptations, and better
tools built from this code. If this repository helps someone serve more job
seekers, that is a good outcome.

---

## Getting Started

### Prerequisites

**Required:**

- Rust 1.96.0+ ([Install](https://rustup.rs/))
- Node.js 24.18.0+ ([Install](https://nodejs.org/))
- Git

**Platform-Specific:**

- **Windows:** Visual Studio Build Tools 2022, Windows 10 SDK
- **macOS:** Xcode Command Line Tools
- **Linux:** GTK development libraries

### Fork and Clone

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/JobSentinel.git
cd JobSentinel

# 3. Add upstream remote
git remote add upstream https://github.com/cboyd0319/JobSentinel.git

# 4. Create a branch for your changes
git checkout -b feature/your-feature-name
```

### Install Dependencies

```bash
# Activate pinned npm, then install dependencies from the lockfile
node scripts/install-pinned-npm.mjs
npm ci --ignore-scripts

# Check Rust compilation
cd src-tauri
cargo check
cd ..
```

### Run Development Mode

```bash
# Start the app with hot reload
npm run tauri:dev
```

---

## Development Workflow

### 1. Sync with Upstream

```bash
# Fetch latest changes
git fetch upstream

# Merge into your branch
git checkout main
git merge upstream/main

# Rebase your feature branch
git checkout feature/your-feature-name
git rebase main
```

### 2. Make Changes

**Follow the project structure:**

- `src/` - React frontend (TypeScript + TailwindCSS)
- `src-tauri/src/core/` - Platform-agnostic business logic
- `src-tauri/src/platforms/` - OS-specific code
- `src-tauri/src/commands/` - Tauri RPC handlers

**Keep changes focused:**

- One feature/fix per pull request
- Small, atomic commits with clear messages
- Update tests and documentation

### 3. Test Your Changes

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run with logging
RUST_LOG=debug npm run tauri:dev

# Test on target platforms
# - Windows 11+
# - macOS 13+
```

### 4. Commit Changes

```bash
# Add files
git add .

# Commit with descriptive message
git commit -m "feat: Add support for NewBoard job scraper

- Implement NewBoardScraper in src-tauri/src/core/scrapers/
- Add parsing for NewBoard job listings
- Add tests for NewBoard scraper
- Update examples/config/config.example.json with NewBoard URLs

Closes #123"
```

**Commit Message Format:**

```text
<type>: <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code restructuring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

---

## Coding Standards

All code is DRY and lean. Before writing code, walk the ladder in
[Engineering Principles](../harness/engineering-principles.md) and stop at the
first step that satisfies the requirement: skip it (YAGNI), use the standard
library, use a native platform feature, reuse an installed dependency, or make
it one clear line. Boring over clever, and reduce or remove duplication
everywhere.

### Rust Code

**Follow Rust conventions:**

```bash
# Format code
cargo fmt

# Lint production Rust targets
cargo clippy -- -D warnings

# Check for security vulnerabilities
cargo audit
```

**Best Practices:**

- Use descriptive variable names
- Add doc comments for public APIs
- Handle errors explicitly with domain-specific error types (`ScraperError`, `DatabaseError`)
- Use structured error handling with `thiserror` (avoid `.unwrap()` in production)
- Treat test-target clippy warnings as advisory unless a change explicitly
  tightens the test lint policy; production clippy is the hard lint gate.
- Use `tracing::` for logging (not `println!`)
- Keep functions small and focused
- Sanitize URLs in error messages to prevent information leakage

**Example:**

```rust
/// Scrape jobs from Greenhouse API
///
/// # Arguments
/// * `company` - Company to scrape
///
/// # Returns
/// * `Ok(Vec<Job>)` - List of jobs found
/// * `Err(ScraperError)` - If scraping fails with structured error context
///
/// # Errors
/// Returns `ScraperError` for HTTP errors, parsing failures, or rate limiting
pub async fn scrape_company(&self, company: &GreenhouseCompany) -> ScraperResult {
    tracing::info!("Scraping Greenhouse: {}", company.name);

    let response = self.client
        .get(&company.url)
        .send()
        .await
        .map_err(|e| ScraperError::http_request(&company.url, e))?;

    if !response.status().is_success() {
        return Err(ScraperError::http_status(
            response.status().as_u16(),
            &company.url,
            "Failed to fetch jobs"
        ));
    }

    // Parse and return jobs...
}
```

### TypeScript/React Code

**Follow React best practices:**

```bash
# Lint and auto-fix code
npm run lint:fix

# Lint code (check only)
npm run lint
```

**Best Practices:**

- Use functional components with hooks
- Add TypeScript types for all props
- Use TailwindCSS utility classes
- Keep components small and reusable
- Handle loading and error states

**Example:**

```typescript
interface JobListProps {
  jobs: Job[];
  onSelect: (job: Job) => void;
}

export function JobList({ jobs, onSelect }: JobListProps) {
  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onClick={() => onSelect(job)} />
      ))}
    </div>
  );
}
```

---

## Testing

### Rust Tests

**Write tests for all new code.** When tests make main logic harder to read or
push a file toward the tracked maintainability thresholds, move tests to a
separate `tests.rs` file:

```rust
// In src/feature/mod.rs (main logic)
pub fn calculate_score(job: &Job) -> u32 {
    // Implementation
}

// In src/feature/tests.rs (all tests)
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_scrape_greenhouse() {
        let scraper = GreenhouseScraper::new(vec![]);
        let jobs = scraper.scrape().await.unwrap();
        assert!(jobs.len() > 0);
    }
}
```

Add to `mod.rs`:

```rust
#[cfg(test)]
mod tests;
```

**Run tests:**

```bash
cd src-tauri

# All tests
cargo test

# Specific test
cargo test test_scrape_greenhouse

# With output
cargo test -- --nocapture
```

### Manual Testing

**Test checklist:**

- [ ] Setup wizard completes successfully
- [ ] Job scraping works for all sources
- [ ] Scoring algorithm calculates correctly
- [ ] Database persists data
- [ ] Slack notifications send (if configured)
- [ ] Dashboard displays jobs
- [ ] Config file loads/saves correctly
- [ ] App runs on Windows 11+ and macOS 13+

---

## Submitting Changes

### Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR on GitHub
# Include:
# - Clear title and description
# - Link to related issues
# - Screenshots/GIFs (for UI changes)
# - Test results
```

### PR Checklist

Before submitting:

- [ ] Code compiles without errors (`cargo check`)
- [ ] All tests pass (`cargo test`)
- [ ] Code formatted (`cargo fmt`, `npm run lint:fix`)
- [ ] No linter warnings (`cargo clippy`, `npm run lint`)
- [ ] **Documentation updated** (MANDATORY - see table above)
- [ ] CHANGELOG.md updated (for ALL significant changes)
- [ ] AGENTS.md or `docs/harness/` updated (if agent workflow changed)
- [ ] docs/ROADMAP.md updated (if adding to technical debt)
- [ ] Tested on Windows and/or macOS
- [ ] No maintainable file-size policy regressions (`npm run lint:bloat`)

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Closes #123

## Testing

- [ ] Tested on Windows 11
- [ ] Tested on macOS
- [ ] All Rust tests pass
- [ ] Manual testing completed

## Screenshots

(if applicable)

## Documentation Updates (REQUIRED)

- [ ] CHANGELOG.md updated
- [ ] Feature docs updated (if new feature)
- [ ] AGENTS.md or harness docs updated (if structure/commands changed)
- [ ] ROADMAP.md updated (if technical debt added)
- [ ] N/A - No docs needed (explain why)

## Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated, with sidecar `tests.rs` files when they keep main logic readable
- [ ] All documentation updated
- [ ] No new warnings
- [ ] No maintainable file-size policy regressions
```

---

## Adding New Features

### Adding a New Job Scraper

**1. Create scraper file:**

```rust
// src-tauri/src/core/scrapers/newboard.rs

use super::{JobScraper, ScraperResult};
use async_trait::async_trait;

pub struct NewBoardScraper {
    pub base_url: String,
}

#[async_trait]
impl JobScraper for NewBoardScraper {
    async fn scrape(&self) -> ScraperResult {
        // Implementation
        Ok(vec![])
    }

    fn name(&self) -> &'static str {
        "newboard"
    }
}
```

**2. Add to mod.rs:**

```rust
// src-tauri/src/core/scrapers/mod.rs
pub mod newboard;
```

**3. Add configuration:**

```json
// examples/config/config.example.json
{
  "newboard_urls": ["https://www.newboard.com/jobs?q=engineer"]
}
```

**4. Add tests:**

```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_newboard_scraper() {
        // Test implementation
    }
}
```

**5. Update documentation:**

- Update README.md
- Update QUICK_START.md
- Add to supported scrapers list

### Adding a New Platform

**1. Create platform module:**

```rust
// src-tauri/src/platforms/freebsd/mod.rs

pub fn get_data_dir() -> PathBuf {
    // FreeBSD implementation
}

pub fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    // FreeBSD-specific setup
}
```

**2. Add conditional compilation:**

```rust
// src-tauri/src/platforms/mod.rs
#[cfg(target_os = "freebsd")]
pub mod freebsd;
```

**3. Update tauri.conf.json:**

```json
{
  "bundle": {
    "targets": ["msi", "dmg", "app", "freebsd"]
  }
}
```

---

## Reporting Problems

### Before Reporting A Problem

1. Search existing [issues](https://github.com/cboyd0319/JobSentinel/issues)
2. Try latest version
3. Check [FAQ](../../README.md#frequently-asked-questions)
4. Keep private job-search details out of public issues.

Use the in-app safe support report when app state matters. It redacts known
sensitive values before review and sharing. Do not ask users to paste raw logs,
terminal output, stack traces, local paths, resume text, salary floors, notes,
or application history into public issues.

### Problem Report Template

```markdown
**What happened?**
Clear description of what's wrong

**How can we make this happen?**
Steps to reproduce:

1. Go to '...'
2. Click on '...'
3. See problem

**What did you expect?**
What should happen

**Screenshots**
If applicable, and only if they do not show private job-search details.

**Computer**

- OS: [e.g., Windows 11, macOS 26 Tahoe]
- JobSentinel Version: [e.g., 1.0.0]

**Safe support report**
Paste only if you want help and after reviewing it.
```

---

## Improvement Ideas

### Before Suggesting An Improvement

1. Search existing [issues](https://github.com/cboyd0319/JobSentinel/issues)
2. Check [project roadmap](../ROADMAP.md)
3. Keep private job-search details out of public issues.

### Improvement Template

```markdown
**What problem does this solve?**
Clear description of the problem

**What would you like to see?**
What you want to happen

**What else have you considered?**
Other solutions you thought about

**Additional context**
Only include details that are safe to make public.
```

---

## Resources

- [Rust Documentation](https://doc.rust-lang.org/)
- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## Recognition

Contributors will be:

- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in commit history

---

Thanks for contributing to JobSentinel.

*Questions? Open a [Discussion](https://github.com/cboyd0319/JobSentinel/discussions)*
