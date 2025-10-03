# Changelog

All notable changes to Job Private Scraper Filter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Planned
- Email notifications for found jobs
- Browser extension integration
- Multi-provider cloud support (AWS, Azure)
- Job board API integrations
- Advanced filtering with ML scoring
- Mobile app companion

---

[1.0.0]: https://github.com/cboyd0319/job-private-scraper-filter/releases/tag/v1.0.0
