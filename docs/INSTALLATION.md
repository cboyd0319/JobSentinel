# Installation

This guide outlines the recommended installation process for the Job Scraper application on different operating systems.

## Windows Installation

**Important**: When you first run the installer, Windows will likely show a security screen that says "Windows protected your PC". This is expected. Click **More info** and then **Run anyway** to proceed.

The recommended method for Windows is the guided PowerShell installer.

The simplest way to get started on Windows is to use the graphical installer.

1.  Find the file named `Install-My-Job-Finder.ps1` in the main folder.
2.  **Double-click** it.
3.  A setup window will appear. Click the big blue button to begin.

The installer will guide you through all the necessary steps, including connecting to your Google account and setting up the application in the cloud.

## Installation on macOS & Linux

**Recommended Method: Interactive Setup Wizard**

For macOS and Linux, the interactive setup wizard is the most straightforward way to install and configure the application.

```bash
python3 scripts/setup_wizard.py
```

This wizard handles:

*   **Virtual Environment Setup:** Ensures a clean and isolated Python environment.
*   **Dependency Installation:** Installs all required Python packages and Playwright browsers.
*   **Configuration:** Helps you create and populate your configuration files.
*   **Cloud Deployment (GCP):** Optionally guides you through deploying to Google Cloud Run.

---

<details>
<summary><b>Manual Installation (for Advanced Users)</b></summary>

If you prefer a manual setup or need to troubleshoot specific steps, follow these instructions.

### Prerequisites

*   Python 3.12.10+
*   Git
*   Internet connection

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cboyd0319/job-private-scraper-filter.git
    cd job-private-scraper-filter
    ```
2.  **Set up Virtual Environment:**
    *   **Using `direnv` (Recommended):** If you have `direnv` installed, simply run `direnv allow`.
    *   **Manual `venv`:**
        ```bash
        python3 -m venv .venv
        # Activate on macOS/Linux
        source .venv/bin/activate
        # Activate on Windows
        # .\.venv\Scripts\Activate.ps1
        ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    python3 -m playwright install chromium
    ```
4.  **Configure:**
    ```bash
    cp .env.example .env
    cp config/user_prefs.example.json config/user_prefs.json
    # Edit .env and config/user_prefs.json with your filters and alerts
    ```

</details>

## Post-Installation

*   **Edit Configuration:** Adjust `.env` and `config/user_prefs.json` to your liking.
*   **Test Functionality:**
    *   Basic health check: `python3 -m src.agent --mode health`
    *   Test notifications: `python3 -m src.agent --mode test`

## Updating

```bash
git pull origin main
pip install -r requirements.txt --upgrade
python3 -m playwright install chromium
```
