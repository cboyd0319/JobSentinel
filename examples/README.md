# JobSentinel Examples

This directory contains practical examples demonstrating how to use JobSentinel for various scenarios.

---

## 📋 Available Examples

### Basic Usage

| Example | Description | Difficulty |
|---------|-------------|------------|
| [jobswithgpt_demo.py](jobswithgpt_demo.py) | Search 500K+ jobs via JobsWithGPT MCP | Beginner |
| [reed_jobs_demo.py](reed_jobs_demo.py) | Search UK jobs via Reed API | Beginner |
| [jobspy_demo.py](jobspy_demo.py) | Multi-board search via JobSpy MCP | Beginner |

### Advanced Integration

| Example | Description | Difficulty |
|---------|-------------|------------|
| [plugin_demo.py](plugin_demo.py) | Custom plugin system | Advanced |
| [custom_scraper.py](custom_scraper.py) | Build your own job board scraper | Intermediate |
| [automated_workflow.py](automated_workflow.py) | Complete automation workflow | Intermediate |

### Production Patterns

| Example | Description | Difficulty |
|---------|-------------|------------|
| [production_monitoring.py](production_monitoring.py) | Metrics and observability | Advanced |
| [multi_instance_deployment.py](multi_instance_deployment.py) | Horizontal scaling | Advanced |

---

## 🚀 Quick Start

### 1. Basic Job Search

```python
# Search for Python jobs
from sources.jobswithgpt_mcp_client import search_jobs_mcp
import asyncio

async def main():
    jobs = await search_jobs_mcp(
        keywords=["python", "backend"],
        locations=[{"name": "Remote"}],
        distance=50000
    )
    
    print(f"Found {len(jobs)} jobs")
    for job in jobs[:5]:
        print(f"- {job['title']} at {job['company']}")

asyncio.run(main())
```

### 2. Automated Workflow

```python
# Complete automation: scrape → score → alert
from jsa.cli import run_once
from utils.config import load_config

config = load_config("config/user_prefs.json")
run_once(config)
```

### 3. Custom Scraper

See [custom_scraper.py](custom_scraper.py) for a complete example of building your own job board integration.

---

## 📚 Learning Path

### For Beginners
1. Start with [jobswithgpt_demo.py](jobswithgpt_demo.py)
2. Try [reed_jobs_demo.py](reed_jobs_demo.py) (requires API key)
3. Experiment with filters and preferences

### For Developers
1. Study [plugin_demo.py](plugin_demo.py)
2. Build your own scraper with [custom_scraper.py](custom_scraper.py)
3. Implement automated workflow [automated_workflow.py](automated_workflow.py)

### For Production
1. Set up monitoring with [production_monitoring.py](production_monitoring.py)
2. Deploy with [multi_instance_deployment.py](multi_instance_deployment.py)
3. Follow [DEPLOYMENT_GUIDE.md](../docs/DEPLOYMENT_GUIDE.md)

---

## 🔧 Running Examples

### Prerequisites

```bash
# Install dependencies
pip install -e .[dev]

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Configure preferences
cp config/user_prefs.example.json config/user_prefs.json
# Edit config/user_prefs.json
```

### Run an Example

```bash
# Basic example
python examples/jobswithgpt_demo.py

# With custom config
python examples/automated_workflow.py --config my_config.json

# With verbose logging
LOG_LEVEL=DEBUG python examples/production_monitoring.py
```

---

## 📝 Example Template

Use this template to create your own examples:

```python
#!/usr/bin/env python3
"""
Example: [Brief Description]

This example demonstrates:
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

Requirements:
- Python 3.13+
- [Additional dependencies]

Usage:
    python examples/your_example.py

Author: [Your Name]
License: MIT
"""

import asyncio
from utils.logging import get_logger

logger = get_logger(__name__)

async def main():
    """Main example function."""
    logger.info("Starting example...")
    
    # Your code here
    
    logger.info("Example completed!")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🤝 Contributing Examples

Have a useful example to share? Please contribute!

1. Create your example in this directory
2. Follow the template above
3. Add documentation and comments
4. Update this README
5. Submit a pull request

See [CONTRIBUTING.md](../docs/governance/CONTRIBUTING.md) for guidelines.

---

## 📞 Getting Help

- **Documentation:** [docs/DOCUMENTATION_INDEX.md](../docs/DOCUMENTATION_INDEX.md)
- **Best Practices:** [docs/BEST_PRACTICES.md](../docs/BEST_PRACTICES.md)
- **API Guide:** [docs/API_INTEGRATION_GUIDE.md](../docs/API_INTEGRATION_GUIDE.md)
- **Issues:** [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)

---

**Last Updated:** October 13, 2025  
**Version:** 0.6.0  
**License:** MIT
