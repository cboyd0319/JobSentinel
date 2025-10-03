# Architecture

This document provides an overview of the Job Finder's architecture, including the scraping layer and the database schema.

## Scraping Architecture

The scraping layer is designed to be modular and extensible. Each job board has its own scraper, which is a subclass of the `JobBoardScraper` base class.

### Core Components

*   `sources/job_scraper_base.py`: Defines the `JobBoardScraper` base class and common data normalization functions.
*   `sources/job_scraper.py`: The main entry point for the scraping process. It contains a registry of all available scrapers and selects the appropriate one for a given URL.
*   `sources/greenhouse_scraper.py`, `sources/api_based_scrapers.py`, etc.: Individual scrapers for specific job boards.
*   `sources/playwright_scraper.py`: A fallback scraper that uses Playwright to handle JavaScript-heavy sites.

### Data Flow

The scraping process follows this general flow:

1.  A URL is passed to the `JobBoardRegistry`.
2.  The registry selects the appropriate scraper based on the URL's domain.
3.  The selected scraper fetches the job postings from the URL and normalizes the data into a consistent format.
4.  If a specific scraper fails, the registry falls back to the `PlaywrightScraper`.

## Database Schema

The application uses SQLite for local data storage. The database schema is defined using SQLModel.

### `job` Table

This is the main table for storing job postings.

```sql
CREATE TABLE job (
    id INTEGER PRIMARY KEY,
    hash VARCHAR UNIQUE,
    title VARCHAR,
    url VARCHAR,
    company VARCHAR,
    location VARCHAR,
    description TEXT,
    score FLOAT,
    score_reasons TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    last_seen DATETIME,
    times_seen INTEGER,
    included_in_digest BOOLEAN,
    digest_sent_at DATETIME,
    immediate_alert_sent BOOLEAN,
    alert_sent_at DATETIME
);
```

### `UserProfile` Table

This table stores the user's profile information, such as their skills, job titles, and salary expectations.

```sql
CREATE TABLE userprofile (
    id INTEGER NOT NULL, 
    name VARCHAR, 
    email VARCHAR, 
    skills JSON, 
    seniority JSON, 
    salary_min INTEGER, 
    salary_max INTEGER, 
    work_preferences JSON, 
    notification_threshold INTEGER, 
    PRIMARY KEY (id)
);
```
