-- Add missing scraper configurations
INSERT OR IGNORE INTO scraper_config (scraper_name, display_name, requires_auth, auth_type, scraper_type, rate_limit_per_hour) VALUES
    ('usajobs', 'USAJobs', 1, 'api_key', 'api', 500),
    ('simplyhired', 'SimplyHired', 0, NULL, 'html', 300),
    ('glassdoor', 'Glassdoor', 0, NULL, 'html', 300);
