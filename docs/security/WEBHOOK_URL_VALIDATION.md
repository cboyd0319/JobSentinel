# Notification Webhook URL Validation

This document is the canonical provider-rule summary for notification
webhooks. [URL Validation Security](URL_VALIDATION.md) owns the shared parsing,
public-address, canonicalization, and logging rules.

## Implementation Owner

`crates/jobsentinel-security/src/webhook.rs` owns provider validation through
`jobsentinel_security::validate_webhook_target` and `WebhookTarget`.

The Slack, Discord, and Teams adapters under
`crates/jobsentinel-notifications/src/` delegate to that shared owner. They map
validation failures to user-safe provider guidance and do not expose the
submitted webhook value.

## Shared Requirements

Every supported webhook must:

- parse as a URL
- use HTTPS
- omit embedded user information
- use a public destination allowed by the shared external URL policy
- use port 443 when an explicit port is present
- match the selected provider's host and path contract

Provider rules compare parsed host and path components. They do not use string
prefixes against the complete submitted value.

## Slack

Accepted shape:

- host is exactly `hooks.slack.com`
- path begins with `/services/`

Examples:

```text
https://hooks.slack.com/services/T00000000/B00000000/secret
```

Rejected shapes include alternate hosts, deceptive subdomains, non-HTTPS
schemes, non-default ports, and paths outside `/services/`.

## Discord

Accepted shape:

- host is exactly `discord.com`, `discordapp.com`, or `hooks.discord.com`
- path begins with `/api/webhooks/`

Examples:

```text
https://discord.com/api/webhooks/123456789/secret
https://hooks.discord.com/api/webhooks/123456789/secret
```

Subdomains of the listed hosts are not accepted unless they are one of the
three exact entries.

## Microsoft Teams

The shared owner accepts current Teams workflow targets and retained connector
forms:

- `outlook.office.com` or `outlook.office365.com` with a path beginning
  `/webhook/`
- a generated subdomain of `.webhook.office.com` with a non-root path
- a generated subdomain of `.logic.azure.com` with a non-root path

The apex hosts `webhook.office.com` and `logic.azure.com` are not accepted.
Arbitrary Microsoft-owned domains are not sufficient.

Examples:

```text
https://outlook.office.com/webhook/tenant/IncomingWebhook/key/group
https://tenant.webhook.office.com/path/IncomingWebhook/key/group
https://region.logic.azure.com/workflows/id/triggers/manual/paths/invoke
```

## Adapter Contract

Provider adapters may:

- select the matching `WebhookTarget`
- return concise setup guidance
- build provider-specific payloads

Provider adapters must not:

- copy host or path allowlists
- perform substring or full-string prefix validation
- log webhook values
- downgrade to HTTP
- bypass the shared validator for test sends

## Verification

The shared contract tests cover accepted provider shapes and representative
host, path, credential, scheme, and port bypasses:

```bash
cargo test -p jobsentinel-security webhook
cargo test -p jobsentinel-notifications
npm run lint:security
```

Any provider rule change must update the shared validator, its tests, this
document, and user-facing setup guidance in the same change.
