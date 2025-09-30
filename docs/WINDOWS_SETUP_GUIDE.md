## 1. Install Python 3.12.10

For optimal compatibility and stability, we recommend installing **Python 3.12.10**.

1.  Download the official Windows installer from [python.org](https://www.python.org/downloads/windows/).
2.  During installation, make sure to check the box that says **"Add Python 3.12 to PATH"**.
3.  Follow the on-screen instructions to complete the installation.
4.  Verify your installation by opening a new PowerShell or Command Prompt window and typing:
    ```powershell
    python --version
    # Expected output: Python 3.12.10
    ```

## 2. Set up a Python Virtual Environment (Highly Recommended)

It's highly recommended to use a Python virtual environment to isolate project dependencies from your system Python and other projects. This prevents conflicts and makes dependency management cleaner.

1.  Navigate to your project directory in PowerShell or Command Prompt:
    ```powershell
    cd C:\path\to\job-private-scraper-filter
    ```
2.  Create the virtual environment:
    ```powershell
    python -m venv .venv
    ```
3.  Activate the virtual environment:
    ```powershell
    .venv\Scripts\activate
    ```
    You should see `(.venv)` at the beginning of your command prompt, indicating the virtual environment is active.

## 3. Update pip

Ensure your Python package manager (`pip`) is up-to-date:

```powershell
python -m pip install --upgrade pip
```

## 4. Install Project Dependencies

With your virtual environment active, install the project's dependencies:

```powershell
pip install -r requirements.txt
python -m playwright install chromium
```

## 5. Install Google Cloud CLI (gcloud)

The `gcloud` CLI is essential for interacting with Google Cloud Platform. If you plan to deploy to GCP, you must install it.

1.  Download the `gcloud` CLI installer for Windows from the [official Google Cloud documentation](https://cloud.google.com/sdk/docs/install-sdk#windows).
2.  Follow the installation instructions. Ensure that the installer adds `gcloud` to your system's PATH.
3.  Verify your installation by opening a **new** PowerShell or Command Prompt window and typing:
    ```powershell
    gcloud --version
    ```
4.  Authenticate the `gcloud` CLI with your Google Cloud account:
    ```powershell
    gcloud auth login
    gcloud auth application-default login
    ```
    This will open a browser window for you to log in and grant permissions.

## 6. Install Terraform CLI

Terraform is used to manage your GCP infrastructure.

1.  Download the appropriate Terraform CLI version for Windows from the [official HashiCorp website](https://developer.hashicorp.com/terraform/downloads).
2.  Unzip the downloaded package. You will find a single executable file named `terraform.exe`.
3.  Move `terraform.exe` to a directory that is included in your system's PATH environment variable (e.g., `C:\Program Files\Terraform` and add this path to your system's PATH, or place it in a directory already in PATH like `C:\Windows\System32`).
4.  Verify your installation by opening a **new** PowerShell or Command Prompt window and typing:
    ```powershell
    terraform --version
    ```

## 7. Elevated Privileges (Run as Administrator)

Some operations, particularly those involving system-wide changes or certain `gcloud` and `terraform` commands, might require elevated privileges on Windows. If you encounter permission errors, try running your PowerShell or Command Prompt as an Administrator.

To do this:
1.  Search for "PowerShell" or "Command Prompt" in the Start Menu.
2.  Right-click on the application.
3.  Select "Run as administrator."

## 8. Configure Project

After installing the prerequisites, configure the project:

1.  Copy the example environment file:
    ```powershell
    Copy-Item .env.example .env
    ```
2.  Copy the example user preferences file:
    ```powershell
    Copy-Item config\user_prefs.example.json config\user_prefs.json
    ```
3.  Edit `.env` and `config/user_prefs.json` with your specific filters, alerts, and cloud settings.

## 9. Run the Setup Wizard (Recommended)

For a guided setup experience, run the interactive setup wizard:

```powershell
python scripts/setup_wizard.py
```

This wizard will help you configure your job boards, filters, notification preferences, and optionally deploy to the cloud.

## 10. Deploy to GCP (Optional)

If you wish to deploy the job scraper to Google Cloud Platform, ensure you have completed the `gcloud` and `terraform` setup, then run:

```powershell
# Ensure GCP_PROJECT_ID and GCP_SOURCE_REPO environment variables are set.
$env:GCP_PROJECT_ID="your-gcp-project-id"
$env:GCP_SOURCE_REPO="your-github-username/job-private-scraper-filter"

scripts\deploy-cloud.sh gcp
```

This will provision all necessary GCP resources using Terraform.


This walkthrough targets Windows 11. I recommend creating a dedicated local user so the scraper runs with minimal rights, but you can install it under your main profile if you just want a quick test.

## Option 1: Dedicated service user (safer)

1. Open PowerShell **as Administrator** and create the user:

```powershell
$password = Read-Host "Password for jobscraper user" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
net user jobscraper "$plain" /add /passwordchg:no /fullname:"Job Scraper Service"
net localgroup Users jobscraper /add
```

1. Sign out, pick *Other user*, and log in as `jobscraper` using the password you just set.
1. Open PowerShell (regular window, not admin) and run the installer:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; \
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
  irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/setup_windows.ps1" | iex
```

The script installs Python in your profile, creates a virtualenv, grabs Playwright, sets up scheduled tasks, and drops shortcuts on the desktop. Expect it to run for 10–20 minutes.

## Option 2: Install under your main account

If you’d rather skip the extra user, stay on your profile, open PowerShell **as Administrator**, and run the same command as above. The scheduled tasks will run as your account, so keep that in mind if you change your password later.

## Configure the app

After the script finishes you’ll have a `job-private-scraper-filter` directory on your desktop (or wherever you pointed it). Tweak two files:

1. `.env` — add Slack webhooks or SMTP details if you want alerts.
1. `config/user_prefs.json` — list the job boards, titles, locations, and score thresholds you care about.

Run a quick smoke test while you’re still in the venv:

```powershell
python -m src.agent --mode health
python -m src.agent --mode test
```

## Scheduled tasks

The installer creates two tasks:

- `JobScraperPoll` runs every 15 minutes and calls `python -m src.agent --mode poll`
- `JobScraperDigest` runs daily at 9am for the email summary

Open **Task Scheduler** if you want to change the cadence or disable either one.

## Troubleshooting notes

- If Playwright complains about missing dependencies, rerun `python -m playwright install-deps` from the project folder.
- Permission warnings usually mean `.env` is writable by other users. Right-click → Properties → Security → restrict it to your account.
- When in doubt, re-run the setup script; it’s idempotent and will refresh missing pieces.

Ping me via issues if you hit something odd — Windows edge cases are always welcome.
