from __future__ import annotations

import json
from pathlib import Path

import pytest

try:
    import jsonschema

    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False


@pytest.fixture
def schema_path() -> Path:
    """Get path to config schema."""
    return Path("config/user_prefs.schema.json")


@pytest.fixture
def valid_config() -> dict:
    """Return a minimal valid configuration."""
    return {
        "companies": [
            {
                "id": "example",
                "board_type": "greenhouse",
                "url": "https://boards.greenhouse.io/example",
            }
        ],
        "title_allowlist": ["Engineer", "Developer"],
    }


@pytest.fixture
def schema(schema_path: Path) -> dict:
    """Load JSON schema."""
    if not schema_path.exists():
        pytest.skip(f"Schema file not found: {schema_path}")
    with open(schema_path, encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
def test_schema_validates_minimal_config(schema: dict, valid_config: dict):
    """Test that minimal valid config passes schema validation."""
    jsonschema.validate(instance=valid_config, schema=schema)


@pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
def test_schema_validates_full_config(schema: dict, valid_config: dict):
    """Test that config with all optional fields passes schema validation."""
    full_config = {
        **valid_config,
        "title_blocklist": ["Manager", "Director"],
        "keywords_boost": ["Python", "AWS"],
        "keywords_exclude": ["recruiter"],
        "location_preferences": {
            "allow_remote": True,
            "allow_hybrid": False,
            "allow_onsite": True,
            "cities": ["San Francisco"],
            "states": ["CA"],
            "country": "US",
        },
        "salary_floor_usd": 100000,
        "immediate_alert_threshold": 0.9,
        "digest_min_score": 0.7,
        "max_companies_per_run": 15,
        "fetch_descriptions": True,
        "use_llm": False,
        "llm_weight": 0.5,
        "mcp_servers": {"jobswithgpt": {"enabled": True, "priority": 1}},
    }
    jsonschema.validate(instance=full_config, schema=schema)


@pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
def test_schema_rejects_missing_required_field(schema: dict):
    """Test that schema rejects config missing required fields."""
    invalid_config = {"companies": []}  # missing title_allowlist
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_config, schema=schema)


@pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
def test_schema_rejects_invalid_board_type(schema: dict, valid_config: dict):
    """Test that schema rejects invalid board_type."""
    invalid_config = {
        **valid_config,
        "companies": [
            {
                "id": "example",
                "board_type": "invalid_type",  # not in enum
                "url": "https://example.com",
            }
        ],
    }
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_config, schema=schema)


@pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
def test_schema_rejects_invalid_threshold(schema: dict, valid_config: dict):
    """Test that schema rejects threshold values outside 0-1 range."""
    invalid_config = {**valid_config, "immediate_alert_threshold": 1.5}  # > 1
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_config, schema=schema)


@pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
def test_schema_rejects_negative_salary(schema: dict, valid_config: dict):
    """Test that schema rejects negative salary values."""
    invalid_config = {**valid_config, "salary_floor_usd": -1000}
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_config, schema=schema)


@pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
def test_schema_accepts_example_config(schema: dict):
    """Test that the example config file validates against schema."""
    example_path = Path("config/user_prefs.example.json")
    if not example_path.exists():
        pytest.skip(f"Example config not found: {example_path}")

    with open(example_path, encoding="utf-8") as f:
        example_config = json.load(f)

    # Remove comments if present (not valid JSON but may be in file)
    if "_comment" in example_config:
        del example_config["_comment"]

    jsonschema.validate(instance=example_config, schema=schema)
