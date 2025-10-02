# Slack Notifications Setup

Connecting Slack is the best way to get immediate alerts for high-match jobs.

## The Easy Way (for Users)

During the `Install-My-Job-Finder.ps1` setup process, you will be guided through the following steps:

1.  The installer will provide you with a special link to authorize the **Job Finder** Slack application.
2.  A secure page on Slack.com will open. **If you are in multiple workspaces, Slack will ask you to choose one from a dropdown menu at the top-right.**
3.  Choose a channel for your notifications (like `#job-alerts`) and click **Allow**.
3.  Slack will then show you your unique **Webhook URL**. It starts with `https://hooks.slack.com/...`.
4.  Copy this URL and paste it back into the installer window when prompted.

That's it! The installer handles the rest.

## How It Works (for Developers)

The user-friendly process above is made possible by the **Slack App Manifest**.

### Generating the Shareable URL (One-Time Developer Setup)

To create the authorization link for users, you only need to do this once:

1.  Go to [api.slack.com/apps](https://api.slack.com/apps) and click **"Create New App"**.
2.  Choose **"From an app manifest"**.
3.  Select the workspace where you want to manage the app template.
4.  Copy the contents of `config/slack_app_manifest.yml` and paste it into the YAML tab.
5.  Create the app.
6.  In the app's dashboard, go to **Features > Incoming Webhooks** and activate it.
7.  Go to **Manage Distribution**, click **Activate Public Distribution**, and copy the **Shareable URL**. This is the link you provide to your users.

This process allows any user to install your pre-configured, secure, and permission-scoped Slack app to their own workspace with a single click, without needing developer access or knowledge.
