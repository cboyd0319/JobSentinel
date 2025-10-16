# Examples

Runnable demos for JobSentinel features.

## Basic

| File | What it does |
|------|--------------|
| [jobswithgpt_demo.py](jobswithgpt_demo.py) | Search 500K+ jobs via JobsWithGPT MCP |
| [reed_jobs_demo.py](reed_jobs_demo.py) | Search UK jobs via Reed API |
| [jobspy_demo.py](jobspy_demo.py) | Multi-board search via JobSpy MCP |

## Advanced

| File | What it does |
|------|--------------|
| [plugin_demo.py](plugin_demo.py) | Custom plugin system |
| [custom_scraper.py](custom_scraper.py) | Build your own scraper |
| [automated_workflow.py](automated_workflow.py) | Complete automation workflow |

## Run

```bash
# Basic job search
python examples/jobswithgpt_demo.py

# UK jobs (needs Reed API key)
python examples/reed_jobs_demo.py

# Custom scraper template
python examples/custom_scraper.py
```

## Prereqs

```bash
pip install -e .
cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json
# Edit config as needed
```

## Contributing

1. Create example in this directory
2. Add clear docstring
3. Update this README
4. Submit PR

See [../CONTRIBUTING.md](../CONTRIBUTING.md).
