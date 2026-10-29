<!-- Documents security Policy. -->

# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in JobSentinel, please report it responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, use the private security contact listed for the project. If you use
GitHub, private vulnerability reporting also works.

## What to Include

When reporting a vulnerability, please include:

1. Description of the vulnerability
2. What you did before it happened
3. Potential impact
4. Any suggested fixes (optional but appreciated)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix timeline:** Depends on severity, typically 1-4 weeks

## Security Design Principles

JobSentinel is built with privacy and security as core principles:

### Privacy-First Architecture

- **Zero telemetry:** JobSentinel does not collect analytics or send data to
  JobSentinel servers.
- **Local-first:** Job-search records are stored on the user's device by
  default. External channels send only configured or approved details.
- **No account required:** Core workflows work without a JobSentinel account.
- **User-controlled network use:** Job checks, location detection, configured
  alerts, and optional external AI can use network access only through visible
  user-controlled features.

### Credential Security

- **Encrypted vault:** Saved credentials use per-row authenticated encryption
  inside the SQLCipher database. Installed profiles protect keys with native
  credential storage or optional vault-key passphrase wrapping.
- **Portable profiles:** The profile passphrase protects the database and vault
  key without host-keyring access.
- **No plaintext credential storage:** Credentials are excluded from config and
  settings backups; non-secret search choices can still be private.
- **Minimal retention:** Only stores what's necessary for configured features

### Network Security

- **HTTPS-first external paths:** Webhooks, location lookup, provider calls,
  configured secrets, and job-page import fetches use HTTPS. Saved public job
  links may be `http` or `https` only when validation confirms a public host
  and blocks local, private, and userinfo targets.
- **User-controlled webhooks:** Notifications only sent to user-configured endpoints

### Code Security

- **Memory safety:** Rust denies unsafe code by default. Windows and macOS platform FFI
  use scoped unsafe code where OS APIs require it.
- **SQL injection prevention:** Untrusted values are bound as SQLx parameters; storage owns SQL and migrations
- **Input validation:** User input validated before use
- **Dependency auditing:** Release checks include `cargo deny check advisories bans licenses sources` and npm audit

### XSS Prevention

- **DOMPurify sanitization:** All user-generated HTML (Resume Builder) sanitized before rendering
- **No dangerouslySetInnerHTML without sanitization:** React components use safe rendering
- **Script tag blocking:** Allowed HTML is constrained and scripts, event handlers and unsafe URL schemes are rejected
- **Documentation:** See [XSS Prevention Guide](./docs/security/XSS_PREVENTION.md)

### URL Validation

- **Proper URL parsing:** Uses `url` crate to parse URLs instead of string prefix matching
- **Webhook validation:** Slack, Discord, and Teams webhooks validated for correct host and path
- **No bypass attacks:** Query parameter, subdomain, and fragment bypass attempts blocked
- **Documentation:** See [URL Validation Security](./docs/security/URL_VALIDATION.md)

### Command Execution Security

- **Path canonicalization:** Managed-file boundaries validate ownership, links and path containment
- **No shell invocation:** User-controlled arguments are passed through bounded native owners without shell interpolation
- **Controlled temp directories:** Private temporary directories and exclusive file creation bound concurrent operations
- **Output validation:** Generated files validated to stay within controlled directories
- **Documentation:** See [Command Execution Security](./docs/security/COMMAND_EXECUTION.md)

### Webhook Security

- **HTTPS-only:** All webhook URLs must use HTTPS
- **Domain allowlisting:** Only known webhook providers (Slack, Discord, Teams) allowed
- **Path validation:** Webhook paths verified for correct structure
- **Encrypted local vault:** Webhook URLs stored as AEAD-encrypted vault rows,
  with keys protected by OS credential storage or optional passphrase lock
- **Documentation:** See [Webhook Security Guide](./docs/security/WEBHOOK_SECURITY.md)

## Security Documentation

Detailed security documentation is available in the `docs/security/` directory:

### Core Security Features

- **[Secret Vault And Keychain Integration](./docs/security/KEYRING.md)** - SQLCipher storage,
  encrypted vault rows, OS key protection, and passphrase wrapping
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

Security fixes normally use patch versions and are announced in the
CHANGELOG. We recommend always running the latest version.

All future releases, including security patches, require the full ordered
[Stability, Performance and Security phases](docs/developer/RELEASING.md#mandatory-final-release-phases).
Supported release labels do not imply pre-v3 data can be opened by v3; v3.0.0 is
the first supported v3 data baseline.
