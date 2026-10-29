<!-- Explains reviewed app updates, v3 compatibility limits and separate data recovery. -->

# Updating or going back

JobSentinel does not update itself silently. The current public release is
[v2.9.5](https://github.com/cboyd0319/JobSentinel/releases/tag/v2.9.5).
The reviewed update controls described below belong to the unreleased v3 source.
Production signing enrollment and installed release qualification remain pending.

## Before updating

1. Preserve a compatible backup before replacing the app.
2. Download only from the
   [JobSentinel release page](https://github.com/cboyd0319/JobSentinel/releases).
3. Select the intended version and platform package, plus its matching checksum.
4. Verify the package before opening it and review the release's compatibility notes.
5. Close JobSentinel before manual replacement, then reopen and check your data.

A Settings backup covers settings, saved searches and cover letter templates,
not all local records. V3 also provides an encrypted portable backup that leaves
saved credentials out. Keep its passphrase separately. See
[local backups and recovery](../features/user-data-management.md).

V3.0.0 is the first supported v3 storage baseline. Do not open pre-v3 data as a
v3 profile or point an older app at newer data. Unsupported data must remain
preserved for an explicit supported recovery route.

## Reviewed v3 updates

In Settings, use the local update panel to choose a trusted signed package with
its release manifest and signature beside it. The app verifies package identity,
platform, digest, publisher authority and data compatibility before showing a
review. If trusted publisher setup is unavailable, installer selection remains
unavailable. A checksum alone does not satisfy this trust gate.

Review the version and compatibility details, then choose whether to cancel or
confirm. Confirmation prepares a verified recovery snapshot and stops active
work before the installer handoff.

**Installer opened** means only that the
operating system accepted the launch. It does not prove installation succeeded.
Follow the installer, reopen JobSentinel and check the resulting version/data.

An explicit online availability check may contact GitHub. It does not authorize
installation or upload local job-search data. Local backup and recovery controls
remain available when the network is unavailable.

## Verify a download

Use the package and checksum from the same repository release. Expected labels
for the published no-account assets include `_unsigned` on Windows and
`_no-account_` plus `_universal` on macOS. Do not assume these labels prove safety.
If an expected checksum is missing or does not match, stop.

On macOS or Linux, put the files in one folder and run:

```bash
shasum -a 256 -c JobSentinel_*.sha256
```

The selected package should report `OK`.

On Windows, run:

```powershell
Get-FileHash .\JobSentinel_X.Y.Z_x64-setup_unsigned.exe -Algorithm SHA256
```

Replace `X.Y.Z` with the downloaded version and compare the returned hash with
its matching `.sha256` file. Use the actual package filename if it differs.

Unsigned or unnotarized packages may trigger operating-system warnings. Follow
the release's documented first-open instructions only after verifying its source,
expected filename and checksum. Never bypass an unexpected warning or use a
package from a mirror, chat attachment or re-upload.

## Compatible rollback and data recovery

A v3 rollback is a separately reviewed, compatible v3 app package. The update
panel labels its direction and requires confirmation. It changes the app version.
It does not restore an older copy of saved data.

Newer-schema incompatibility
must stop the rollback rather than forcing an older app to read the data.

For data recovery, use the separate encrypted backup restore workflow. Review the
backup and passphrase, stage it, and either cancel before restarting or allow
startup verification and promotion. Do not delete the current data folder to
force a restore or replace a damaged database manually.

If startup or installation fails, preserve current files and use local recovery
or a safe support report. Keep the original profile and backup until recovery
has been verified. A backup of settings alone cannot recover every record.
