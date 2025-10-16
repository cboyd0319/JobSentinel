# macOS Deployment Checklist

Use this checklist when validating a JobSentinel install on a new Mac, an Apple Silicon lab, or before handing the system to a teammate.

| Item | Status | Notes |
|------|--------|-------|
| ✅ macOS 12 Monterey or later (Sonoma/Sequoia preferred) | ☐ | Run `sw_vers -productVersion` |
| ✅ Apple Silicon Rosetta (if running Intel-only tools) | ☐ | `softwareupdate --install-rosetta` |
| ✅ Python 3.11/3.12 installed via python.org or Homebrew | ☐ | `python3 --version` |
| ✅ JobSentinel repository cloned/unzipped to `~/JobSentinel` | ☐ | |
| ✅ `.venv` virtual environment created by `setup.command` | ☐ | Verify `.venv/bin/python3` exists |
| ✅ Playwright Chromium installed | ☐ | `./.venv/bin/python -m playwright install --list` |
| ✅ Desktop shortcuts present | ☐ | `Run JobSentinel.command`, `JobSentinel Launcher.command`, etc. |
| ✅ JobSentinel GUI launches | ☐ | Double-click `JobSentinel Launcher.command` |
| ✅ Health check passes | ☐ | `.venv/bin/python -m jsa.cli health` |
| ✅ Notifications tested (email/Slack/etc.) | ☐ | Run `.venv/bin/python -m jsa.cli run-once --dry-run` |
| ✅ Automatic scheduling configured | ☐ | Calendar alert or `launchd` plist |
| ✅ Data directory backed up | ☐ | `data/jobs.sqlite` copied to secure location |
| ✅ Gatekeeper exceptions documented | ☐ | Record that `.command` files were allowed |

## Final Handoff Notes

- **Owner:** ______________________________________
- **Last validation date:** _________________________
- **Notes / TODOs:**
  - _____________________________________________________
  - _____________________________________________________
  - _____________________________________________________

Keep this checklist with the machine or in your IT documentation. It helps new teammates ramp up with confidence.
