# Job Scraper Architecture Documentation

## Overview

The job scraper has been refactored into a modular, extensible architecture that can handle any job board platform. The system automatically detects the best scraper for each URL and provides a unified interface for job data extraction.

## Architecture Components

### 1. 🏗️ Base Classes (`sources/job_scraper_base.py`)

**Core abstractions for all job board scrapers:**

- **`JobBoardScraper`**: Abstract base class for all scrapers
- **`APIDiscoveryMixin`**: Adds API discovery capabilities to any scraper
- **`GenericJobExtractor`**: Utilities for extracting and normalizing job data
- **`JobBoardRegistry`**: Central registry that routes URLs to appropriate scrapers

### 2. 🌱 Greenhouse Scraper (`sources/greenhouse_scraper.py`)

**Specialized scraper for Greenhouse-powered job boards:**

- Handles Greenhouse API endpoints
- Supports both board-level and individual job APIs
- Enhanced field extraction for Greenhouse-specific data
- Auto-detects Greenhouse boards by API availability

**Supported sites:** Fivetran, Klaviyo, and 1000+ other Greenhouse-powered job boards

### 3. 🔌 API-Based Scrapers (`sources/api_based_scrapers.py`)

**Scrapers for sites with discoverable APIs:**

- **`MicrosoftCareersScraper`**: Uses Microsoft's job search API
- **`SpaceXCareersScraper`**: Uses SpaceX's job posts API
- **`GenericAPIScraper`**: Handles unknown sites with discoverable APIs

### 4. 🎭 Playwright Scraper (`sources/playwright_scraper.py`)

**Dynamic content scraper with API discovery:**

- API discovery through network traffic monitoring
- Enhanced content extraction with site-specific selectors
- Fallback for JavaScript-heavy sites
- Supports Spectrum, Google, and generic job boards

### 5. 🎯 Unified Interface (`sources/job_scraper.py`)

**Main entry point for all job scraping:**

- Automatic scraper selection based on URL
- Backward compatibility with existing code
- Registry management and custom scraper support

## Usage Examples

### Basic Usage

```python
from sources.job_scraper import scrape_jobs

# Automatically selects the best scraper
jobs = scrape_jobs("https://www.fivetran.com/careers#jobs")
```

### Advanced Usage

```python
from sources.job_scraper import (
    scrape_jobs,
    list_supported_platforms,
    add_custom_scraper
)

# List all supported platforms
platforms = list_supported_platforms()
print(f"Supported: {platforms}")

# Add a custom scraper
from sources.my_custom_scraper import MyCustomScraper
add_custom_scraper(MyCustomScraper())

# Use with different options
jobs = scrape_jobs(url, fetch_descriptions=False)
```

### Creating Custom Scrapers

```python
from sources.job_scraper_base import JobBoardScraper

class MyJobBoardScraper(JobBoardScraper):
    def __init__(self):
        super().__init__(
            name="My Job Board",
            base_domains=["myjobboard.com"]
        )

    def scrape(self, board_url: str, fetch_descriptions: bool = True):
        # Implementation here
        return normalized_jobs
```

## Platform Support Matrix

| Platform Type | Example Sites | Scraper Used | API Support | Rich Metadata |
|---------------|---------------|--------------|-------------|---------------|
| **Greenhouse** | Fivetran, Klaviyo | `GreenhouseScraper` | ✅ Native API | ✅ Full |
| **Microsoft** | Microsoft Careers | `MicrosoftCareersScraper` | ✅ Discovered API | ✅ Full |
| **SpaceX** | SpaceX Careers | `SpaceXCareersScraper` | ✅ Discovered API | ✅ Full |
| **Dynamic Sites** | Spectrum, Google | `PlaywrightScraper` | 🔍 Auto-discovery | ⚠️ Limited |
| **Unknown** | Any other site | `PlaywrightScraper` | 🔍 Auto-discovery | ⚠️ Variable |

## Data Flow

```
URL Input
    ↓
JobBoardRegistry.get_scraper(url)
    ↓
Scraper Selection:
├── GreenhouseScraper (if Greenhouse detected)
├── MicrosoftCareersScraper (if Microsoft domain)
├── SpaceXCareersScraper (if SpaceX domain)
└── PlaywrightScraper (fallback)
    ↓
Raw Data Extraction
    ↓
GenericJobExtractor.normalize_job_data()
    ↓
Normalized Job Objects
```

## Configuration

### Scraper Priority

Scrapers are registered in order of specificity:

1. **Most Specific**: Platform-specific scrapers (Microsoft, SpaceX)
2. **API-Based**: Greenhouse scraper (auto-detects compatible sites)
3. **Most Generic**: Playwright scraper (handles everything else)

### Adding New Platforms

To add support for a new job board:

1. **Create a new scraper class** extending `JobBoardScraper`
2. **Implement the `scrape()` method**
3. **Register it in the registry** (in `job_scraper.py`)
4. **Use `GenericJobExtractor.normalize_job_data()`** for consistent output

## Error Handling

The system provides graceful fallbacks:

- If a specific scraper fails → Falls back to Playwright scraper
- If API discovery fails → Falls back to content extraction
- If content extraction fails → Returns empty list (no crashes)

## Performance Considerations

- **Greenhouse API**: Fastest (direct JSON)
- **Discovered APIs**: Fast (direct JSON after discovery)
- **Playwright scraping**: Slower (browser automation)
- **Content extraction**: Slowest (full page rendering + parsing)

## Backward Compatibility

The original `sources/greenhouse.py` module remains functional but is deprecated:

```python
# OLD WAY (still works)
from sources.greenhouse import scrape
jobs = scrape("https://example.com/jobs")

# NEW WAY (recommended)
from sources.job_scraper import scrape_jobs
jobs = scrape_jobs("https://example.com/jobs")
```

## Future Extensibility

The architecture supports:

- **Easy addition of new job boards**
- **Machine learning for selector optimization**
- **Advanced API discovery techniques**
- **Custom data enrichment pipelines**
- **Multi-threading and async processing**

## Testing

Each scraper can be tested independently:

```python
# Test specific scraper
from sources.greenhouse_scraper import GreenhouseScraper
scraper = GreenhouseScraper()
jobs = scraper.scrape("https://www.fivetran.com/careers#jobs")

# Test unified interface
from sources.job_scraper import scrape_jobs
jobs = scrape_jobs("https://any-job-board.com")
```
