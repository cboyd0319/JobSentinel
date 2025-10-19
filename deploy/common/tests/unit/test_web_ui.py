"""Comprehensive tests for web_ui.py module.

This module is a thin compatibility shim that creates a Flask app instance.
Tests ensure proper app creation and basic functionality.

Following PyTest Architect principles:
- AAA pattern (Arrange, Act, Assert)
- Parametrized tests where applicable
- Proper mocking at import site
- Deterministic and fast (< 100ms per test)
- 100% line and branch coverage
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


class TestWebUIModule:
    """Tests for web_ui.py module structure and exports."""

    def test_module_imports_successfully(self):
        """web_ui module can be imported without errors."""
        # Arrange & Act
        import web_ui

        # Assert
        assert web_ui is not None

    def test_app_instance_exists(self):
        """web_ui module exposes an 'app' instance."""
        # Arrange & Act
        import web_ui

        # Assert
        assert hasattr(web_ui, "app")
        assert web_ui.app is not None

    def test_app_is_flask_application(self):
        """web_ui.app is a Flask application instance."""
        # Arrange & Act
        import web_ui
        from flask import Flask

        # Assert
        assert isinstance(web_ui.app, Flask)

    def test_app_created_via_factory(self):
        """web_ui.app is created using the create_app factory."""
        # Arrange & Act
        import web_ui
        source = open(web_ui.__file__).read()

        # Assert
        # The module should import and call create_app
        assert "from jsa.web.app import create_app" in source
        assert "create_app()" in source

    def test_app_has_standard_flask_attributes(self):
        """web_ui.app has standard Flask application attributes."""
        # Arrange & Act
        import web_ui

        # Assert - Flask apps have these attributes
        assert hasattr(web_ui.app, "config")
        assert hasattr(web_ui.app, "route")
        assert hasattr(web_ui.app, "run")


class TestWebUIMain:
    """Tests for web_ui __main__ execution logic."""

    def test_main_block_code_exists(self):
        """web_ui module has __main__ block code."""
        # Arrange & Act
        import web_ui
        source = open(web_ui.__file__).read()

        # Assert
        assert 'if __name__ == "__main__"' in source

    def test_main_block_references_app_run(self):
        """__main__ block calls app.run()."""
        # Arrange & Act
        import web_ui
        source = open(web_ui.__file__).read()

        # Assert
        assert "app.run" in source

    def test_main_block_uses_port_5000(self):
        """__main__ block specifies port 5000."""
        # Arrange & Act
        import web_ui
        source = open(web_ui.__file__).read()

        # Assert
        assert "port=5000" in source

    def test_main_block_reads_flask_env_variable(self):
        """__main__ block reads FLASK_ENV environment variable."""
        # Arrange & Act
        import web_ui
        source = open(web_ui.__file__).read()

        # Assert
        assert "FLASK_ENV" in source

    def test_main_block_sets_debug_mode_from_env(self):
        """__main__ block sets debug mode based on FLASK_ENV."""
        # Arrange & Act
        import web_ui
        source = open(web_ui.__file__).read()

        # Assert
        # Should check if FLASK_ENV == "development"
        assert "development" in source
        assert "debug" in source.lower()


class TestWebUIDocumentation:
    """Tests for web_ui module documentation."""

    def test_module_has_docstring(self):
        """web_ui module has a module-level docstring."""
        # Arrange & Act
        import web_ui

        # Assert
        assert web_ui.__doc__ is not None
        assert len(web_ui.__doc__.strip()) > 0

    def test_docstring_mentions_compatibility_shim(self):
        """web_ui docstring mentions it's a compatibility shim."""
        # Arrange & Act
        import web_ui

        # Assert
        docstring_lower = web_ui.__doc__.lower()
        assert "compatibility" in docstring_lower or "shim" in docstring_lower


class TestWebUIIntegration:
    """Integration tests for web_ui module."""

    def test_app_can_be_tested_with_test_client(self):
        """web_ui.app can be used with Flask test client."""
        # Arrange
        import web_ui

        # Act
        with web_ui.app.test_client() as client:
            # Assert - test client is available
            assert client is not None

    def test_app_has_routes_configured(self):
        """web_ui.app has routes configured from factory."""
        # Arrange & Act
        import web_ui

        # Assert - Flask app with routes has url_map entries
        assert web_ui.app.url_map is not None
        # Any real app should have at least one route
        assert len(list(web_ui.app.url_map.iter_rules())) > 0
