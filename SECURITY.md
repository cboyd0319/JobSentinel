# Security Policy

I treat job data and alert settings as sensitive, so I focus on keeping everything local and well-scanned. Here’s how things work today and how to reach me if you spot a hole.

## Built-in protections

- Local-first design; the agent only leaves your machine if you run the cloud bootstrapper
- Secrets live in `.env` and never ship with the repo
- Bandit + Safety are bundled in `scripts/precommit-security-scan.sh`
- Enhanced GitHub Actions security pipeline runs CodeQL, Safety, OSV Scanner, Bandit, Semgrep, Prowler CIS benchmarks, and TruffleHog on every push
- Workflows implement security best practices: `persist-credentials: false`, OIDC token support, minimal permissions, and dependabot protection
- YAML linting with project-specific rules, shell script validation with `shellcheck`, and comprehensive SARIF reporting to Security tab
- Multi-layered security scanning with optimized timeouts and caching for faster execution
- Cloud deployments enforce Binary Authorization, private VPC connectors, budget alerts, and tight resource limits

## Reporting a vulnerability

If you find something risky, report it privately so I can patch it quickly.

1. Visit the repo’s [Security tab](https://github.com/cboyd0319/job-private-scraper-filter/security)
2. Click **Report a vulnerability** and share repro steps (logs, configs, anything that helps)
3. Optionally email `security@cboyd.dev` if that’s easier — I usually answer within a couple of days

## Running it safely

- Copy `.env.example` → `.env` and restrict the file to your user
- Use app passwords for SMTP providers
- Rotate API keys, especially if you turn on LLM scoring
- Glance through new scripts before running them; this is a personal project and things change fast

## Cloud deployment guardrails

`cloud/bootstrap.py` configures Cloud Run with:

- Distroless Python image and read-only filesystem
- Binary Authorization pinned to the fresh Artifact Registry image
- Secrets stored in Secret Manager with rotation labels
- A minimal VPC connector so traffic stays private
- Budget alerts at $5, $10, and $15, plus hooks for auto-pausing if spend jumps

If you extend the cloud scripts, please keep the least-privilege defaults and document any new environment variables or firewall tweaks.

## Thanks

Responsible reports are appreciated. If you want a public shout-out after a fix ships, let me know when you contact me.
