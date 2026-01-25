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

### XSS Prevention

- **DOMPurify sanitization:** All user-generated HTML (Resume Builder) sanitized before rendering
- **No dangerouslySetInnerHTML without sanitization:** React components use safe rendering
- **Script tag blocking:** All XSS vectors (scripts, event handlers, JavaScript URLs) removed
- **Documentation:** See [XSS Prevention Guide](./docs/security/XSS_PREVENTION.md)

### URL Validation

- **Proper URL parsing:** Uses `url` crate to parse URLs instead of string prefix matching
- **Webhook validation:** Slack, Discord, and Teams webhooks validated for correct host and path
- **No bypass attacks:** Query parameter, subdomain, and fragment bypass attempts blocked
- **Documentation:** See [URL Validation Security](./docs/security/URL_VALIDATION.md)

### Command Execution Security

- **Path canonicalization:** All file paths canonicalized to prevent traversal attacks
- **No shell invocation:** Commands executed directly without shell interpretation
- **Controlled temp directories:** UUID-named temp directories prevent race conditions
- **Output validation:** Generated files validated to stay within controlled directories
- **Documentation:** See [Command Execution Security](./docs/security/COMMAND_EXECUTION.md)

### Webhook Security

- **HTTPS-only:** All webhook URLs must use HTTPS
- **Domain allowlisting:** Only known webhook providers (Slack, Discord, Teams) allowed
- **Path validation:** Webhook paths verified for correct structure
- **Keyring storage:** Webhook URLs stored encrypted in OS keyring
- **Documentation:** See [Webhook Security Guide](./docs/security/WEBHOOK_SECURITY.md)

## Security Documentation

Detailed security documentation is available in the `docs/security/` directory:

### Core Security Features

- **[Keyring Integration](./docs/security/KEYRING.md)** - OS-native secure credential storage
- **[XSS Prevention](./docs/security/XSS_PREVENTION.md)** - Cross-site scripting protection with DOMPurify
- **[URL Validation](./docs/security/URL_VALIDATION.md)** - Proper URL parsing vs string prefix matching
- **[Command Execution Security](./docs/security/COMMAND_EXECUTION.md)** - OCR and external tool security
- **[Webhook Security](./docs/security/WEBHOOK_SECURITY.md)** - Slack, Discord, and Teams webhook validation

### Testing and Examples

- **[DOMPurify Test Examples](./docs/security/dompurify-test-examples.js)** - XSS sanitization test cases

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Security Updates

Security fixes are released as patch versions (e.g., 2.5.1) and announced in the
CHANGELOG. We recommend always running the latest version.
