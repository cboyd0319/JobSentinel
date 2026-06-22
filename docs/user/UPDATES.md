# Updating Or Going Back

JobSentinel does not update itself silently. Updating is manual so you choose
when to replace the app and can check the download first.

## Before Updating

1. Open **Settings** in JobSentinel.
2. Use **Backup Settings** and save the backup somewhere you can find again.
3. Open the
   [JobSentinel latest download page](https://github.com/cboyd0319/JobSentinel/releases/latest).
4. Download the installer or package for your computer.
5. Download the matching `.sha256` file from the same release.
6. Close JobSentinel.
7. Check the download before opening it.
8. Install the new version.
9. Open JobSentinel and confirm your searches, applications, and settings still
   look right.

Use only GitHub Releases from this repository. Do not install JobSentinel from
random mirrors, chat links, or re-uploaded files.

## Check The Download

The filename and checksum should match the same release.

- Windows no-account installers should include `_unsigned` in the filename until
  Windows code signing is available.
- Mac no-account packages should include `_no-account_` and `_universal` in the
  filename until Developer ID signing and notarization are available.
- Linux packages should include the same version number as the release.
- Every installer or package should have a matching `.sha256` file.

If a checksum is missing, the filename looks wrong, or the version numbers do
not match, stop and do not install that file.

### macOS Or Linux

Put the downloaded package and its `.sha256` file in the same folder, then run:

```bash
shasum -a 256 -c JobSentinel_*.sha256
```

The command should report `OK`.

### Windows

Open PowerShell in the folder containing the installer and run:

```powershell
Get-FileHash .\JobSentinel_X.Y.Z_x64-setup_unsigned.exe -Algorithm SHA256
```

Compare the `Hash` value to the text inside the matching `.sha256` file. They
must be the same.

## If The App Warns On First Open

Windows SmartScreen or macOS Gatekeeper may warn when a no-account installer is
unsigned or not notarized yet. Continue only when all of these are true:

- You downloaded the file from this repository's GitHub Releases page.
- The filename matches the platform and release you expected.
- The `.sha256` checksum matches.

If any of those are not true, delete the download and wait for a replacement
release.

## Going Back To An Older Version

1. Close JobSentinel.
2. Keep your latest Settings backup.
3. Open the
   [JobSentinel releases page](https://github.com/cboyd0319/JobSentinel/releases).
4. Download the older installer or package and its matching `.sha256` file.
5. Verify the checksum.
6. Install the older version.
7. Open JobSentinel and check your data.
8. If something looks wrong, open **Settings** and use **Restore Settings** with
   the backup you saved before updating.

Do not delete JobSentinel's local data folder while going back unless a support
doc or maintainer tells you to. Deleting that folder can remove saved jobs,
applications, notes, settings, and local records.

## What JobSentinel Will Not Do

- It will not install updates in the background.
- It will not replace the app without your action.
- It will not use a separate update server.
- It will not send your local job-search data anywhere during an update.
