# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Pre-commit hooks for automated code quality checks
- Comprehensive developer contribution guide
- Security policy and vulnerability reporting guidelines
- Code standards compliance tracking (78/100 baseline)

### Changed
- Consolidated all documentation under `/docs/` directory
- Improved README with clear quick start guide

### Security
- Added CDN integrity checks (SRI) to prevent supply chain attacks
- Implemented Content Security Policy headers to mitigate XSS attacks
- Completed Bandit security scan: 0 critical/high severity issues

### Fixed
- PEP 8 compliance: converted tabs to spaces in job_scraper.py
- Added missing return type hints to 4 utility functions
- Improved module documentation in utils/__init__.py

## [Previous Versions]

See git history for changes prior to structured changelog.
