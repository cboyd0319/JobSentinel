# API Key Management

Managing API keys and other sensitive credentials securely is paramount for any application. This document outlines best practices and the recommended approach for handling API keys within this project.

## Principles of Secure API Key Management

1.  **Never Hardcode:** API keys should never be directly embedded in your source code.
2.  **Environment Variables:** For local development, use environment variables (e.g., via a `.env` file) to store API keys.
3.  **Secret Management Services:** For cloud deployments, always leverage dedicated secret management services provided by your cloud provider (e.g., Google Cloud Secret Manager, AWS Secrets Manager, Azure Key Vault).
4.  **Least Privilege:** Grant only the necessary permissions to access secrets. Avoid giving broad access.
5.  **Rotation:** Regularly rotate API keys to minimize the impact of a compromised key.
6.  **Auditing:** Monitor access to your secrets to detect any unauthorized attempts.

## Local Development

For local development, API keys and other sensitive configurations should be stored in a `.env` file in the project root. This file is explicitly ignored by Git (`.gitignore`) to prevent accidental commits.

1.  **Create `.env`:** Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  **Populate `.env`:** Open the `.env` file and replace placeholder values with your actual API keys and credentials:
    ```ini
    SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
    OPENAI_API_KEY="sk-YOUR_OPENAI_API_KEY"
    # ... other API keys
    ```
3.  **Access in Code:** The application uses `python-dotenv` to load these variables into the environment. You can access them in your Python code using `os.getenv()`:
    ```python
    import os
    slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    ```

## Cloud Deployments (GCP with Terraform)

For GCP deployments, Google Cloud Secret Manager is used to securely store and manage API keys and other sensitive configuration data.

1.  **Terraform Integration:**
    *   The Terraform configuration (`terraform/gcp/main.tf`) defines `google_secret_manager_secret` resources to create secrets in Secret Manager.
    *   It also configures IAM policies to grant the Cloud Run service account `roles/secretmanager.secretAccessor` permission, allowing the application to access these secrets at runtime.
2.  **`cloud/providers/gcp/secrets.py`:** This module handles the programmatic provisioning and updating of secrets in Secret Manager.
3.  **Access in Cloud Run:**
    *   Secrets are exposed to the Cloud Run service as environment variables using the `--set-secrets` flag during deployment.
    *   For example, a secret named `my-api-key` can be exposed as an environment variable `MY_API_KEY`.
    *   The application then accesses these as standard environment variables via `os.getenv()`.

### Example: Storing `user_prefs.json` in Secret Manager

The `user_prefs.json` file, which contains your job search preferences, is treated as a sensitive configuration. Instead of deploying it directly with the application code, its content is stored as a secret in Secret Manager. This allows for easy updates without redeploying the entire service.

## API Key Rotation

Regularly rotate your API keys. For keys stored in Secret Manager, you can create new versions of a secret. The Cloud Run service can then be updated to use the new secret version without downtime.

## Auditing Access

Google Cloud Logging automatically captures audit logs for Secret Manager access. You can monitor these logs to track who accessed which secrets and when, helping to detect any suspicious activity.
