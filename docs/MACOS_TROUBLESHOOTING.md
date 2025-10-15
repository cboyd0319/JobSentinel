# macOS Troubleshooting

For the full guide, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

macOS-specific notes:
- Gatekeeper blocks scripts: Right-click → Open → Open
- After `brew install python@3.12`, add to PATH if needed:
  ```bash
  echo 'export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  ```

