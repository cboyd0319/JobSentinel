# Contributing to JobSentinel

Thank you for your interest in contributing to JobSentinel! This guide will help you get started.

---

## 🤖 For AI Assistants (READ FIRST)

**If you're an AI assistant (Claude, GPT, Copilot, etc.) working on this codebase:**

### MANDATORY: Use Sub-Agents

**DO NOT** read files sequentially. **USE PARALLEL SUB-AGENTS:**

```text
WRONG: Read file A → Read file B → Read file C → Decide

RIGHT: Launch 3 Explore agents in parallel → Receive all results → Decide with full context
```

**Available agents to use:**

- `Explore` - Fast codebase exploration (use for file discovery)
- `code-reviewer` - PR review for bugs, security, style
- `code-explorer` - Deep feature analysis
- `code-architect` - Design implementation plans
- `silent-failure-hunter` - Find error handling issues
- `type-design-analyzer` - Review type definitions

### MANDATORY: Update Documentation

**After ANY change, update ALL relevant docs:**

| Change Type | Must Update |
|------------|-------------|
| New feature | `CHANGELOG.md`, `docs/features/`, `README.md`, `docs/ROADMAP.md` |
| New Tauri command | `CLAUDE.md`, `docs/README.md` |
| Bug fix | `CHANGELOG.md` |
| Refactoring | `docs/ROADMAP.md` (Technical Debt section) |
| New scraper | `docs/features/scrapers.md`, `CHANGELOG.md` |
| Test changes | `docs/developer/TESTING.md` |

**Before committing: "Did I update all relevant docs?"**

### MANDATORY: File Size Limits

**Keep files under 500 lines.** Large files are hard to maintain and regenerate with AI assistance.

**Test organization:** Move test modules to separate `tests.rs` files when a file exceeds 400
lines. This keeps the main logic focused and tests discoverable.

See `docs/ROADMAP.md` → Technical Debt section for files needing refactoring.

### MANDATORY: Check Current Plan

**Before starting work, check the plan documents:**

1. **Detailed plan:** `.claude/plans/virtual-puzzling-pretzel.md` (full implementation specs)
2. **Public roadmap:** `docs/ROADMAP.md` (priorities + technical debt)

**Current status:**

- **v1.4**: Ghost Detection + Data Insights (complete)
- **v1.5**: File modularization - db/mod.rs → scheduler → market_intelligence (in progress)
- **v2.0**: Keyring, CI/CD, Resume Builder, One-Click Apply (see detailed plan)

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Coding Standards](#-coding-standards)
- [Testing](#-testing)
- [Submitting Changes](#-submitting-changes)
- [Adding New Features](#-adding-new-features)
- [Reporting Bugs](#-reporting-bugs)

---

## 📜 Code of Conduct

**Be respectful, inclusive, and collaborative.** We're all here to make job searching easier.

- ✅ **Do:** Provide constructive feedback
- ✅ **Do:** Help others learn and grow
- ✅ **Do:** Assume good intentions
- ❌ **Don't:** Harass, discriminate, or belittle others
- ❌ **Don't:** Spam or self-promote
- ❌ **Don't:** Share private information

---

## 🚀 Getting Started

### Prerequisites

**Required:**

- Rust 1.83+ ([Install](https://rustup.rs/))
- Node.js 20+ ([Install](https://nodejs.org/))
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
# Install npm dependencies
npm install

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

## 🔄 Development Workflow

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
# - macOS 26.2+ (Tahoe)
```

### 4. Commit Changes

```bash
# Add files
git add .

# Commit with descriptive message
git commit -m "feat: Add support for Indeed job scraper

- Implement IndeedScraper in src-tauri/src/core/scrapers/
- Add parsing for Indeed job listings
- Add tests for Indeed scraper
- Update config.example.json with Indeed URLs

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

## 💻 Coding Standards

### Rust Code

**Follow Rust conventions:**

```bash
# Format code
cargo fmt

# Lint code
cargo clippy --all-targets --all-features -- -D warnings

# Check for security vulnerabilities
cargo audit
```

**Best Practices:**

- Use descriptive variable names
- Add doc comments for public APIs
- Handle errors explicitly (avoid `.unwrap()` in production)
- Use `tracing::` for logging (not `println!`)
- Keep functions small and focused

**Example:**

```rust
/// Scrape jobs from Greenhouse API
///
/// # Arguments
/// * `company` - Company to scrape
///
/// # Returns
/// * `Ok(Vec<Job>)` - List of jobs found
/// * `Err(anyhow::Error)` - If scraping fails
pub async fn scrape_company(&self, company: &GreenhouseCompany) -> Result<Vec<Job>> {
    tracing::info!("Scraping Greenhouse: {}", company.name);

    // Implementation...
}
```

### TypeScript/React Code

**Follow React best practices:**

```bash
# Format code
npm run format

# Lint code
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

## 🧪 Testing

### Rust Tests

**Write tests for all new code.** For files over 400 lines, move tests to a separate `tests.rs`
file to keep the main module focused:

```rust
// In src/feature/mod.rs (main logic, <400 lines)
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
- [ ] App runs on Windows 11+ and macOS 26.2+

---

## 📤 Submitting Changes

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
- [ ] Code formatted (`cargo fmt`, `npm run format`)
- [ ] No linter warnings (`cargo clippy`, `npm run lint`)
- [ ] **Documentation updated** (MANDATORY - see table above)
- [ ] CHANGELOG.md updated (for ALL significant changes)
- [ ] CLAUDE.md updated (if commands/structure changed)
- [ ] docs/ROADMAP.md updated (if adding to technical debt)
- [ ] Tested on Windows and/or macOS
- [ ] No files exceed 500 lines (move tests to `tests.rs` if needed)

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
- [ ] Tested on macOS 26.2+ (Tahoe)
- [ ] All Rust tests pass
- [ ] Manual testing completed

## Screenshots
(if applicable)

## Documentation Updates (REQUIRED)
- [ ] CHANGELOG.md updated
- [ ] Feature docs updated (if new feature)
- [ ] CLAUDE.md updated (if structure/commands changed)
- [ ] ROADMAP.md updated (if technical debt added)
- [ ] N/A - No docs needed (explain why)

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated (in separate `tests.rs` if file >400 lines)
- [ ] All documentation updated
- [ ] No new warnings
- [ ] No files exceed 500 lines
```

---

## ✨ Adding New Features

### Adding a New Job Scraper

**1. Create scraper file:**

```rust
// src-tauri/src/core/scrapers/indeed.rs

use super::{JobScraper, ScraperResult};
use async_trait::async_trait;

pub struct IndeedScraper {
    pub base_url: String,
}

#[async_trait]
impl JobScraper for IndeedScraper {
    async fn scrape(&self) -> ScraperResult {
        // Implementation
        Ok(vec![])
    }

    fn name(&self) -> &'static str {
        "indeed"
    }
}
```

**2. Add to mod.rs:**

```rust
// src-tauri/src/core/scrapers/mod.rs
pub mod indeed;
```

**3. Add configuration:**

```json
// config.example.json
{
  "indeed_urls": ["https://www.indeed.com/jobs?q=engineer"]
}
```

**4. Add tests:**

```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_indeed_scraper() {
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

## 🐛 Reporting Bugs

### Before Reporting

1. Search existing [issues](https://github.com/cboyd0319/JobSentinel/issues)
2. Try latest version
3. Check [FAQ](README.md#frequently-asked-questions-faq)

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what's wrong

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
(if applicable)

**Environment:**
 - OS: [e.g., Windows 11, macOS 15 Sequoia]
 - JobSentinel Version: [e.g., 1.0.0]
 - Error logs: (run with `RUST_LOG=debug`)

**Additional context**
Any other relevant information
```

---

## 💡 Feature Requests

### Before Requesting

1. Search existing [issues](https://github.com/cboyd0319/JobSentinel/issues)
2. Check [project roadmap](V1_COMPLETION_STATUS.md)

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you thought about

**Additional context**
Mockups, examples, etc.
```

---

## 📚 Resources

- [Rust Documentation](https://doc.rust-lang.org/)
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## 🙏 Recognition

Contributors will be:

- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in commit history

---

**Thank you for contributing to JobSentinel!** 🚀

*Questions? Open a [Discussion](https://github.com/cboyd0319/JobSentinel/discussions)*

---

**Last Updated:** January 17, 2026 (v1.5.0)
