# Saved Secrets

JobSentinel keeps alert passwords, access codes, and private connection links in
your computer's password store. They should not live in plain app files,
screenshots, shared notes, support reports, or logs.

## Why It Matters

Job-search data is sensitive, and alert setup details can be sensitive too. A
private connection link or app password can let someone else send alerts as you
or connect to an account you own.

JobSentinel reduces that risk by saving those details in the password store
already built into your operating system.

## What Gets Saved There

| Saved detail | Used for |
| ------------ | -------- |
| Slack connection link | Slack alerts |
| Discord connection link | Discord alerts |
| Microsoft Teams connection link | Teams alerts |
| Email app password | Email alerts |
| Telegram setup code | Telegram alerts |
| USAJobs access code | USAJobs checks |

Search preferences, alert choices, saved jobs, applications, private notes, and
salary floors stay in JobSentinel's local app data, not in the password store.

## What You May See

| Computer | Password store name |
| -------- | ------------------- |
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Linux password store, such as GNOME Keyring or KWallet |

If your computer asks whether JobSentinel can use a saved item, allow
JobSentinel if you want that alert or job-source connection to work.
JobSentinel should ask only when it is saving, testing, or using that saved
detail, not repeatedly while you browse Settings.

Settings may also say **Saved details need confirmation**. That means
JobSentinel expects a saved detail, but has not opened the password store during
this passive Settings view. Re-enter the connection link, app password, or
access code before saving, or use the Test button for that alert when you are
ready to confirm it.

## If Something Stops Working

Try these steps in order:

1. Open Settings in JobSentinel.
2. Re-enter the connection link, app password, or access code.
3. Save settings.
4. Use the Test button for that alert.
5. If it still fails, save a safe support report and review it before sharing.

On Linux, signing out and back in can also reopen the local password store.

## Older Installations

Older JobSentinel versions may have saved some setup details in older app
settings. When JobSentinel starts, it tries to move those details into the
password store and clear the old copy. If that move cannot finish safely,
JobSentinel retries later instead of pretending cleanup is complete.

Legacy LinkedIn saved details may exist on older installations only so
JobSentinel can delete or redact old values. JobSentinel does not collect new
LinkedIn session details or use LinkedIn as a background job source.

## Safe Support Reports

Safe support reports must not include saved secret values. They may say whether
a detail is saved or missing, but they should not include the actual connection
link, app password, access code, cookies, private URL parts, or local file paths.

Review every support report before sharing it.

## Required Guardrails

- Saved secret values stay local unless you turn on an outside alert or
  job-source connection that needs them.
- Settings can show whether a detail is saved or needs confirmation, but must
  not show the saved secret value.
- Safe support reports and logs must redact secrets and private connection
  details.
- JobSentinel validates chat connection links before saving them.
- Exported settings backups must leave saved secret values out.

Implementation details live in
[Local Secret Vault And Keychain Integration](../security/KEYRING.md).
