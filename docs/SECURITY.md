# Security Hardening Guide

This document outlines security best practices and configurations for deploying and operating the job scraper, focusing on minimizing risks and protecting sensitive information.

## 1. Principle of Least Privilege

Always grant the minimum necessary permissions for any service account or user. Avoid using broad roles like `Owner` or `Editor` for operational tasks.

*   **GCP Service Accounts:**
    *   The Terraform configuration creates dedicated service accounts for the Cloud Run job and Cloud Scheduler.
    *   These accounts are granted only the specific IAM roles required for their functions (e.g., `roles/run.invoker`, `roles/logging.logWriter`, `roles/secretmanager.secretAccessor`).
    *   Review `terraform/gcp/main.tf` and `cloud/providers/gcp/iam.py` for detailed IAM bindings.

## 2. Secure Configuration and Secrets Management

Sensitive information like API keys, database credentials, and webhook URLs must be stored and managed securely.

*   **Environment Variables (`.env`):**
    *   The `.env` file is used for local development and should **never** be committed to version control.
    *   Ensure `.env` is included in your `.gitignore`.
    *   For cloud deployments, environment variables are passed securely (e.g., via Cloud Run environment variables or Secret Manager).
*   **GCP Secret Manager:**
    *   The Terraform configuration and `cloud/providers/gcp/secrets.py` are designed to use GCP Secret Manager for storing sensitive application configuration (e.g., `user_prefs.json` content, Slack webhook URLs).
    *   Secrets are accessed by the Cloud Run service account with `roles/secretmanager.secretAccessor`.
    *   Avoid hardcoding secrets directly in code or configuration files.
*   **API Key Management:** Refer to `docs/API_KEY_MANAGEMENT.md` for detailed guidance on handling API keys.

## 3. Network Security

Restrict network access to only what is necessary.

*   **GCP VPC Service Controls (VPC-SC):**
    *   For highly sensitive deployments, consider implementing VPC Service Controls to create security perimeters around your resources and prevent data exfiltration.
    *   The Terraform configuration sets up a basic VPC network and connector for Cloud Run, ensuring private communication within your GCP project.
*   **Firewall Rules:** Ensure only necessary ingress/egress traffic is allowed.

## 4. Container Image Security

Ensure that the container images used for deployment are secure and free from vulnerabilities.

*   **Artifact Registry:**
    *   Container images are stored in GCP Artifact Registry.
    *   Integrate vulnerability scanning (e.g., Container Analysis) with Artifact Registry to automatically scan images for known vulnerabilities.
*   **Binary Authorization (GCP):**
    *   The Terraform configuration sets up Binary Authorization to enforce policies that only allow trusted container images to be deployed to Cloud Run.
    *   This policy ensures that images must originate from your Artifact Registry.
*   **Dockerfile Best Practices:**
    *   Use minimal base images (e.g., `python:3.12-slim`).
    *   Avoid installing unnecessary packages.
    *   Run as a non-root user.
    *   Scan your `Dockerfile` for security vulnerabilities using tools like `Hadolint`.

## 5. Logging and Monitoring

Centralized logging and proactive monitoring are essential for detecting and responding to security incidents.

*   **Cloud Logging:** All application logs are directed to Google Cloud Logging, providing a centralized repository for audit trails and debugging.
*   **Cloud Monitoring Alerts:** Set up alerts for unusual activity, failed deployments, or unauthorized access attempts.
*   **Security Command Center (GCP):** For advanced threat detection and vulnerability management, consider enabling Security Command Center.

## 6. Regular Audits and Updates

Security is an ongoing process. Regularly audit your configurations and keep your dependencies updated.

*   **Dependency Scanning:** Use tools like `pip-audit`, `Safety`, or `Dependabot` to identify and update vulnerable Python packages.
    *   The pre-commit hooks include `bandit` and `safety` for static analysis and dependency vulnerability scanning.
*   **IAM Policy Audits:** Periodically review IAM policies to ensure least privilege is maintained.
*   **Prowler Scans:** The `run_prowler_scan` function in `cloud/providers/gcp/security.py` can be used to generate CIS benchmark reports for your GCP project.

## 7. Incident Response

Have a plan in place for how to respond to security incidents.

*   **Alerting:** Ensure critical alerts are configured to notify the appropriate personnel.
*   **Access Control:** Restrict access to production environments and sensitive data.
*   **Backup and Recovery:** Regularly back up critical data and test recovery procedures.
