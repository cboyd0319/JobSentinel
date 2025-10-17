"""
Comprehensive tests for utils/validators.py module.

Tests cover:
- JobSearchRequest validation
- ReedJobSearchRequest validation
- JobSpySearchRequest validation
- MCPServerConfig validation
- Injection attack prevention
- Edge cases and error handling
"""

import pytest
from pydantic import ValidationError

from utils.validators import (
    JobSearchRequest,
    JobSpySearchRequest,
    MCPServerConfig,
    ReedJobSearchRequest,
    validate_job_search,
    validate_jobspy_search,
    validate_reed_search,
)


class TestJobSearchRequest:
    """Tests for JobSearchRequest validator."""

    def test_create_with_defaults(self):
        """JobSearchRequest creates with default values."""
        request = JobSearchRequest()
        assert request.keywords == []
        assert request.locations is None
        assert request.page == 1
        assert request.distance == 50000

    def test_create_with_valid_keywords(self):
        """JobSearchRequest accepts valid keywords."""
        request = JobSearchRequest(keywords=["python", "engineer"])
        assert request.keywords == ["python", "engineer"]

    def test_create_with_valid_locations(self):
        """JobSearchRequest accepts valid locations."""
        locations = [{"city": "Denver", "state": "CO"}]
        request = JobSearchRequest(locations=locations)
        assert request.locations == locations

    def test_create_with_all_fields(self):
        """JobSearchRequest stores all provided fields."""
        request = JobSearchRequest(
            keywords=["python", "remote"],
            locations=[{"city": "Seattle", "state": "WA"}],
            page=2,
            distance=100000,
        )
        assert request.keywords == ["python", "remote"]
        assert request.page == 2
        assert request.distance == 100000

    @pytest.mark.parametrize(
        "page",
        [1, 50, 100],
        ids=["min", "middle", "max"],
    )
    def test_page_accepts_valid_range(self, page):
        """JobSearchRequest accepts pages in valid range (1-100)."""
        request = JobSearchRequest(page=page)
        assert request.page == page

    def test_page_rejects_zero(self):
        """JobSearchRequest rejects page 0."""
        with pytest.raises(ValidationError):
            JobSearchRequest(page=0)

    def test_page_rejects_negative(self):
        """JobSearchRequest rejects negative page."""
        with pytest.raises(ValidationError):
            JobSearchRequest(page=-1)

    def test_page_rejects_over_limit(self):
        """JobSearchRequest rejects page over 100."""
        with pytest.raises(ValidationError):
            JobSearchRequest(page=101)

    @pytest.mark.parametrize(
        "distance",
        [1000, 50000, 200000],
        ids=["min", "middle", "max"],
    )
    def test_distance_accepts_valid_range(self, distance):
        """JobSearchRequest accepts distance in valid range."""
        request = JobSearchRequest(distance=distance)
        assert request.distance == distance

    def test_distance_rejects_below_min(self):
        """JobSearchRequest rejects distance below 1km."""
        with pytest.raises(ValidationError):
            JobSearchRequest(distance=999)

    def test_distance_rejects_above_max(self):
        """JobSearchRequest rejects distance above 200km."""
        with pytest.raises(ValidationError):
            JobSearchRequest(distance=200001)


class TestJobSearchRequestKeywordValidation:
    """Tests for keyword injection attack prevention."""

    @pytest.mark.parametrize(
        "dangerous_keyword",
        [
            "python; rm -rf /",
            "test & whoami",
            "keyword | cat /etc/passwd",
            "data `malicious`",
            "test $(evil)",
            "keyword $var",
            "test()",
        ],
        ids=["semicolon", "ampersand", "pipe", "backtick", "dollar_paren", "dollar", "parens"],
    )
    def test_keywords_reject_shell_metacharacters(self, dangerous_keyword):
        """JobSearchRequest rejects keywords with shell metacharacters."""
        with pytest.raises(ValidationError, match="Dangerous pattern"):
            JobSearchRequest(keywords=[dangerous_keyword])

    @pytest.mark.parametrize(
        "dangerous_keyword",
        [
            "../etc/passwd",
            "..\\windows\\system32",
            "test/../../../etc",
        ],
        ids=["unix", "windows", "multiple"],
    )
    def test_keywords_reject_path_traversal(self, dangerous_keyword):
        """JobSearchRequest rejects path traversal attempts."""
        with pytest.raises(ValidationError, match="Dangerous pattern"):
            JobSearchRequest(keywords=[dangerous_keyword])

    @pytest.mark.parametrize(
        "xss_keyword",
        [
            "<script>alert(1)</script>",
            "<SCRIPT>alert(1)</SCRIPT>",
            "javascript:alert(1)",
            "JavaScript:void(0)",
        ],
        ids=["script_lower", "script_upper", "javascript_lower", "javascript_mixed"],
    )
    def test_keywords_reject_xss_attempts(self, xss_keyword):
        """JobSearchRequest rejects XSS attempts."""
        with pytest.raises(ValidationError, match="Dangerous pattern"):
            JobSearchRequest(keywords=[xss_keyword])

    @pytest.mark.parametrize(
        "sql_keyword",
        [
            "test' DROP TABLE users--",
            "admin' UNION SELECT * FROM passwords--",
            "test drop table data",
            "data union select null",
        ],
        ids=["drop_quote", "union_quote", "drop_space", "union_space"],
    )
    def test_keywords_reject_sql_injection(self, sql_keyword):
        """JobSearchRequest rejects SQL injection attempts."""
        with pytest.raises(ValidationError, match="Dangerous pattern"):
            JobSearchRequest(keywords=[sql_keyword])

    @pytest.mark.parametrize(
        "code_keyword",
        [
            "exec('malicious')",
            "eval('danger')",
            "__import__('os')",
            "subprocess.call",
        ],
        ids=["exec", "eval", "import", "subprocess"],
    )
    def test_keywords_reject_code_execution(self, code_keyword):
        """JobSearchRequest rejects code execution attempts."""
        with pytest.raises(ValidationError, match="Dangerous pattern"):
            JobSearchRequest(keywords=[code_keyword])

    @pytest.mark.parametrize(
        "safe_keyword",
        [
            "python",
            "software engineer",
            "C++",
            "DevOps",
            "AI/ML",
            "Node.js",
            "React.js",
            "backend-developer",
            "full_stack",
            "senior-level",
        ],
        ids=[
            "simple",
            "space",
            "plus",
            "capital",
            "slash",
            "dot",
            "dotjs",
            "dash",
            "underscore",
            "hyphen",
        ],
    )
    def test_keywords_accept_safe_patterns(self, safe_keyword):
        """JobSearchRequest accepts safe keyword patterns."""
        request = JobSearchRequest(keywords=[safe_keyword])
        assert safe_keyword in request.keywords

    def test_keywords_empty_list_allowed(self):
        """JobSearchRequest allows empty keywords list."""
        request = JobSearchRequest(keywords=[])
        assert request.keywords == []

    def test_keywords_max_length_enforced(self):
        """JobSearchRequest enforces max keyword length (100 chars)."""
        long_keyword = "a" * 101
        with pytest.raises(ValidationError):
            JobSearchRequest(keywords=[long_keyword])


class TestJobSearchRequestLocationValidation:
    """Tests for location validation."""

    def test_locations_accepts_valid_dict(self):
        """JobSearchRequest accepts valid location dict."""
        locations = [{"city": "Denver", "state": "CO"}]
        request = JobSearchRequest(locations=locations)
        assert request.locations == locations

    def test_locations_accepts_multiple_entries(self):
        """JobSearchRequest accepts multiple locations."""
        locations = [
            {"city": "Denver", "state": "CO"},
            {"city": "Seattle", "state": "WA"},
        ]
        request = JobSearchRequest(locations=locations)
        assert len(request.locations) == 2

    @pytest.mark.parametrize(
        "key",
        ["city", "state", "country", "zip"],
        ids=["city", "state", "country", "zip"],
    )
    def test_locations_accepts_allowed_keys(self, key):
        """JobSearchRequest accepts all allowed location keys."""
        locations = [{key: "value"}]
        request = JobSearchRequest(locations=locations)
        assert request.locations == locations

    def test_locations_rejects_invalid_key(self):
        """JobSearchRequest rejects invalid location keys."""
        locations = [{"invalid_key": "value"}]
        with pytest.raises(ValidationError, match="Invalid location key"):
            JobSearchRequest(locations=locations)

    def test_locations_rejects_non_string_value(self):
        """JobSearchRequest rejects non-string location values."""
        locations = [{"city": 12345}]
        with pytest.raises(ValidationError, match="must be a string"):
            JobSearchRequest(locations=locations)

    def test_locations_rejects_too_long_value(self):
        """JobSearchRequest rejects location values over 100 chars."""
        locations = [{"city": "a" * 101}]
        with pytest.raises(ValidationError, match="too long"):
            JobSearchRequest(locations=locations)

    @pytest.mark.parametrize(
        "dangerous_char",
        ["<script>", "{}", ";DROP", "\x00null", "\x1fcontrol"],
        ids=["tag", "braces", "semicolon", "null_byte", "control_char"],
    )
    def test_locations_rejects_dangerous_characters(self, dangerous_char):
        """JobSearchRequest rejects dangerous characters in locations."""
        locations = [{"city": f"Denver{dangerous_char}"}]
        with pytest.raises(ValidationError, match="Invalid characters"):
            JobSearchRequest(locations=locations)

    def test_locations_rejects_non_dict(self):
        """JobSearchRequest rejects non-dict in locations list."""
        locations = ["not a dict"]
        with pytest.raises(ValidationError, match="must be a dictionary"):
            JobSearchRequest(locations=locations)


class TestReedJobSearchRequest:
    """Tests for ReedJobSearchRequest validator."""

    def test_create_with_defaults(self):
        """ReedJobSearchRequest creates with default values."""
        request = ReedJobSearchRequest()
        assert request.keywords is None
        assert request.location is None
        assert request.distance_miles == 10
        assert request.minimum_salary is None
        assert request.maximum_salary is None
        assert request.results_to_take == 100

    def test_create_with_all_fields(self):
        """ReedJobSearchRequest stores all fields."""
        request = ReedJobSearchRequest(
            keywords="python developer",
            location="London",
            distance_miles=25,
            minimum_salary=30000,
            maximum_salary=60000,
            results_to_take=50,
        )
        assert request.keywords == "python developer"
        assert request.location == "London"
        assert request.distance_miles == 25
        assert request.minimum_salary == 30000
        assert request.maximum_salary == 60000
        assert request.results_to_take == 50

    def test_keywords_max_length_enforced(self):
        """ReedJobSearchRequest enforces 200 char max on keywords."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(keywords="a" * 201)

    def test_location_max_length_enforced(self):
        """ReedJobSearchRequest enforces 100 char max on location."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(location="a" * 101)

    @pytest.mark.parametrize(
        "distance",
        [1, 50, 100],
        ids=["min", "middle", "max"],
    )
    def test_distance_accepts_valid_range(self, distance):
        """ReedJobSearchRequest accepts distance 1-100 miles."""
        request = ReedJobSearchRequest(distance_miles=distance)
        assert request.distance_miles == distance

    def test_distance_rejects_below_min(self):
        """ReedJobSearchRequest rejects distance below 1 mile."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(distance_miles=0)

    def test_distance_rejects_above_max(self):
        """ReedJobSearchRequest rejects distance above 100 miles."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(distance_miles=101)

    @pytest.mark.parametrize(
        "salary",
        [0, 50000, 1000000],
        ids=["min", "middle", "max"],
    )
    def test_salary_accepts_valid_range(self, salary):
        """ReedJobSearchRequest accepts salary 0-1M."""
        request = ReedJobSearchRequest(minimum_salary=salary, maximum_salary=salary)
        assert request.minimum_salary == salary

    def test_salary_rejects_negative(self):
        """ReedJobSearchRequest rejects negative salary."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(minimum_salary=-1)

    def test_salary_rejects_above_max(self):
        """ReedJobSearchRequest rejects salary above 1M."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(minimum_salary=1000001)

    def test_maximum_salary_must_be_gte_minimum(self):
        """ReedJobSearchRequest enforces max_salary >= min_salary."""
        with pytest.raises(ValidationError, match="maximum_salary must be >= minimum_salary"):
            ReedJobSearchRequest(minimum_salary=60000, maximum_salary=30000)

    def test_equal_min_max_salary_allowed(self):
        """ReedJobSearchRequest allows equal min and max salary."""
        request = ReedJobSearchRequest(minimum_salary=50000, maximum_salary=50000)
        assert request.minimum_salary == request.maximum_salary

    @pytest.mark.parametrize(
        "results",
        [1, 50, 100],
        ids=["min", "middle", "max"],
    )
    def test_results_accepts_valid_range(self, results):
        """ReedJobSearchRequest accepts results 1-100."""
        request = ReedJobSearchRequest(results_to_take=results)
        assert request.results_to_take == results

    def test_results_rejects_zero(self):
        """ReedJobSearchRequest rejects 0 results."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(results_to_take=0)

    def test_results_rejects_over_limit(self):
        """ReedJobSearchRequest rejects over 100 results."""
        with pytest.raises(ValidationError):
            ReedJobSearchRequest(results_to_take=101)

    @pytest.mark.parametrize(
        "dangerous_keyword",
        ["test;whoami", "data&rm", "test|cat", "key`cmd`", "val<script>", "test>file"],
        ids=["semicolon", "ampersand", "pipe", "backtick", "less_than", "greater_than"],
    )
    def test_keywords_rejects_dangerous_chars(self, dangerous_keyword):
        """ReedJobSearchRequest rejects dangerous characters in keywords."""
        with pytest.raises(ValidationError, match="Invalid characters"):
            ReedJobSearchRequest(keywords=dangerous_keyword)

    @pytest.mark.parametrize(
        "dangerous_location",
        ["London;rm", "NYC&whoami", "Seattle|cmd", "Denver`evil`", "city{}drop", "loc<script>"],
        ids=["semicolon", "ampersand", "pipe", "backtick", "braces", "script_tag"],
    )
    def test_location_rejects_dangerous_chars(self, dangerous_location):
        """ReedJobSearchRequest rejects dangerous characters in location."""
        with pytest.raises(ValidationError, match="Invalid characters"):
            ReedJobSearchRequest(location=dangerous_location)


class TestJobSpySearchRequest:
    """Tests for JobSpySearchRequest validator."""

    def test_create_with_defaults(self):
        """JobSpySearchRequest creates with defaults."""
        request = JobSpySearchRequest()
        assert request.keywords == []
        assert request.location is None
        assert request.site_names is None
        assert request.results_wanted == 50
        assert request.hours_old == 72

    def test_create_with_all_fields(self):
        """JobSpySearchRequest stores all fields."""
        request = JobSpySearchRequest(
            keywords=["python", "remote"],
            location="Remote",
            site_names=["indeed", "linkedin"],
            results_wanted=100,
            hours_old=24,
        )
        assert request.keywords == ["python", "remote"]
        assert request.location == "Remote"
        assert request.site_names == ["indeed", "linkedin"]
        assert request.results_wanted == 100
        assert request.hours_old == 24

    def test_keywords_max_length_enforced(self):
        """JobSpySearchRequest enforces 100 char max per keyword."""
        with pytest.raises(ValidationError):
            JobSpySearchRequest(keywords=["a" * 101])

    def test_location_max_length_enforced(self):
        """JobSpySearchRequest enforces 200 char max on location."""
        with pytest.raises(ValidationError):
            JobSpySearchRequest(location="a" * 201)

    @pytest.mark.parametrize(
        "results",
        [1, 50, 100],
        ids=["min", "middle", "max"],
    )
    def test_results_accepts_valid_range(self, results):
        """JobSpySearchRequest accepts results 1-100."""
        request = JobSpySearchRequest(results_wanted=results)
        assert request.results_wanted == results

    def test_results_rejects_zero(self):
        """JobSpySearchRequest rejects 0 results."""
        with pytest.raises(ValidationError):
            JobSpySearchRequest(results_wanted=0)

    def test_results_rejects_over_limit(self):
        """JobSpySearchRequest rejects over 100 results."""
        with pytest.raises(ValidationError):
            JobSpySearchRequest(results_wanted=101)

    @pytest.mark.parametrize(
        "hours",
        [1, 72, 720],
        ids=["min", "default", "max"],
    )
    def test_hours_accepts_valid_range(self, hours):
        """JobSpySearchRequest accepts hours 1-720 (30 days)."""
        request = JobSpySearchRequest(hours_old=hours)
        assert request.hours_old == hours

    def test_hours_rejects_zero(self):
        """JobSpySearchRequest rejects 0 hours."""
        with pytest.raises(ValidationError):
            JobSpySearchRequest(hours_old=0)

    def test_hours_rejects_over_max(self):
        """JobSpySearchRequest rejects hours over 720."""
        with pytest.raises(ValidationError):
            JobSpySearchRequest(hours_old=721)

    @pytest.mark.parametrize(
        "site",
        ["indeed", "linkedin", "zip_recruiter", "glassdoor", "google", "monster"],
        ids=["indeed", "linkedin", "zip_recruiter", "glassdoor", "google", "monster"],
    )
    def test_site_names_accepts_allowed_sites(self, site):
        """JobSpySearchRequest accepts all allowed sites."""
        request = JobSpySearchRequest(site_names=[site])
        assert site in request.site_names

    def test_site_names_rejects_unknown_site(self):
        """JobSpySearchRequest rejects unknown sites."""
        with pytest.raises(ValidationError, match="Unknown site"):
            JobSpySearchRequest(site_names=["unknown_site"])

    def test_site_names_accepts_multiple_allowed(self):
        """JobSpySearchRequest accepts multiple allowed sites."""
        sites = ["indeed", "linkedin", "glassdoor"]
        request = JobSpySearchRequest(site_names=sites)
        assert request.site_names == sites

    @pytest.mark.parametrize(
        "dangerous_keyword",
        ["test;cmd", "data&evil", "key|pipe", "val`cmd`", "<script>alert"],
        ids=["semicolon", "ampersand", "pipe", "backtick", "script"],
    )
    def test_keywords_rejects_dangerous_patterns(self, dangerous_keyword):
        """JobSpySearchRequest rejects dangerous patterns in keywords."""
        with pytest.raises(ValidationError, match="Dangerous pattern"):
            JobSpySearchRequest(keywords=[dangerous_keyword])

    def test_keywords_accepts_safe_patterns(self):
        """JobSpySearchRequest accepts safe keyword patterns."""
        safe_keywords = ["python", "software engineer", "remote work"]
        request = JobSpySearchRequest(keywords=safe_keywords)
        assert request.keywords == safe_keywords


class TestMCPServerConfig:
    """Tests for MCPServerConfig validator."""

    def test_create_with_defaults(self):
        """MCPServerConfig creates with defaults."""
        config = MCPServerConfig()
        assert config.enabled is False
        assert config.server_path is None
        assert config.allowed_networks == []
        assert config.max_requests_per_hour == 100
        assert config.timeout_seconds == 30

    def test_create_with_all_fields(self):
        """MCPServerConfig stores all fields."""
        config = MCPServerConfig(
            enabled=True,
            server_path="/path/to/server.js",
            allowed_networks=["https://api.example.com", "192.168.1.1"],
            max_requests_per_hour=500,
            timeout_seconds=60,
        )
        assert config.enabled is True
        assert config.server_path == "/path/to/server.js"
        assert len(config.allowed_networks) == 2
        assert config.max_requests_per_hour == 500
        assert config.timeout_seconds == 60

    @pytest.mark.parametrize(
        "rate",
        [1, 100, 10000],
        ids=["min", "default", "max"],
    )
    def test_max_requests_accepts_valid_range(self, rate):
        """MCPServerConfig accepts rate limit 1-10000."""
        config = MCPServerConfig(max_requests_per_hour=rate)
        assert config.max_requests_per_hour == rate

    def test_max_requests_rejects_zero(self):
        """MCPServerConfig rejects 0 requests per hour."""
        with pytest.raises(ValidationError):
            MCPServerConfig(max_requests_per_hour=0)

    def test_max_requests_rejects_over_limit(self):
        """MCPServerConfig rejects over 10000 requests."""
        with pytest.raises(ValidationError):
            MCPServerConfig(max_requests_per_hour=10001)

    @pytest.mark.parametrize(
        "timeout",
        [5, 30, 300],
        ids=["min", "default", "max"],
    )
    def test_timeout_accepts_valid_range(self, timeout):
        """MCPServerConfig accepts timeout 5-300 seconds."""
        config = MCPServerConfig(timeout_seconds=timeout)
        assert config.timeout_seconds == timeout

    def test_timeout_rejects_below_min(self):
        """MCPServerConfig rejects timeout below 5 seconds."""
        with pytest.raises(ValidationError):
            MCPServerConfig(timeout_seconds=4)

    def test_timeout_rejects_above_max(self):
        """MCPServerConfig rejects timeout above 300 seconds."""
        with pytest.raises(ValidationError):
            MCPServerConfig(timeout_seconds=301)

    @pytest.mark.parametrize(
        "path",
        ["/path/to/server.js", "/opt/mcp/server.py", "server.js", "mcp_server.py"],
        ids=["abs_js", "abs_py", "rel_js", "rel_py"],
    )
    def test_server_path_accepts_valid_paths(self, path):
        """MCPServerConfig accepts .js and .py files."""
        config = MCPServerConfig(server_path=path)
        assert config.server_path == path

    def test_server_path_rejects_path_traversal(self):
        """MCPServerConfig rejects path traversal attempts."""
        with pytest.raises(ValidationError, match="Path traversal"):
            MCPServerConfig(server_path="../etc/passwd")

    @pytest.mark.parametrize(
        "invalid_ext",
        ["/path/to/server.exe", "/path/to/config.json", "server.sh", "script"],
        ids=["exe", "json", "sh", "no_ext"],
    )
    def test_server_path_rejects_invalid_extensions(self, invalid_ext):
        """MCPServerConfig rejects non-.js/.py files."""
        with pytest.raises(ValidationError, match="must be .js or .py"):
            MCPServerConfig(server_path=invalid_ext)

    @pytest.mark.parametrize(
        "network",
        [
            "https://api.example.com",
            "http://localhost:8080",
            "192.168.1.1",
            "10.0.0.1",
        ],
        ids=["https_url", "http_url", "ip_private", "ip_internal"],
    )
    def test_allowed_networks_accepts_valid_entries(self, network):
        """MCPServerConfig accepts valid URLs and IPs."""
        config = MCPServerConfig(allowed_networks=[network])
        assert network in config.allowed_networks

    @pytest.mark.parametrize(
        "invalid_network",
        ["ftp://bad.com", "javascript:alert(1)", "file:///etc/passwd", "not_a_url"],
        ids=["ftp", "javascript", "file", "invalid"],
    )
    def test_allowed_networks_rejects_invalid_entries(self, invalid_network):
        """MCPServerConfig rejects invalid network entries."""
        with pytest.raises(ValidationError, match="Invalid network"):
            MCPServerConfig(allowed_networks=[invalid_network])


class TestConvenienceFunctions:
    """Tests for convenience validation functions."""

    def test_validate_job_search_returns_request(self):
        """validate_job_search returns JobSearchRequest."""
        result = validate_job_search(keywords=["python"])
        assert isinstance(result, JobSearchRequest)
        assert result.keywords == ["python"]

    def test_validate_job_search_with_all_params(self):
        """validate_job_search accepts all parameters."""
        result = validate_job_search(
            keywords=["python"],
            locations=[{"city": "Denver"}],
            page=2,
            distance=100000,
        )
        assert result.keywords == ["python"]
        assert result.page == 2
        assert result.distance == 100000

    def test_validate_job_search_raises_on_invalid(self):
        """validate_job_search raises ValidationError on invalid input."""
        with pytest.raises(ValidationError):
            validate_job_search(keywords=["test;DROP TABLE"])

    def test_validate_reed_search_returns_request(self):
        """validate_reed_search returns ReedJobSearchRequest."""
        result = validate_reed_search(keywords="python developer")
        assert isinstance(result, ReedJobSearchRequest)
        assert result.keywords == "python developer"

    def test_validate_reed_search_with_kwargs(self):
        """validate_reed_search accepts keyword arguments."""
        result = validate_reed_search(
            keywords="python", location="London", distance_miles=25, minimum_salary=50000
        )
        assert result.keywords == "python"
        assert result.location == "London"
        assert result.distance_miles == 25
        assert result.minimum_salary == 50000

    def test_validate_reed_search_raises_on_invalid(self):
        """validate_reed_search raises ValidationError on invalid input."""
        with pytest.raises(ValidationError):
            validate_reed_search(keywords="test;rm -rf")

    def test_validate_jobspy_search_returns_request(self):
        """validate_jobspy_search returns JobSpySearchRequest."""
        result = validate_jobspy_search(keywords=["python"])
        assert isinstance(result, JobSpySearchRequest)
        assert result.keywords == ["python"]

    def test_validate_jobspy_search_with_kwargs(self):
        """validate_jobspy_search accepts keyword arguments."""
        result = validate_jobspy_search(
            keywords=["python"], location="Remote", site_names=["indeed"], results_wanted=100
        )
        assert result.keywords == ["python"]
        assert result.location == "Remote"
        assert result.site_names == ["indeed"]
        assert result.results_wanted == 100

    def test_validate_jobspy_search_raises_on_invalid(self):
        """validate_jobspy_search raises ValidationError on invalid input."""
        with pytest.raises(ValidationError):
            validate_jobspy_search(keywords=["test`evil`"])


class TestEdgeCases:
    """Edge case and integration tests."""

    def test_empty_keywords_list_accepted(self):
        """Empty keywords list is valid."""
        request = JobSearchRequest(keywords=[])
        assert request.keywords == []

    def test_none_locations_accepted(self):
        """None locations is valid."""
        request = JobSearchRequest(locations=None)
        assert request.locations is None

    def test_unicode_in_keywords(self):
        """Unicode characters in keywords work correctly."""
        keywords = ["python", "développeur", "プログラマー"]
        request = JobSearchRequest(keywords=keywords)
        assert request.keywords == keywords

    def test_unicode_in_location(self):
        """Unicode in location works correctly."""
        location = "München"
        request = ReedJobSearchRequest(location=location)
        assert request.location == location

    def test_multiple_validation_errors(self):
        """Multiple validation errors are caught."""
        with pytest.raises(ValidationError) as exc_info:
            ReedJobSearchRequest(
                distance_miles=0,  # Too low
                minimum_salary=-1,  # Negative
                results_to_take=101,  # Too high
            )
        # Should have multiple errors
        errors = exc_info.value.errors()
        assert len(errors) >= 3

    def test_salary_range_validation_edge_case(self):
        """Salary validation handles edge cases."""
        # Equal salaries OK
        request = ReedJobSearchRequest(minimum_salary=50000, maximum_salary=50000)
        assert request.minimum_salary == request.maximum_salary

        # Only min set OK
        request = ReedJobSearchRequest(minimum_salary=50000)
        assert request.minimum_salary == 50000
        assert request.maximum_salary is None

        # Only max set OK
        request = ReedJobSearchRequest(maximum_salary=100000)
        assert request.maximum_salary == 100000
        assert request.minimum_salary is None

    def test_allowed_special_chars_in_keywords(self):
        """Allowed special characters work in keywords."""
        safe_keywords = ["C++", "Node.js", "AI/ML", "DevOps", "full-stack", "back_end"]
        request = JobSearchRequest(keywords=safe_keywords)
        assert request.keywords == safe_keywords

    def test_case_insensitive_injection_detection(self):
        """Injection detection is case-insensitive."""
        with pytest.raises(ValidationError):
            JobSearchRequest(keywords=["test UNION SELECT password"])

    def test_site_names_case_sensitive(self):
        """Site names validation is case-sensitive."""
        # Lowercase works
        request = JobSpySearchRequest(site_names=["indeed"])
        assert "indeed" in request.site_names

        # Mixed case should fail (allowlist is lowercase)
        with pytest.raises(ValidationError):
            JobSpySearchRequest(site_names=["Indeed"])
