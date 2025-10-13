---
name: Bug report
about: Something broke
title: '[BUG] '
labels: bug
assignees: ''
---

## What broke
Brief description.

## Reproduce
```bash
python -m jsa.cli run-once
```

## Expected vs actual
Expected: Jobs found and scored
Actual: Crashes with TypeError

## Environment
- OS: macOS 14.1
- Python: 3.13.0
- Version: 0.6.0

## Logs
```
Paste error logs here
```

## Config (remove secrets)
```json
{
  "keywords": ["python"],
  "job_sources": {"jobswithgpt": {"enabled": true}}
}
```
