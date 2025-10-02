# Download Checksum Validation

## Overview

All downloads from external sources are verified using SHA256 checksums to ensure integrity and prevent supply chain attacks.

## Implementation

### Python utility (cloud/utils.py)

```python
verify_file_checksum(file_path, expected_sha256) -> bool
download_and_verify(url, destination, expected_sha256) -> bool
```

Verifies files after download. Raises `RuntimeError` on mismatch.

### PowerShell (scripts/setup_windows.ps1)

```powershell
Get-FileHash-SHA256 -FilePath $path
Verify-Download -FilePath $path -ExpectedSHA256 $hash -Description "name"
```

Windows-native checksum verification.

## Protected downloads

**Windows installer:**
- Python 3.12.10 installer
- Git for Windows installer (when added)
- gcloud SDK installer (when added)

**Python/cloud deployments:**
- Container images (via digest pinning)
- Terraform providers (via lock file)
- Python packages (via hash checking in pip)

## Getting checksums

### Python.org
1. Go to release page (e.g., https://www.python.org/downloads/release/python-31210/)
2. Click "Files" section
3. Find Windows AMD64 installer
4. Click "MD5 sums" link → shows SHA256

### GitHub releases
```bash
curl -sL https://github.com/org/repo/releases/download/v1.0.0/file.exe.sha256
```

### Manual verification
```bash
# Linux/macOS
sha256sum file.exe

# PowerShell (Windows)
(Get-FileHash file.exe).Hash
```

## Security notes

**⚠️ Always verify checksums from official sources:**
- Python: python.org
- Git: github.com/git-for-windows
- gcloud: cloud.google.com

**Don't trust:**
- Third-party mirrors
- CDNs without HTTPS
- Checksums from unofficial sites

## Updating checksums

When updating versions in `setup_windows.ps1`:

1. Download new version manually
2. Compute hash: `(Get-FileHash installer.exe).Hash`
3. Compare with official hash from vendor site
4. Update `$expectedSHA256` variable
5. Remove `$skipVerification` logic

## Example

```powershell
# Current Python installer (placeholder)
$pythonVersion = "3.12.10"
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-amd64.exe"
$expectedSHA256 = "PLACEHOLDER_UPDATE_WITH_REAL_HASH"

# After verification enabled
Verify-Download -FilePath $installerPath -ExpectedSHA256 $expectedSHA256 -Description "Python $pythonVersion"
```

## Failure handling

If checksum fails:
- Download aborted
- Shows expected vs actual hash
- Suggests manual verification
- Offers retry option

## References

- NIST SP 800-186 (hash algorithms)
- SLSA Supply Chain Levels
- Python PEP 458 (secure package distribution)
