# CI Pipeline Template (Reference Only)

Because direct modification of `.github/` workflows is currently out-of-scope, this document provides a recommended GitHub Actions pipeline you can copy into `.github/workflows/ci.yml`.

## Goals
- Fast feedback (lint + type + tests)
- Optional matrix across Python versions (3.11–3.13)
- Cache dependencies to reduce cost/time
- Build (sdist/wheel) smoke check

## Recommended Workflow YAML
```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read

jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [ '3.11', '3.12', '3.13' ]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'

      - name: Install core + dev extras
        run: |
          python -m pip install --upgrade pip
          python -m pip install -e .[dev,resume]

      - name: Lint (Ruff)
        run: ruff check .

      - name: Type Check (mypy subset)
        run: mypy utils/ats_analyzer.py scripts/ats_cli.py

      - name: Tests
        run: pytest -q --cov=utils --cov-report=xml

      - name: Build package
        run: python -m build

      - name: Upload coverage
        if: always()
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.xml
          flags: unittests
          fail_ci_if_error: false

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      - name: Install minimal deps
        run: |
          python -m pip install --upgrade pip
          python -m pip install bandit safety
      - name: Bandit Scan
        run: bandit -c config/bandit.yaml -r . || true
      - name: Safety Vulnerability Check
        run: safety check -r requirements.txt || true
```

## Optional Additions
- Job scraping integration tests (spin up mock HTTP server)
- Slack webhook smoke test (if test channel configured via secret)
- Publish Docker image on tagged release
- Cache Playwright browsers (if used in CI; evaluate cost vs benefit)

## Secrets Referenced (If Added Later)
| Secret | Purpose |
|--------|---------|
| `SLACK_WEBHOOK` | Optional Slack notification for pipeline summary |
| `CODECOV_TOKEN` | Coverage uploads (if not public repo) |

## Local Parity Helper
You can create a `make ci` target locally mimicking the above steps before pushing.

---
*Template: adapt to evolving architecture; keep minimal + fast.*
