# Roadmap ideas

Here’s the running list of things I’m curious about exploring. No schedule, just a parking lot of ideas.

## Done recently

- Wired up CodeQL, Safety, and Bandit so the security checks match what I run locally
- Added OSV scanning and SARIF uploads so GitHub’s Security tab stays current
- Tidied the cloud deployment with budget alerts and Binary Authorization

## Up next (maybe)

- Implement a robust, reusable checksum validation function for all downloaded executables, images, and dependencies.
- Bring the nicer Cloud Run bootstrapper experience to AWS Lambda and Azure Functions
- Keep hammering on the Windows setup script until it feels as smooth as macOS/Linux
- Expand CI to cover more scraping edge cases and make rollback easier

## Code Quality & Architecture

- **Refactor `cloud/providers/gcp.py`** (1,199 lines → modular structure)
  - Extract `cloud/gcp_security.py` - Security utilities (URL validation, safe extraction, download validation)
  - Extract `cloud/gcp_sdk.py` - SDK management (gcloud CLI installation, version management)
  - Extract `cloud/gcp_docker.py` - Container build logic (Dockerfile generation, Cloud Build orchestration)
  - Extract `cloud/gcp_resources.py` - Infrastructure provisioning (VPC, storage, artifact registry, binary auth)
  - Keep orchestration & interactive setup in main `gcp.py`
  - Benefits: Better testability, reusability, maintainability, and portability for CI/CD integration

## Nice-to-haves for later

- Smarter AI helpers (resume hints, matcher explanations)
- More scrapers for sites friends keep asking about
- Lightweight mobile or web notifications
- Better privacy tooling (data export, key rotation reminders)
- Full encryption of data in transit and at rest

If one of these matters to you, open an issue with context. Knowing why you need it helps me decide what to tackle next.
