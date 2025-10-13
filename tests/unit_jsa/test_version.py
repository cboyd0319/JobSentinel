"""Test version consistency across the codebase."""

import tomllib
from pathlib import Path


def test_version_consistency():
    """Verify that all version references read from pyproject.toml."""
    # Read the source of truth
    project_root = Path(__file__).parent.parent.parent
    pyproject_path = project_root / "pyproject.toml"

    with open(pyproject_path, "rb") as f:
        data = tomllib.load(f)
    expected_version = data["project"]["version"]

    # Test jsa package version
    import sys

    sys.path.insert(0, str(project_root / "src"))
    import jsa

    assert (
        jsa.__version__ == expected_version
    ), f"jsa.__version__ is {jsa.__version__}, expected {expected_version}"

    # Test legacy src package version
    import importlib.util

    spec = importlib.util.spec_from_file_location("src_init", project_root / "src" / "__init__.py")
    src_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(src_module)
    assert (
        src_module.__version__ == expected_version
    ), f"src.__version__ is {src_module.__version__}, expected {expected_version}"


def test_version_format():
    """Verify that version follows semantic versioning format."""
    import sys
    from pathlib import Path

    project_root = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(project_root / "src"))
    import jsa

    # Basic semantic versioning regex: MAJOR.MINOR.PATCH
    import re

    semver_pattern = r"^\d+\.\d+\.\d+$"
    assert re.match(
        semver_pattern, jsa.__version__
    ), f"Version {jsa.__version__} does not follow semantic versioning format (X.Y.Z)"


def test_pyproject_toml_version_exists():
    """Verify that pyproject.toml contains a version field."""
    project_root = Path(__file__).parent.parent.parent
    pyproject_path = project_root / "pyproject.toml"

    with open(pyproject_path, "rb") as f:
        data = tomllib.load(f)

    assert "project" in data, "pyproject.toml missing [project] section"
    assert "version" in data["project"], "pyproject.toml missing project.version field"
    assert isinstance(data["project"]["version"], str), "version must be a string"
    assert len(data["project"]["version"]) > 0, "version cannot be empty"
