# Webhook Security Guide

Notification webhooks are both credentials and outbound data channels. A leaked
value can permit unauthorized messages, while an unvalidated destination can
send job-search information to an attacker-controlled service.

## Security Objectives

JobSentinel must:

- send only after explicit channel configuration
- restrict each webhook to its supported provider target shape
- require encrypted transport
- keep webhook values out of logs, errors, analytics, and support reports
- store configured secrets through the local credential owner
- minimize notification content before it leaves the device
- fail closed when validation or credential access fails

## Canonical Owners

| Concern | Owner |
| ------- | ----- |
| Provider host and path validation | `crates/jobsentinel-security/src/webhook.rs` |
| Shared external URL policy | `crates/jobsentinel-security/src/url.rs` |
| Notification payloads and delivery | `crates/jobsentinel-notifications/src/` |
| Notification orchestration | `crates/jobsentinel-application/src/notify/` |
| Secret storage | `crates/jobsentinel-credentials/src/` |
| Desktop credential commands | `src-tauri/src/ipc/credentials/` |

Provider rules are summarized in
[Notification Webhook URL Validation](WEBHOOK_URL_VALIDATION.md).

## Threats And Controls

### Destination substitution

An attacker may submit a deceptive domain, path, scheme, port, or embedded
credential.

Control: every adapter calls
`jobsentinel_security::validate_webhook_target` with the selected provider.
Validation uses parsed components and a provider allowlist.

### Secret disclosure

Webhook URLs commonly contain bearer-like path or query values.

Control: values use the credential storage boundary. Logging and errors use
generic labels and never echo submitted webhook data.

### Excessive data export

Job titles, companies, match reasons, resumes, notes, and search criteria can be
private.

Control: payload builders send only the channel content explicitly supported by
the product contract. Local scoring reasons are not exported. New outbound
fields require privacy review and focused payload tests.

### Transport downgrade

Control: the shared validator requires HTTPS and rejects non-default explicit
ports.

### Reuse after compromise

Control: users can remove or replace the saved credential. A compromised
provider webhook should also be revoked at the provider.

## Validation And Delivery Flow

1. The user supplies a provider webhook through settings.
2. The desktop command validates the value before storage or use.
3. The credential owner stores the secret locally.
4. A notification request selects the matching provider adapter.
5. The adapter validates the target again.
6. The payload is minimized and sent over HTTPS.
7. Errors identify the provider and recovery action without revealing the
   credential.

Repeated validation is intentional because stored data and call-site arguments
are not treated as permanently trusted.

## User Guidance

- Use a dedicated provider channel when practical.
- Limit channel membership.
- Revoke a webhook that may have been copied or exposed.
- Replace the saved value after provider-side rotation.
- Review provider activity when unexpected messages appear.
- Remove channels that are no longer used.

## Incident Response

If a webhook may be compromised:

1. Revoke it at the provider.
2. Remove or replace the saved credential in JobSentinel.
3. Review provider-side activity and channel membership.
4. Report unexpected JobSentinel behavior through the private security process
   in [SECURITY.md](../../SECURITY.md).

Do not include the webhook value in a report, screenshot, issue, or log.

## Verification

```bash
cargo test -p jobsentinel-security webhook
cargo test -p jobsentinel-notifications
cargo test -p jobsentinel-credentials
npm run lint:security
npm run lint:secrets
```

Required tests cover accepted provider targets, misleading hosts, wrong paths,
embedded credentials, non-default ports, transport downgrade, redacted errors,
and payload privacy.

## Related Documentation

- [URL Validation Security](URL_VALIDATION.md)
- [Notification Webhook URL Validation](WEBHOOK_URL_VALIDATION.md)
- [Local Secret Vault And Keychain Integration](KEYRING.md)
- [Notifications](../features/notifications.md)
- [Security Policy](../../SECURITY.md)
