# Cloud Costs and Optimization

Managing cloud costs is crucial for any project. This guide outlines strategies and configurations to keep your job scraper running efficiently and affordably, especially within Google Cloud Platform (GCP).

## General Principles for Cost Optimization

1.  **Leverage Serverless:** Services like Cloud Run automatically scale to zero when not in use, meaning you only pay for actual execution time.
2.  **Efficient Code:** Optimize your code for speed and minimal resource consumption. Asynchronous I/O (using `asyncio`) is implemented to reduce execution time for I/O-bound tasks like web scraping.
3.  **Right-size Resources:** Allocate just enough CPU and memory for your tasks. Over-provisioning leads to unnecessary costs.
4.  **Smart Scheduling:** Run jobs only when necessary. Frequent runs increase costs.
5.  **Data Lifecycle Management:** Implement policies to automatically delete old or unnecessary data.

## Guardrails and Cost Protections (GCP)

Our Terraform configuration (`terraform/gcp/`) sets up several guardrails to prevent unexpected costs:

*   **Cloud Run Configuration:**
    *   **`--max-instances=1`**: Limits the Cloud Run service to a single instance, preventing accidental scaling.
    *   **`--cpu=1`, `--memory=512Mi`**: Provides a reasonable balance of resources for the job scraper, staying within free-tier limits for typical workloads.
    *   **`--timeout=900s`**: Sets a maximum execution time of 15 minutes per task, preventing runaway processes.
*   **VPC Connector:** Configured with minimal resources (`e2-micro` machine type, small subnet) for cost efficiency.
*   **Artifact Registry:** Uses standard storage, which is cost-effective for container images.
*   **Cloud Storage Lifecycle Policies:** Automatically deletes old backup files (e.g., after 90 days) to manage storage costs.

## Cloud Monitoring Budget Alerts (GCP)

Terraform automatically configures a basic budget alert for your GCP project:

*   **Budget Amount:** A monthly budget (defaulting to $5 USD) is set up.
*   **Alert Threshold:** An alert is triggered when spending reaches a configurable percentage (defaulting to 90%) of the budget.
*   **Notification:** Alerts are sent to the email address specified in the `alert_email_address` Terraform variable.

These alerts provide early warnings, allowing you to investigate and take action before exceeding your desired spending limits.

## What it Actually Costs (Estimates)

*   **Cloud Run (recommended)**: Under $1/month with the hourly business-hours schedule.
*   **Cloud Run, aggressive (15 min 24/7)**: Roughly $5–8/month.

For totally free options, consider Oracle Cloud's always-free tier or a small VPS, though dedicated scripts for these are not yet provided.

## How to Optimize Further

*   **Review Logs:** Regularly check [Google Cloud Logging](https://console.cloud.google.com/logs/viewer) for inefficient operations or errors that might be consuming resources.
*   **Adjust Scheduling:** Modify the Cloud Scheduler frequency (`schedule_frequency` in `config/user_prefs.json` or directly in Terraform) to match your actual needs. Less frequent runs mean lower costs.
*   **Refine Filters:** Use precise job filters to reduce the number of jobs processed, thereby reducing execution time and costs.
*   **Monitor Alerts:** Pay attention to the Cloud Monitoring alerts for both failures and costs. Failures can lead to retries and increased resource consumption.

If you discover a cheaper profile or a better schedule, please let me know by opening an issue or a pull request!
