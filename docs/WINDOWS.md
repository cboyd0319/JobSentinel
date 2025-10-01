# Setting Up on Windows

This guide will help you get your Personal Job Finder running on your Windows computer.

## Quick & Easy Setup (Recommended)

This is the simplest way to get started. You only need to do this once.

1.  Open the **Start Menu** and type `PowerShell`.
2.  Click on **"Windows PowerShell"** to open it.
3.  Copy the command below, paste it into the PowerShell window, and press **Enter**:

```powershell
irm https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/deploy/windows/bootstrap.ps1 | iex
```

That's it! A helper will appear to guide you the rest of the way. It will automatically handle all the technical steps for you.

---

<details>
<summary><b>Advanced Installation (for Developers)</b></summary>

This section is for technical users who want more control over the setup process.

### Manual Setup

1.  **Install Python 3.12.10** from [python.org](https://www.python.org/downloads/windows/) (ensure you check "Add Python to PATH").
2.  **Install Google Cloud CLI** from [cloud.google.com](https://cloud.google.com/sdk/docs/install#windows).
3.  **Clone the repository**:
    ```powershell
    git clone https://github.com/cboyd0319/job-private-scraper-filter.git
    cd job-private-scraper-filter
    ```
4.  **Create a virtual environment**:
    ```powershell
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    python -m playwright install chromium
    ```
5.  **Authenticate with Google Cloud**:
    ```powershell
    gcloud auth login
    gcloud auth application-default login
    ```

### Running the Deployment Script Directly

You can run the underlying PowerShell orchestration script directly for more options:

```powershell
# Run a standard deployment
.\scripts\Deploy-Windows-to-GCP.ps1 deploy

# Perform a dry-run to see planned changes
.\scripts\Deploy-Windows-to-GCP.ps1 deploy -WhatIf

# Encrypt your .env file
.\scripts\Deploy-Windows-to-GCP.ps1 encrypt-config

# Rollback to a previous version
.\scripts\Deploy-Windows-to-GCP.ps1 rollback -SnapshotId <snapshot-id>

# Tear down all cloud resources
.\scripts\Deploy-Windows-to-GCP.ps1 teardown
```

</details>

---

## Troubleshooting

*   **"Windows protected your PC"**: If you see this message when running the installer, click `More info` and then `Run anyway`. This happens with new, unsigned scripts.
*   **Browser window opens**: During setup, a browser window will open to ask you to sign into your Google account. This is normal and secure.
*   **Something went wrong**: If the installer shows an error, it will provide simple instructions to email a log file for help. There is no need to worry.
