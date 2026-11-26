<!-- Guides users through manual updates, version 2 to 3.0.0 fresh starts, and going back. -->

# Updating Or Going Back

JobSentinel does not update itself silently. Updating is manual so you choose
when to replace the app and can check the download first.

## Coming From Version 2

JobSentinel 3.0.0 can't open, upgrade, or restore data, settings, or backups
from version 2.9.5 or earlier. To use 3.0.0, start fresh. Keep your version 2
folders so 2.9.5 can still use them later.

1. If you need anything from version 2, copy it out first while 2.9.5 still
   works.
2. Close JobSentinel. Make sure it's not still running in the system tray or
   menu bar.
3. Rename the two JobSentinel folders. For example, add `-v2` to the end of
   each folder name. Don't delete them.

   | Computer | Data folder | Settings folder |
   | --- | --- | --- |
   | Windows | `%LOCALAPPDATA%\JobSentinel` | `%APPDATA%\JobSentinel` |
   | macOS | `~/Library/Application Support/JobSentinel` | `~/.config/jobsentinel` |
   | Linux | `~/.local/share/jobsentinel` | `~/.config/jobsentinel` |

   If you set `XDG_DATA_HOME` or `XDG_CONFIG_HOME`, use the `jobsentinel`
   folder inside it instead. On macOS, only `XDG_CONFIG_HOME` applies.
4. Install and open 3.0.0. With no saved data, it creates a new encrypted local
   database and starts first-run setup. Automatic job checks start off.
5. Add your searches and settings again. Enter saved passwords and connection
   links again in **Settings**. Version 2 Settings backups can't be restored.

Don't delete JobSentinel's entries in Keychain, Credential Manager, or your
Linux password store. They use the service name `JobSentinel`. 3.0.0 reuses
those keys for its new data, and your version 2 data can't be opened without
them.

If you skip these steps, 3.0.0 finds the version 2 data and opens a recovery
screen. It doesn't change or remove that data. Close JobSentinel and follow the
steps above.

To use 2.9.5 again, close JobSentinel, rename the 3.0.0 folders, and remove
`-v2` from the version 2 folder names. Then install 2.9.5. Going back from
3.0.0 data to version 2 isn't supported.

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

Don't delete JobSentinel's local data folder while going back. Deleting it can
remove saved jobs, applications, notes, settings, and local records. To set
version 2 data aside, follow [Coming From Version 2](#coming-from-version-2).

## What JobSentinel Will Not Do

- It will not install updates in the background.
- It will not replace the app without your action.
- It will not use a separate update server.
- It will not send your local job-search data anywhere during an update.
