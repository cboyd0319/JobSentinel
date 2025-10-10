#!/usr/bin/env python3
"""
Enterprise-grade configuration management with multi-source support.

Implements a flexible configuration abstraction that supports:
- Multiple configuration sources (files, environment, remote)
- Schema validation and type safety
- Runtime configuration updates
- Hierarchical configuration merging
- Environment-specific overrides
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod

try:
    import yaml

    HAS_YAML = True
except ImportError:
    HAS_YAML = False
import logging
from collections.abc import Callable
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from utils.dependency_injection import IConfigurationProvider


class ConfigurationSourceType(Enum):
    """Types of configuration sources."""

    FILE = "file"
    ENVIRONMENT = "environment"
    REMOTE = "remote"
    MEMORY = "memory"
    VAULT = "vault"


@dataclass
class ConfigurationSource:
    """Describes a configuration source."""

    name: str
    source_type: ConfigurationSourceType
    location: str
    priority: int = 100
    readonly: bool = False
    format: str = "json"  # json, yaml, env, etc.
    refresh_interval: int | None = None  # seconds


class ConfigurationException(Exception):
    """Configuration-related exceptions."""



class IConfigurationSource(ABC):
    """Abstract interface for configuration sources."""

    @abstractmethod
    def load(self) -> dict[str, Any]:
        """Load configuration from the source."""

    @abstractmethod
    def save(self, config: dict[str, Any]) -> None:
        """Save configuration to the source."""

    @abstractmethod
    def can_save(self) -> bool:
        """Check if this source supports saving."""

    @abstractmethod
    def should_refresh(self) -> bool:
        """Check if this source needs refreshing."""


class FileConfigurationSource(IConfigurationSource):
    """File-based configuration source supporting JSON and YAML."""

    def __init__(self, source: ConfigurationSource):
        self.source = source
        self.path = Path(source.location)
        self._last_modified: float | None = None

    def load(self) -> dict[str, Any]:
        """Load configuration from file."""
        if not self.path.exists():
            return {}

        try:
            with open(self.path, encoding="utf-8") as f:
                if self.source.format.lower() in ("yaml", "yml"):
                    if not HAS_YAML:
                        raise ConfigurationException("YAML support requires 'pyyaml' package")
                    return yaml.safe_load(f) or {}
                else:
                    return json.load(f) or {}
        except (json.JSONDecodeError, yaml.YAMLError) as e:
            raise ConfigurationException(f"Error parsing {self.path}: {e}") from e
        except Exception as e:
            raise ConfigurationException(f"Error reading {self.path}: {e}") from e

    def save(self, config: dict[str, Any]) -> None:
        """Save configuration to file."""
        if self.source.readonly:
            raise ConfigurationException(f"Configuration source {self.source.name} is readonly")

        try:
            # Ensure directory exists
            self.path.parent.mkdir(parents=True, exist_ok=True)

            with open(self.path, "w", encoding="utf-8") as f:
                if self.source.format.lower() in ("yaml", "yml"):
                    if not HAS_YAML:
                        raise ConfigurationException("YAML support requires 'pyyaml' package")
                    yaml.safe_dump(config, f, indent=2, default_flow_style=False)
                else:
                    json.dump(config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            raise ConfigurationException(f"Error writing {self.path}: {e}") from e

    def can_save(self) -> bool:
        """Check if file source can be saved to."""
        return not self.source.readonly

    def should_refresh(self) -> bool:
        """Check if file has been modified since last load."""
        if not self.path.exists():
            return False

        current_mtime = self.path.stat().st_mtime
        if self._last_modified is None or current_mtime > self._last_modified:
            self._last_modified = current_mtime
            return True

        return False


class EnvironmentConfigurationSource(IConfigurationSource):
    """Environment variable configuration source."""

    def __init__(self, source: ConfigurationSource):
        self.source = source
        self.prefix = source.location  # Use location as environment prefix

    def load(self) -> dict[str, Any]:
        """Load configuration from environment variables."""
        config = {}

        for key, value in os.environ.items():
            if self.prefix and not key.startswith(self.prefix):
                continue

            # Remove prefix and convert to nested dict
            config_key = key[len(self.prefix) :].lstrip("_") if self.prefix else key
            config_path = config_key.lower().split("_")

            # Set nested value
            current = config
            for part in config_path[:-1]:
                current = current.setdefault(part, {})

            # Try to parse as JSON for complex values
            try:
                current[config_path[-1]] = json.loads(value)
            except (json.JSONDecodeError, ValueError):
                current[config_path[-1]] = value

        return config

    def save(self, config: dict[str, Any]) -> None:
        """Environment variables cannot be persisted."""
        raise ConfigurationException("Environment configuration source is readonly")

    def can_save(self) -> bool:
        """Environment variables cannot be saved to."""
        return False

    def should_refresh(self) -> bool:
        """Environment variables don't need explicit refresh."""
        return False


class MemoryConfigurationSource(IConfigurationSource):
    """In-memory configuration source for runtime overrides."""

    def __init__(
        self, source: ConfigurationSource, initial_config: dict[str, Any] | None = None
    ):
        self.source = source
        self._config = initial_config or {}

    def load(self) -> dict[str, Any]:
        """Return in-memory configuration."""
        return self._config.copy()

    def save(self, config: dict[str, Any]) -> None:
        """Update in-memory configuration."""
        self._config = config.copy()

    def can_save(self) -> bool:
        """Memory source is always writable."""
        return True

    def should_refresh(self) -> bool:
        """Memory source doesn't need refresh."""
        return False


class SchemaValidator:
    """Configuration schema validation."""

    def __init__(self, schema: dict[str, Any]):
        self.schema = schema

    def validate(self, config: dict[str, Any]) -> list[str]:
        """
        Validate configuration against schema.

        Returns list of validation errors.
        """
        errors = []
        self._validate_recursive(config, self.schema, "", errors)
        return errors

    def _validate_recursive(self, config: Any, schema: Any, path: str, errors: list[str]) -> None:
        """Recursively validate configuration."""
        if isinstance(schema, dict):
            if "type" in schema:
                # Validate type
                expected_type = schema["type"]
                if not self._check_type(config, expected_type):
                    errors.append(f"{path}: Expected {expected_type}, got {type(config).__name__}")
                    return

            if "properties" in schema and isinstance(config, dict):
                # Validate object properties
                for prop_name, prop_schema in schema["properties"].items():
                    prop_path = f"{path}.{prop_name}" if path else prop_name

                    if prop_name in config:
                        self._validate_recursive(config[prop_name], prop_schema, prop_path, errors)
                    elif schema.get("required", {}).get(prop_name, False):
                        errors.append(f"{prop_path}: Required property missing")

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """Check if value matches expected type."""
        type_map = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "object": dict,
            "array": list,
        }

        expected_python_type = type_map.get(expected_type)
        if expected_python_type is None:
            return True  # Unknown type, skip validation

        return isinstance(value, expected_python_type)


class ConfigurationManager(IConfigurationProvider):
    """
    Multi-source configuration manager with validation and hot-reload.

    Manages configuration from multiple sources with priority-based merging,
    schema validation, and runtime updates.
    """

    def __init__(self, logger: logging.Logger | None = None):
        self.logger = logger or logging.getLogger(__name__)
        self._sources: list[IConfigurationSource] = []
        self._source_metadata: list[ConfigurationSource] = []
        self._merged_config: dict[str, Any] = {}
        self._schema_validator: SchemaValidator | None = None
        self._change_listeners: list[Callable[[dict[str, Any]], None]] = []

    def add_source(self, source: ConfigurationSource) -> ConfigurationManager:
        """Add a configuration source."""
        # Create appropriate source implementation
        if source.source_type == ConfigurationSourceType.FILE:
            impl = FileConfigurationSource(source)
        elif source.source_type == ConfigurationSourceType.ENVIRONMENT:
            impl = EnvironmentConfigurationSource(source)
        elif source.source_type == ConfigurationSourceType.MEMORY:
            impl = MemoryConfigurationSource(source)
        else:
            raise ConfigurationException(f"Unsupported source type: {source.source_type}")

        self._sources.append(impl)
        self._source_metadata.append(source)

        # Sort by priority (higher priority first)
        sorted_pairs = sorted(
            zip(self._sources, self._source_metadata, strict=False), key=lambda x: x[1].priority, reverse=True
        )
        self._sources, self._source_metadata = zip(*sorted_pairs, strict=False)
        self._sources = list(self._sources)
        self._source_metadata = list(self._source_metadata)

        return self

    def set_schema(self, schema: dict[str, Any]) -> ConfigurationManager:
        """Set configuration validation schema."""
        self._schema_validator = SchemaValidator(schema)
        return self

    def add_change_listener(
        self, listener: Callable[[dict[str, Any]], None]
    ) -> ConfigurationManager:
        """Add listener for configuration changes."""
        self._change_listeners.append(listener)
        return self

    def load_configuration(self) -> None:
        """Load and merge configuration from all sources."""
        merged_config = {}

        # Load from sources in reverse priority order (lower priority first)
        for source_impl, source_meta in reversed(list(zip(self._sources, self._source_metadata, strict=False))):
            try:
                source_config = source_impl.load()
                merged_config = self._deep_merge(merged_config, source_config)
                self.logger.debug(f"Loaded configuration from {source_meta.name}")
            except Exception as e:
                self.logger.error(f"Error loading configuration from {source_meta.name}: {e}")

        # Validate merged configuration
        if self._schema_validator:
            errors = self._schema_validator.validate(merged_config)
            if errors:
                error_msg = "Configuration validation failed: " + "; ".join(errors)
                raise ConfigurationException(error_msg)

        # Update merged config and notify listeners
        old_config = self._merged_config
        self._merged_config = merged_config

        if old_config != merged_config:
            for listener in self._change_listeners:
                try:
                    listener(merged_config)
                except Exception as e:
                    self.logger.error(f"Error in configuration change listener: {e}")

    def reload(self) -> None:
        """Reload configuration from all sources."""
        self.load_configuration()

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by dot-separated key."""
        keys = key.split(".")
        current = self._merged_config

        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                return default

        return current

    def get_section(self, section: str) -> dict[str, Any]:
        """Get entire configuration section."""
        return self.get(section, {})

    def set(self, key: str, value: Any) -> None:
        """Set configuration value (saves to first writable source)."""
        for source_impl, _source_meta in zip(self._sources, self._source_metadata, strict=False):
            if source_impl.can_save():
                # Load current config from this source
                current_config = source_impl.load()

                # Set the new value
                keys = key.split(".")
                current = current_config
                for k in keys[:-1]:
                    current = current.setdefault(k, {})
                current[keys[-1]] = value

                # Save back to source
                source_impl.save(current_config)

                # Reload merged configuration
                self.load_configuration()
                return

        raise ConfigurationException("No writable configuration source available")

    def _deep_merge(self, base: dict[str, Any], update: dict[str, Any]) -> dict[str, Any]:
        """Deep merge two dictionaries."""
        result = base.copy()

        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value

        return result

    def get_all(self) -> dict[str, Any]:
        """Get complete merged configuration."""
        return self._merged_config.copy()

    @contextmanager
    def configuration_context(self, overrides: dict[str, Any]):
        """Context manager for temporary configuration overrides."""
        # Create temporary memory source with highest priority
        temp_source = ConfigurationSource(
            name="temporary_override",
            source_type=ConfigurationSourceType.MEMORY,
            location="memory",
            priority=1000,  # Highest priority
        )

        temp_impl = MemoryConfigurationSource(temp_source, overrides)

        # Add temporary source
        self._sources.insert(0, temp_impl)
        self._source_metadata.insert(0, temp_source)

        try:
            # Reload with temporary overrides
            self.load_configuration()
            yield self
        finally:
            # Remove temporary source and reload
            self._sources.pop(0)
            self._source_metadata.pop(0)
            self.load_configuration()


# Factory function for common configuration setups
def create_configuration_manager(
    config_files: list[str], env_prefix: str | None = None, schema_file: str | None = None
) -> ConfigurationManager:
    """Create a configuration manager with common sources."""
    manager = ConfigurationManager()

    # Add file sources
    for i, config_file in enumerate(config_files):
        path = Path(config_file)
        format_type = "yaml" if path.suffix.lower() in (".yml", ".yaml") else "json"

        source = ConfigurationSource(
            name=f"file_{i}",
            source_type=ConfigurationSourceType.FILE,
            location=config_file,
            priority=100 + i,  # Later files have higher priority
            format=format_type,
        )
        manager.add_source(source)

    # Add environment source
    if env_prefix:
        env_source = ConfigurationSource(
            name="environment",
            source_type=ConfigurationSourceType.ENVIRONMENT,
            location=env_prefix,
            priority=200,  # Environment has higher priority than files
        )
        manager.add_source(env_source)

    # Load schema if provided
    if schema_file and Path(schema_file).exists():
        with open(schema_file, encoding="utf-8") as f:
            schema = json.load(f)
        manager.set_schema(schema)

    return manager


# Export public API
__all__ = [
    "ConfigurationSourceType",
    "ConfigurationSource",
    "ConfigurationException",
    "IConfigurationSource",
    "ConfigurationManager",
    "create_configuration_manager",
]
