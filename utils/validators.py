"""
Input validation schemas for MCP servers.

Prevents injection attacks and malformed data.
Cost: FREE (uses existing Pydantic dependency)
Impact: HIGH (blocks injection attacks)
"""

import re
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, constr, validator


class JobSearchRequest(BaseModel):
    """Validated request for job search operations."""

    keywords: List[constr(min_length=1, max_length=100)] = Field(
        default_factory=list, description="Search keywords (max 100 chars each)"
    )

    locations: Optional[List[Dict[str, str]]] = Field(default=None, description="Location filters")

    page: int = Field(default=1, ge=1, le=100, description="Page number (1-100)")

    distance: Optional[int] = Field(
        default=50000, ge=1000, le=200000, description="Search radius in meters (1km - 200km)"
    )

    @validator("keywords")
    def validate_keywords(cls, v):
        """Prevent injection attacks in keywords."""
        if not v:
            return v

        # Block dangerous patterns
        dangerous_patterns = [
            r"[;&|`$()]",  # Shell metacharacters
            r"\.\.",  # Path traversal
            r"<script",  # XSS
            r"javascript:",  # XSS
            r"DROP\s+TABLE",  # SQL injection
            r"UNION\s+SELECT",  # SQL injection
            r"exec\s*\(",  # Code execution
            r"eval\s*\(",  # Code execution
            r"__import__",  # Python injection
            r"subprocess",  # Command execution
        ]

        for keyword in v:
            for pattern in dangerous_patterns:
                if re.search(pattern, keyword, re.IGNORECASE):
                    raise ValueError(f"Dangerous pattern detected in keyword: {pattern}")

        return v

    @validator("locations")
    def validate_locations(cls, v):
        """Validate location format."""
        if not v:
            return v

        for loc in v:
            if not isinstance(loc, dict):
                raise ValueError("Each location must be a dictionary")

            # Allowed keys
            allowed_keys = {"city", "state", "country", "zip"}
            for key in loc.keys():
                if key not in allowed_keys:
                    raise ValueError(f"Invalid location key: {key}")

            # Validate values (no special characters)
            for key, value in loc.items():
                if not isinstance(value, str):
                    raise ValueError(f"Location {key} must be a string")

                if len(value) > 100:
                    raise ValueError(f"Location {key} too long (max 100 chars)")

                # Block dangerous patterns
                if re.search(r"[<>{};\x00-\x1f]", value):
                    raise ValueError(f"Invalid characters in location {key}")

        return v


class ReedJobSearchRequest(BaseModel):
    """Validated request for Reed.co.uk API."""

    keywords: Optional[constr(min_length=1, max_length=200)] = None

    location: Optional[constr(min_length=1, max_length=100)] = None

    distance_miles: int = Field(
        default=10, ge=1, le=100, description="Search radius in miles (1-100)"
    )

    minimum_salary: Optional[int] = Field(
        default=None, ge=0, le=1000000, description="Minimum salary in GBP (0-1M)"
    )

    maximum_salary: Optional[int] = Field(
        default=None, ge=0, le=1000000, description="Maximum salary in GBP (0-1M)"
    )

    results_to_take: int = Field(
        default=100, ge=1, le=100, description="Results per request (1-100)"
    )

    @validator("keywords")
    def validate_keywords(cls, v):
        """Sanitize keywords."""
        if not v:
            return v

        # Block shell/injection patterns
        if re.search(r"[;&|`$<>]", v):
            raise ValueError("Invalid characters in keywords")

        return v

    @validator("location")
    def validate_location(cls, v):
        """Sanitize location."""
        if not v:
            return v

        # Block shell/injection patterns
        if re.search(r"[;&|`$<>{}]", v):
            raise ValueError("Invalid characters in location")

        return v

    @validator("maximum_salary")
    def validate_salary_range(cls, v, values):
        """Ensure max >= min."""
        min_sal = values.get("minimum_salary")
        if min_sal and v and v < min_sal:
            raise ValueError("maximum_salary must be >= minimum_salary")
        return v


class JobSpySearchRequest(BaseModel):
    """Validated request for JobSpy MCP."""

    keywords: List[constr(min_length=1, max_length=100)] = Field(
        default_factory=list, description="Search keywords"
    )

    location: Optional[constr(min_length=1, max_length=200)] = None

    site_names: Optional[List[str]] = Field(default=None, description="Sites to search")

    results_wanted: int = Field(default=50, ge=1, le=100, description="Results per site (1-100)")

    hours_old: int = Field(
        default=72, ge=1, le=720, description="Job age in hours (1-720)"  # 30 days max
    )

    @validator("site_names")
    def validate_sites(cls, v):
        """Validate site names against allowlist."""
        if not v:
            return v

        # Allowlist of known sites
        allowed_sites = {"indeed", "linkedin", "zip_recruiter", "glassdoor", "google", "monster"}

        for site in v:
            if site not in allowed_sites:
                raise ValueError(f"Unknown site: {site}. Allowed: {allowed_sites}")

        return v

    @validator("keywords")
    def validate_keywords(cls, v):
        """Prevent injection in keywords."""
        dangerous_patterns = [
            r"[;&|`$()]",
            r"\.\.",
            r"<script",
        ]

        for keyword in v:
            for pattern in dangerous_patterns:
                if re.search(pattern, keyword, re.IGNORECASE):
                    raise ValueError(f"Dangerous pattern in keyword: {pattern}")

        return v


class MCPServerConfig(BaseModel):
    """Validated MCP server configuration."""

    enabled: bool = False

    server_path: Optional[str] = Field(default=None, description="Path to MCP server executable")

    allowed_networks: List[str] = Field(
        default_factory=list, description="Allowed network destinations (URLs or IPs)"
    )

    max_requests_per_hour: int = Field(
        default=100, ge=1, le=10000, description="Rate limit (1-10000 req/hr)"
    )

    timeout_seconds: int = Field(
        default=30, ge=5, le=300, description="Request timeout (5-300 seconds)"
    )

    @validator("server_path")
    def validate_server_path(cls, v):
        """Prevent path traversal in server path."""
        if not v:
            return v

        # Block path traversal
        if ".." in v:
            raise ValueError("Path traversal detected in server_path")

        # Must end in .js or .py (expected extensions)
        if not (v.endswith(".js") or v.endswith(".py")):
            raise ValueError("server_path must be .js or .py file")

        return v

    @validator("allowed_networks")
    def validate_networks(cls, v):
        """Validate network allowlist."""
        if not v:
            return v

        for network in v:
            # Must be HTTP/HTTPS URL or IP range
            if not (
                network.startswith("http://")
                or network.startswith("https://")
                or re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", network)
            ):
                raise ValueError(f"Invalid network: {network}")

        return v


# Convenience function for safe job search
def validate_job_search(
    keywords: List[str],
    locations: Optional[List[Dict]] = None,
    page: int = 1,
    distance: int = 50000,
) -> JobSearchRequest:
    """
    Validate and sanitize job search parameters.

    Raises:
        ValidationError: If parameters are invalid or dangerous

    Example:
        try:
            validated = validate_job_search(
                keywords=["python", "engineer"],
                locations=[{"city": "Denver", "state": "CO"}]
            )
            # Use validated.keywords, validated.locations, etc.
        except ValidationError as e:
            logger.error(f"Invalid search parameters: {e}")
    """
    return JobSearchRequest(keywords=keywords, locations=locations, page=page, distance=distance)


# Convenience function for Reed API
def validate_reed_search(
    keywords: Optional[str] = None, location: Optional[str] = None, **kwargs
) -> ReedJobSearchRequest:
    """Validate Reed API search parameters."""
    return ReedJobSearchRequest(keywords=keywords, location=location, **kwargs)


# Convenience function for JobSpy
def validate_jobspy_search(
    keywords: List[str], location: Optional[str] = None, **kwargs
) -> JobSpySearchRequest:
    """Validate JobSpy search parameters."""
    return JobSpySearchRequest(keywords=keywords, location=location, **kwargs)
