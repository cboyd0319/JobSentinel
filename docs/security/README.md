# Security Documentation

> Comprehensive security documentation for JobSentinel

---

## Overview

This directory contains detailed security documentation for JobSentinel, covering all security features, threat
models, and best practices.

## Documentation Index

### Core Security Features

| Document | Description | Topics Covered |
|----------|-------------|----------------|
| [**KEYRING.md**](./KEYRING.md) | OS-native credential storage | Windows Credential Manager, macOS Keychain, Linux Secret Service |
| [**XSS_PREVENTION.md**](./XSS_PREVENTION.md) | Cross-site scripting protection | DOMPurify, HTML sanitization, Resume Builder security |
| [**URL_VALIDATION.md**](./URL_VALIDATION.md) | Secure URL parsing | URL parsing vs string matching, bypass prevention, SSRF protection |
| [**COMMAND_EXECUTION.md**](./COMMAND_EXECUTION.md) | External command security | Path canonicalization, command injection prevention, OCR security |
| [**WEBHOOK_SECURITY.md**](./WEBHOOK_SECURITY.md) | Notification webhook security | Slack/Discord/Teams validation, data exfiltration prevention |

### Testing Resources

| File | Purpose |
|------|---------|
| [**dompurify-test-examples.js**](./dompurify-test-examples.js) | XSS sanitization test cases for browser console testing |

---

## Quick Reference

### Security by Feature

| Feature | Security Measures | Documentation |
|---------|-------------------|---------------|
| **Resume Builder** | DOMPurify sanitization, XSS prevention | [XSS_PREVENTION.md](./XSS_PREVENTION.md) |
| **Credential Storage** | OS keyring, encrypted at rest, no plaintext | [KEYRING.md](./KEYRING.md) |
| **Webhook Notifications** | URL parsing, HTTPS-only, allowlisting | [WEBHOOK_SECURITY.md](./WEBHOOK_SECURITY.md) |
| **OCR (Resume Parsing)** | Path canonicalization, no shell invocation | [COMMAND_EXECUTION.md](./COMMAND_EXECUTION.md) |
| **Database** | SQLx parameterized queries, SQL injection prevention | [../../SECURITY.md](../../SECURITY.md) |
| **Network** | TLS everywhere (rustls), no HTTP fallback | [../../SECURITY.md](../../SECURITY.md) |

### Security by Threat

| Threat | Mitigation | Documentation |
|--------|------------|---------------|
| **XSS (Cross-Site Scripting)** | DOMPurify HTML sanitization | [XSS_PREVENTION.md](./XSS_PREVENTION.md) |
| **Data Exfiltration** | Webhook URL validation, domain allowlisting | [WEBHOOK_SECURITY.md](./WEBHOOK_SECURITY.md) |
| **Command Injection** | No shell invocation, argument validation | [COMMAND_EXECUTION.md](./COMMAND_EXECUTION.md) |
| **Path Traversal** | Path canonicalization, directory validation | [COMMAND_EXECUTION.md](./COMMAND_EXECUTION.md) |
| **URL Bypass Attacks** | Proper URL parsing with `url` crate | [URL_VALIDATION.md](./URL_VALIDATION.md) |
| **Credential Theft** | OS keyring encryption, access control | [KEYRING.md](./KEYRING.md) |
| **SQL Injection** | Parameterized queries (SQLx) | [../../SECURITY.md](../../SECURITY.md) |
| **MITM (Man-in-the-Middle)** | HTTPS-only, TLS certificate validation | [WEBHOOK_SECURITY.md](./WEBHOOK_SECURITY.md) |

---

## Security Design Principles

### 1. Defense in Depth

Multiple layers of security protection:

```text
Input → Validation → Sanitization → Parsing → Authorization → Execution
  ↓        ↓            ↓             ↓            ↓            ↓
Reject  Normalize    Remove        Verify       Check        Log
Bad     Data         Dangerous     Structure    Permissions  Activity
```

### 2. Fail Securely

Default to denial when validation fails:

```rust
// ❌ Insecure: Allows on error
if validate(input).is_ok() {
    return Err("Invalid");
}
process(input); // Dangerous default

// ✅ Secure: Denies on error
validate(input)?; // Returns error if invalid
process(input);   // Only reached if valid
```

### 3. Minimize Attack Surface

- **Feature flags:** OCR is optional (`cargo build --features ocr`)
- **No network by default:** Only connects when user configures webhooks
- **Local-first:** All data stays on device unless explicitly shared
- **No telemetry:** Zero data collection

### 4. Use Safe Libraries

- **Rust:** Memory-safe language, no buffer overflows
- **SQLx:** Compile-time checked SQL, prevents injection
- **rustls:** Pure Rust TLS, no OpenSSL vulnerabilities
- **DOMPurify:** Industry-standard XSS sanitizer
- **url crate:** RFC-compliant URL parsing

### 5. Validate Everything

```text
User Input → Parse → Validate → Sanitize → Use
             ↑        ↑          ↑           ↑
           Fail    Fail       Fail        Log
```

Never trust:

- User input
- File paths
- URLs
- Command arguments
- Environment variables
- Configuration files

---

## Testing Security

### Automated Tests

```bash
# Run all tests including security tests
cargo test

# Run security-specific tests
cargo test security
cargo test validation
cargo test credentials

# Run with coverage
cargo tarpaulin --out Html
```

### Manual Security Testing

1. **XSS Testing**: Use `dompurify-test-examples.js` in browser console
2. **URL Bypass**: Test with malicious webhook URLs (see URL_VALIDATION.md)
3. **Path Traversal**: Test with `../../etc/passwd` paths
4. **Command Injection**: Test with shell metacharacters in filenames

### Security Audit Tools

```bash
# Check for known vulnerabilities in dependencies
cargo audit

# Check for unsafe code usage
cargo geiger

# Static analysis
cargo clippy -- -D warnings

# Format check
cargo fmt -- --check
```

---

## Reporting Security Vulnerabilities

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

1. **GitHub Security Advisory** (preferred)
   - Go to Security tab → Report a vulnerability
   - Provides private communication channel

2. **Direct Email**
   - Email maintainer directly
   - Include "SECURITY" in subject line

### What to Include

- **Description**: What is the vulnerability?
- **Impact**: What can an attacker do?
- **Steps to reproduce**: How to trigger the issue?
- **Affected versions**: Which versions are vulnerable?
- **Suggested fix** (optional): How to fix it?

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix timeline:** 1-4 weeks depending on severity
- **Disclosure:** Coordinated with reporter

---

## Security Update Process

### Version Numbers

We follow Semantic Versioning:

- **Major (2.x.x)**: Breaking changes
- **Minor (x.5.x)**: New features
- **Patch (x.x.3)**: Bug fixes and security patches

### Security Patches

Security fixes are released as:

1. **Patch version** (e.g., 2.5.3 → 2.5.4)
2. **Announced in CHANGELOG** with severity level
3. **GitHub Security Advisory** published
4. **Users notified** to update

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **Critical** | Remote code execution, data breach | < 24 hours |
| **High** | Privilege escalation, credential theft | < 1 week |
| **Medium** | Denial of service, information disclosure | < 2 weeks |
| **Low** | Minor information leak, low-impact issue | < 4 weeks |

---

## Best Practices for Users

### 1. Keep Updated

```bash
# Check current version
jobsentinel --version

# Download latest release from GitHub
# https://github.com/cboyd0319/JobSentinel/releases
```

### 2. Protect Credentials

- **Use keyring storage** (automatic in v2.0+)
- **Never commit** config files with credentials
- **Rotate secrets** if compromised
- **Use strong passwords** for services

### 3. Validate Configuration

```bash
# Validate config file
jobsentinel config validate

# Check credential status
# Open Settings → View credential status indicators
```

### 4. Monitor Activity

- **Review job alerts** for unexpected sources
- **Check webhook activity** in Slack/Discord/Teams
- **Monitor database size** for unusual growth

### 5. Follow Principle of Least Privilege

- **Use dedicated channels** for JobSentinel
- **Limit webhook permissions** when possible
- **Don't share credentials** with other tools

---

## Development Security

### Code Review Checklist

Before merging, verify:

- [ ] No `unsafe` code without justification
- [ ] All user input validated
- [ ] SQL queries use parameterized queries
- [ ] URLs parsed with `url` crate
- [ ] Paths canonicalized before use
- [ ] Commands executed without shell
- [ ] Secrets not in code or tests
- [ ] Dependencies up to date
- [ ] Tests pass including security tests
- [ ] Documentation updated

### Pre-Commit Hooks

```bash
# Install pre-commit hooks
cargo install cargo-audit
cargo install cargo-geiger

# Run before committing
cargo test
cargo clippy
cargo audit
```

### Dependency Management

```bash
# Check for outdated dependencies
cargo outdated

# Update dependencies
cargo update

# Audit dependencies
cargo audit

# Check for unsafe code in dependencies
cargo geiger
```

---

## Additional Resources

### External Security Resources

- [Rust Security Guidelines](https://anssi-fr.github.io/rust-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Tauri Security](https://tauri.app/v1/references/architecture/security/)

### Security Learning

- [OWASP WebGoat](https://owasp.org/www-project-webgoat/) - Security training
- [Google XSS Game](https://xss-game.appspot.com/) - XSS practice
- [PentesterLab](https://pentesterlab.com/) - Security exercises

### Security Tools

- [cargo-audit](https://github.com/rustsec/rustsec) - Vulnerability scanning
- [cargo-geiger](https://github.com/rust-secure-code/cargo-geiger) - Unsafe code detection
- [Semgrep](https://semgrep.dev/) - Static analysis
- [Burp Suite](https://portswigger.net/burp) - Web security testing

---

## Contact

For security-related questions or private disclosure:

- **Security Issues**: Use GitHub Security Advisory
- **General Questions**: Open a GitHub Discussion
- **Documentation**: Contribute via Pull Request

---

**Last Updated**: 2026-01-24  
**JobSentinel Version**: 2.5.3  
**Security Level**: Production Ready
