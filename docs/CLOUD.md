# Cloud Deployment Guide

Deploying the Job Scraper to the cloud is the most powerful way to use the application, allowing it to run automatically on a schedule without needing your computer to be on.

Thanks to the new installer, this process is now simple and straightforward.

## 🚀 Deployment in 3 Steps

1.  **Navigate to the Deploy Directory**
    Open a terminal (or PowerShell on Windows) and go to the `deploy` folder in the project.

2.  **Choose Your Operating System**
    Navigate into the folder for your OS:
    *   `cd windows`
    *   `cd macos`
    *   `cd linux`

3.  **Run the Installer**
    *   **On Windows:** Double-click the `install.ps1` file. It will open a graphical window to guide you.
    *   **On macOS or Linux:** Run `./install.sh` in your terminal.

The installer will handle everything, including:
- Checking for necessary tools.
- Helping you sign in to your Google Cloud account.
- Securely setting up all the required cloud infrastructure.
- Deploying the Job Scraper application.

For more details on the Windows-specific experience, see the [Windows Setup Guide](WINDOWS.md).

---

## Cloud Infrastructure

For those interested, the installer automatically provisions the following in your Google Cloud project using Terraform:

- **Cloud Run Job:** A serverless container to run the scraper on a schedule.
- **Artifact Registry:** A private, secure place to store the application's container image.
- **Secret Manager:** A vault for safely storing sensitive information like your Slack webhook URL.
- **Cloud Scheduler:** A trigger that runs your job automatically.
- **VPC Network:** A private network to keep your application secure.
- **Budget Alerts:** Automatic email warnings to prevent unexpected costs.

This entire setup is defined as code in the `terraform/gcp` directory, ensuring your deployment is repeatable, secure, and follows best practices.
