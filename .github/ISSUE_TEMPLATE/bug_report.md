---
name: Bug report
about: Something broke
title: '[BUG] '
labels: bug
assignees: ''
---

**What broke:**
Brief description of the issue.

**How to reproduce:**
```bash
# Commands that trigger the bug
python src/agent.py --dry-run
```

**Expected vs actual:**
Expected: Jobs found and scored  
Actual: Crashes with TypeError

**Environment:**
- OS: macOS 14.1  
- Python: 3.12.0
- Install method: Manual

**Logs:**
```
# Paste relevant error logs here
```

**Config (remove API keys):**
```json
{
  "keywords": ["python"],
  "job_sources": {"jobswithgpt": {"enabled": true}}
}
```
