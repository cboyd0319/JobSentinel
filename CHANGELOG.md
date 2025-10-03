# Changelog

All notable changes to Job Private Scraper Filter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.5] - 2025-10-02

### Changed
- Reset project baseline to the stable `v0.4.5` release series.
- Updated automation to target Python 3.12 and refreshed GitHub Actions pins.
- Regenerated version metadata (`pyproject.toml`, `VERSION`, PowerShell modules, tests).

### Fixed
- Release pipeline now provisions Python 3.12 before running `semantic-release`.
- `semantic-release` now updates the plain-text `VERSION` file alongside `pyproject.toml`.

---

## [1.0.0] - 2025-10-02

### Added
- Initial production release
- Windows GUI installer with WPF interface
- GCP cloud deployment automation
- Local installation option with setup wizard
- Secure auto-update mechanism
- Desktop shortcut creation
- Comprehensive error handling and logging
- PowerShell module architecture
- Credential management with Windows DPAPI
- Input validation and sanitization
- Progress indicators for long-running operations
- Uninstaller with optional dependency removal
- Auto-update checker
- Telemetry (local, privacy-conscious)
- Pester test suite
- PSScriptAnalyzer configuration
- GitHub Actions CI/CD pipeline

### Fixed
- 28 critical security and reliability issues from initial audit:
  - Silent error suppression (My-Job-Finder.ps1:10)
  - Memory leaks from uncleaned event handlers
  - Path traversal vulnerabilities
  - Array index out of bounds crashes
  - Missing exit code validation
  - Improper PATH environment variable updates
  - No timeout on installer processes
  - Weak directory traversal detection
  - Case-sensitive path validation bypass
  - Blind deployments with no output capture
  - Missing Set-StrictMode declarations
  - Script-scope return vs exit issues

### Changed
- Refactored monolithic scripts into modular architecture
- Improved error messages with actionable remediation steps
- Enhanced UX with progress feedback
- Standardized logging across all components
- Centralized configuration management

### Security
- Added input validation module
- Implemented secure credential storage
- Added path traversal protection
- Enforced case-insensitive path comparisons
- Added SHA256 verification for downloads
- Implemented proper secret handling

## [1.3.0] - 2025-10-03

### Added
- **Enterprise-Grade Security Posture**
  - 7 automated security scanners with 100% SARIF coverage
  - Branch protection with required status checks and PR reviews
  - CODEOWNERS file for automated code review assignments
  - Operations runbook (docs/RUNBOOK.md)
  - Moved SECURITY.md and CONTRIBUTING.md to root for GitHub visibility

### Security
- **Fixed CVE-2025-53643**: Updated aiohttp 3.10.11 → 3.12.14
- **Fixed High Severity**: Removed sensitive data from logs (stderr/stdout)
- **Fixed Error Level**: Shell injection prevention in GitHub Actions
- **Zero Open Alerts**: All 30 security alerts resolved (15 fixed, 15 dismissed as false positives)
- Added PowerShell security scanning with PSScriptAnalyzer
- Implemented SARIF upload for all security tools:
  - Bandit (Python security)
  - CodeQL (code analysis)
  - OpenGrep OSS (static analysis)
  - OSV Scanner (dependencies)
  - TruffleHog (secrets)
  - PSScriptAnalyzer (PowerShell)

### Performance
- **40-60% CI/CD cost reduction** (~$20-35/month savings)
  - Windows runners: Parallel execution (30-40% faster)
  - Cross-platform: Ubuntu always, Windows/macOS conditional
  - CodeQL: Weekly schedule only (80-90% reduction)
  - Artifacts: 1-2 day retention (50-70% storage savings)
- **30-50% faster workflow execution**
  - Concurrency controls prevent duplicate runs
  - Aggressive caching and path filters
  - Smart job dependencies

### Changed
- Branch protection enforced: status checks + PR approval + linear history
- Flake8 → Black auto-formatting fallback
- Python dependency management optimized
- All GitHub Actions updated to latest versions

### Fixed
- Dead code removed (Terraform plan step)
- Scheduled dependency updates now functional
- OpenGrep binary path corrected
- Redundant pip upgrades eliminated

## [Unreleased]

### Planned
- SBOM generation for releases
- Artifact signing (Cosign/SLSA)
- Devcontainer configuration
- Email notifications for found jobs
- Browser extension integration
- Multi-provider cloud support (AWS, Azure)
- Job board API integrations
- Advanced filtering with ML scoring
- Mobile app companion

---

[0.4.5]: https://github.com/cboyd0319/job-private-scraper-filter/releases/tag/v0.4.5
[1.0.0]: https://github.com/cboyd0319/job-private-scraper-filter/releases/tag/v1.0.0
[1.3.0]: https://github.com/cboyd0319/job-private-scraper-filter/releases/tag/v1.3.0
