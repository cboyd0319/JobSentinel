# Windows Troubleshooting

For the full guide, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

Windows-specific notes:
- Execution policy error in PowerShell:
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- Ports in use: use `--port 5001` (or another free port).
- If Python isn’t found, install from python.org and check “Add to PATH”.

