# Architecture Notes

I rewrote the scraping layer to keep each job board adapter small and predictable. Here’s the quick tour so you can extend it without reading every file.

## Core pieces

- `sources/job_scraper_base.py` defines `JobBoardScraper` plus a couple of helpers for normalizing data
- `sources/job_scraper.py` keeps a registry of scrapers and picks the right one for each URL
- `sources/greenhouse_scraper.py` handles Greenhouse boards
- `sources/api_based_scrapers.py` covers Microsoft, SpaceX, and any other API-first boards I’ve mapped
- `sources/playwright_scraper.py` is the fallback for JS-heavy sites and does lightweight API discovery

## Happy-path flow

```text
URL → JobBoardRegistry → selected scraper → normalized jobs
```

Scrapers return dictionaries with consistent keys (`title`, `company`, `location`, etc.), which keeps the scoring logic in `matchers/` simple.

## Adding another board

1. Subclass `JobBoardScraper`
2. Implement `scrape()` and return a list of normalized jobs
3. Register the class in `sources/__init__.py` (or directly in `job_scraper.py` if it’s a one-off)
4. Drop an example entry into `config/user_prefs.example.json`
5. Add tests under `tests/` once the suite grows

```python
from sources.job_scraper_base import JobBoardScraper

class MyBoard(JobBoardScraper):
    def __init__(self) -> None:
        super().__init__(name="My Board", base_domains=["jobs.myboard.com"])

    def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        # fetch and normalize here
        return []
```

## When things go wrong

- If a specific scraper raises, the registry falls back to the Playwright scraper
- If Playwright can’t find anything useful, you’ll get an empty list instead of a crash
- Logs call out which scraper ran so you can debug quickly

If you spot a better pattern or want to refactor a scraper, please note it in the PR so I can test it against the boards I monitor.
