# Troubleshooting

Use this guide for common setup and runtime issues. Platform-specific guides:

- Windows: [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md)
- macOS: [MACOS_TROUBLESHOOTING.md](./MACOS_TROUBLESHOOTING.md)

## General Tips

- Verify Python: `python --version` (3.12+)
- Create/activate venv before installing
- Check config at `deploy/common/config/user_prefs.json`
- Inspect logs printed by CLI/GUI
- Re-run installers if files moved

## Common Issues

- Permission denied: run from a writable directory; avoid system paths
- Missing Playwright: `playwright install chromium`
- Missing config: copy example configs and edit
- Network timeouts: re-run later; respect job board rate limits

