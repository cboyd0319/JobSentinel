# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in JobSentinel, please report it responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email the maintainer directly or use GitHub's private vulnerability
reporting feature (Security tab → Report a vulnerability).

## What to Include

When reporting a vulnerability, please include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested fixes (optional but appreciated)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix timeline:** Depends on severity, typically 1-4 weeks

## Security Design Principles

JobSentinel is built with privacy and security as core principles:

### Privacy-First Architecture

- **Zero telemetry:** No data is ever sent to external servers without explicit user configuration
- **Local-first:** All job data stored in local SQLite database
- **No accounts required:** Works completely offline
- **Portable:** Can run from USB drive with no installation

### Credential Security

- **OS-native keyring:** Credentials stored using Windows Credential Manager, macOS Keychain,
  or Linux Secret Service
- **No plaintext storage:** Sensitive data never written to disk unencrypted
- **Minimal retention:** Only stores what's necessary for configured features

### Network Security

- **TLS everywhere:** Uses rustls (pure Rust TLS) for all HTTPS connections
- **No HTTP fallback:** All external connections require HTTPS
- **User-controlled webhooks:** Notifications only sent to user-configured endpoints

### Code Security

- **Memory safety:** Written in Rust with `unsafe_code = "deny"`
- **SQL injection prevention:** All database queries use SQLx parameterized queries
- **Input validation:** User input validated before use
- **Dependency auditing:** Regular `cargo audit` checks

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Security Updates

Security fixes are released as patch versions (e.g., 2.5.1) and announced in the
CHANGELOG. We recommend always running the latest version.
