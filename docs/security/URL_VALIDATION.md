# URL Validation Security

JobSentinel treats every user-controlled or remotely supplied URL as untrusted.
Validation is based on parsed URL components, not string prefixes or substring
searches.

## Canonical Owners

| Concern | Owner |
| ------- | ----- |
| External URL parsing, host policy, canonicalization, and safe log labels | `crates/jobsentinel-security/src/url.rs` |
| DNS resolution and public-address verification before fetches | `crates/jobsentinel-network/src/lib.rs` |
| Notification webhook provider policy | `crates/jobsentinel-security/src/webhook.rs` |
| User-supplied job URL normalization | `crates/jobsentinel-domain/src/normalization/url.rs` |
| Renderer job-link checks | `src/features/dashboard/jobUrlValidation.ts` |
| Safe browser download names | `src/shared/browserDownload.ts` |
| CSV formula neutralization | `src/features/dashboard/jobCsvExport.ts` |

Provider-specific webhook rules are documented in
[Notification Webhook URL Validation](WEBHOOK_URL_VALIDATION.md).

## Why Parsing Is Required

A text prefix such as `https://trusted.example` does not prove ownership of the
destination. It can also match:

- `https://trusted.example.attacker.invalid/`
- a URL that embeds credentials before another host
- a URL that hides a destination in a query or fragment
- alternate textual forms of local or private IP addresses

The `url` crate separates scheme, user information, host, port, path, query,
and fragment before policy is evaluated.

## External URL Contract

`jobsentinel-security` provides the pure structural checks:

- `validate_external_http_url` allows public HTTP or HTTPS destinations.
- `validate_external_https_url` requires HTTPS.
- `canonicalize_user_supplied_job_url` removes user information, fragments,
  tracking parameters, and sensitive query values before storage.
- `sanitize_url_for_logging` removes user information, query strings, and
  fragments, then bounds the resulting label.
- `validate_resolved_ips` rejects resolved non-public addresses.

Structural validation rejects:

- unsupported schemes such as `file`, `javascript`, and custom protocols
- embedded user names or passwords
- missing hosts
- localhost names
- internal hostname suffixes
- loopback, private, link-local, shared-address, unspecified, multicast, and
  other non-public literal IP destinations
- hostnames that embed blocked IPv4 address shapes

## Fetch-Time Validation

Parsing a public-looking hostname is not enough for an outbound request. DNS can
resolve that name to a blocked address.

`jobsentinel-network` owns fetch-time validation:

1. Apply the pure URL policy.
2. Resolve the host.
3. Validate every resolved address.
4. Revalidate redirects through the same outbound request boundary.
5. Send the request only after those checks pass.

Code that performs an HTTP fetch must use the network owner rather than calling
the pure parser and then constructing an independent client request.

## Job URLs

Job links can include candidate identifiers, session values, affiliate data,
and private fragments. Canonicalization removes sensitive and unstable
components before the URL is stored, hashed, logged, or included in an optional
notification channel.

The storage layer validates HTTPS again before accepting a job record. Desktop
open and automation paths validate at their own trust boundaries because
persisted data is not treated as inherently trusted.

## Webhook URLs

Webhook URLs are credentials and outbound destinations. They require both the
external HTTPS policy and provider-specific host and path validation.

All notification adapters delegate to
`jobsentinel_security::validate_webhook_target`. Provider adapters must not
carry independent host allowlists or copied URL-validation implementations.

See:

- [Notification Webhook URL Validation](WEBHOOK_URL_VALIDATION.md)
- [Webhook Security Guide](WEBHOOK_SECURITY.md)

## Logging

Never log a complete user-supplied URL. Query strings, fragments, user
information, path segments, and webhook values can contain secrets or private
search criteria.

Use `sanitize_url_for_logging` or a more restrictive non-sensitive label.
Validation errors shown to users should explain the action to take without
echoing secret-bearing input.

## Downloads And CSV

Browser download names are separate from URL validation but share the same
untrusted-input boundary:

- `sanitizeDownloadFilename` removes path components and unsafe filename
  characters.
- CSV export quotes fields and neutralizes spreadsheet formulas from untrusted
  job content.
- Callers supply a bounded fallback name.

## Verification

Run the focused policy and boundary checks:

```bash
cargo test -p jobsentinel-security url
cargo test -p jobsentinel-security webhook
cargo test -p jobsentinel-network
npm run lint:security
npm run lint:architecture
```

Tests should include malformed URLs, misleading subdomains, embedded
credentials, blocked address forms, DNS results containing blocked addresses,
provider host and path mismatches, non-default webhook ports, and safe log
redaction.

## Review Checklist

- Parse before policy checks.
- Validate exact hosts or explicit subdomain suffixes with an excluded apex.
- Validate paths independently from hosts.
- Require HTTPS where private data or credentials may leave the device.
- Resolve and verify addresses before outbound fetches.
- Revalidate redirects.
- Remove sensitive URL components before storage or logging.
- Keep provider policies in the shared security crate.
- Return generic user-safe errors for secret-bearing destinations.
