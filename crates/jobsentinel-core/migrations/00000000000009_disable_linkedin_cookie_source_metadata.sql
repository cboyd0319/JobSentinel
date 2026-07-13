-- LinkedIn no longer uses stored cookie/auth metadata. Legacy credential keys
-- remain readable only for cleanup and redaction paths.
UPDATE scraper_config
SET requires_auth = 0,
    auth_type = NULL
WHERE scraper_name = 'linkedin';
