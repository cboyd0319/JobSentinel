#!/usr/bin/env python3
"""
Enterprise-grade plugin architecture for extensible error handling and processing.

Implements a comprehensive plugin system that allows:
- Dynamic error handler registration
- Custom error type plugins
- Configurable error processing pipelines
- Runtime plugin discovery and loading
"""

from __future__ import annotations

import importlib
import inspect
import logging
import pkgutil
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Set, Type

from utils.dependency_injection import ILogger


class PluginLifecycle(Enum):
    """Plugin lifecycle states."""

    DISCOVERED = "discovered"
    LOADING = "loading"
    LOADED = "loaded"
    ACTIVE = "active"
    ERROR = "error"
    DISABLED = "disabled"


@dataclass
class PluginMetadata:
    """Metadata describing a plugin."""

    name: str
    version: str
    description: str
    author: str
    priority: int = 100
    dependencies: List[str] = field(default_factory=list)
    tags: Set[str] = field(default_factory=set)
    config_schema: Optional[Dict[str, Any]] = None


class IPlugin(Protocol):
    """Base plugin interface."""

    @property
    def metadata(self) -> PluginMetadata: ...

    def initialize(self, config: Dict[str, Any]) -> None: ...
    def shutdown(self) -> None: ...


class IErrorHandlerPlugin(IPlugin):
    """Interface for error handler plugins."""

    def can_handle(self, error: Exception, context: Dict[str, Any]) -> bool: ...
    def handle_error(self, error: Exception, context: Dict[str, Any]) -> bool: ...
    def get_priority(self) -> int: ...


class IErrorTypePlugin(IPlugin):
    """Interface for custom error type plugins."""

    def get_error_classes(self) -> List[Type[Exception]]: ...
    def create_error(self, error_code: str, message: str, **kwargs) -> Exception: ...


class IErrorProcessorPlugin(IPlugin):
    """Interface for error processing pipeline plugins."""

    def process_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]: ...
    def get_processing_stage(self) -> str: ...  # "pre", "main", "post"


@dataclass
class PluginDescriptor:
    """Complete plugin descriptor with metadata and runtime info."""

    metadata: PluginMetadata
    plugin_class: Type[IPlugin]
    instance: Optional[IPlugin] = None
    lifecycle: PluginLifecycle = PluginLifecycle.DISCOVERED
    error_message: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)


class PluginRegistry:
    """Central registry for plugin discovery, loading, and management."""

    def __init__(self, logger: Optional[ILogger] = None):
        self.logger = logger or logging.getLogger(__name__)
        self._plugins: Dict[str, PluginDescriptor] = {}
        self._error_handlers: List[IErrorHandlerPlugin] = []
        self._error_types: Dict[str, IErrorTypePlugin] = {}
        self._processors: Dict[str, List[IErrorProcessorPlugin]] = {
            "pre": [],
            "main": [],
            "post": [],
        }
        self._plugin_paths: List[Path] = []

    def add_plugin_path(self, path: Path) -> None:
        """Add a directory to search for plugins."""
        if path.exists() and path.is_dir():
            self._plugin_paths.append(path)

    def discover_plugins(self, package_name: Optional[str] = None) -> int:
        """
        Discover plugins from configured paths or specified package.

        Returns the number of plugins discovered.
        """
        discovered_count = 0

        if package_name:
            discovered_count += self._discover_from_package(package_name)

        for plugin_path in self._plugin_paths:
            discovered_count += self._discover_from_path(plugin_path)

        self.logger.info(f"Discovered {discovered_count} plugins")
        return discovered_count

    def _discover_from_package(self, package_name: str) -> int:
        """Discover plugins from a Python package."""
        try:
            package = importlib.import_module(package_name)
            discovered = 0

            for _, module_name, _ in pkgutil.iter_modules(package.__path__, package_name + "."):
                discovered += self._discover_from_module(module_name)

            return discovered
        except ImportError as e:
            self.logger.warning(f"Could not import plugin package {package_name}: {e}")
            return 0

    def _discover_from_path(self, path: Path) -> int:
        """Discover plugins from a filesystem path."""
        discovered = 0

        for py_file in path.glob("*.py"):
            if py_file.name.startswith("__"):
                continue

            try:
                # Dynamic module loading from file path
                spec = importlib.util.spec_from_file_location(py_file.stem, py_file)
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    discovered += self._discover_from_module_object(module)
            except Exception as e:
                self.logger.warning(f"Error loading plugin from {py_file}: {e}")

        return discovered

    def _discover_from_module(self, module_name: str) -> int:
        """Discover plugins from a module name."""
        try:
            module = importlib.import_module(module_name)
            return self._discover_from_module_object(module)
        except ImportError as e:
            self.logger.warning(f"Could not import plugin module {module_name}: {e}")
            return 0

    def _discover_from_module_object(self, module: Any) -> int:
        """Discover plugins from a loaded module object."""
        discovered = 0

        for name, obj in inspect.getmembers(module, inspect.isclass):
            if (
                obj != IPlugin
                and issubclass(obj, (IErrorHandlerPlugin, IErrorTypePlugin, IErrorProcessorPlugin))
                and hasattr(obj, "metadata")
            ):

                # Create plugin descriptor
                try:
                    metadata = (
                        obj.metadata
                        if isinstance(obj.metadata, PluginMetadata)
                        else PluginMetadata(**obj.metadata)
                    )
                    descriptor = PluginDescriptor(metadata=metadata, plugin_class=obj)

                    self._plugins[metadata.name] = descriptor
                    discovered += 1

                    self.logger.debug(f"Discovered plugin: {metadata.name} v{metadata.version}")

                except Exception as e:
                    self.logger.error(f"Error creating plugin descriptor for {name}: {e}")

        return discovered

    def load_plugin(self, plugin_name: str, config: Optional[Dict[str, Any]] = None) -> bool:
        """Load and initialize a specific plugin."""
        if plugin_name not in self._plugins:
            self.logger.error(f"Plugin {plugin_name} not found")
            return False

        descriptor = self._plugins[plugin_name]

        try:
            descriptor.lifecycle = PluginLifecycle.LOADING

            # Check dependencies
            if not self._check_dependencies(descriptor):
                descriptor.lifecycle = PluginLifecycle.ERROR
                descriptor.error_message = "Dependency check failed"
                return False

            # Create plugin instance
            plugin_config = config or descriptor.config
            descriptor.instance = descriptor.plugin_class()
            descriptor.instance.initialize(plugin_config)

            descriptor.lifecycle = PluginLifecycle.LOADED
            descriptor.config = plugin_config

            # Register plugin by type
            self._register_plugin_by_type(descriptor.instance)

            self.logger.info(f"Loaded plugin: {plugin_name}")
            return True

        except Exception as e:
            descriptor.lifecycle = PluginLifecycle.ERROR
            descriptor.error_message = str(e)
            self.logger.error(f"Error loading plugin {plugin_name}: {e}")
            return False

    def _check_dependencies(self, descriptor: PluginDescriptor) -> bool:
        """Check if plugin dependencies are satisfied."""
        for dep in descriptor.metadata.dependencies:
            if dep not in self._plugins:
                self.logger.error(
                    f"Plugin {descriptor.metadata.name} depends on {dep} which is not available"
                )
                return False

            dep_descriptor = self._plugins[dep]
            if dep_descriptor.lifecycle not in (PluginLifecycle.LOADED, PluginLifecycle.ACTIVE):
                self.logger.error(
                    f"Plugin {descriptor.metadata.name} depends on {dep} which is not loaded"
                )
                return False

        return True

    def _register_plugin_by_type(self, plugin: IPlugin) -> None:
        """Register plugin in appropriate type-specific registry."""
        if isinstance(plugin, IErrorHandlerPlugin):
            self._error_handlers.append(plugin)
            self._error_handlers.sort(key=lambda p: p.get_priority(), reverse=True)

        if isinstance(plugin, IErrorTypePlugin):
            self._error_types[plugin.metadata.name] = plugin

        if isinstance(plugin, IErrorProcessorPlugin):
            stage = plugin.get_processing_stage()
            if stage in self._processors:
                self._processors[stage].append(plugin)
                self._processors[stage].sort(key=lambda p: p.metadata.priority, reverse=True)

    def load_all_plugins(self, config: Optional[Dict[str, Dict[str, Any]]] = None) -> int:
        """Load all discovered plugins with optional per-plugin configuration."""
        loaded_count = 0
        config = config or {}

        # Sort plugins by priority and dependencies
        sorted_plugins = self._topological_sort()

        for plugin_name in sorted_plugins:
            plugin_config = config.get(plugin_name, {})
            if self.load_plugin(plugin_name, plugin_config):
                loaded_count += 1

        self.logger.info(f"Loaded {loaded_count} plugins")
        return loaded_count

    def _topological_sort(self) -> List[str]:
        """Sort plugins by dependencies using topological sort."""
        # Simplified implementation - in production would use proper topological sort
        plugin_names = list(self._plugins.keys())

        # Sort by priority for now (dependencies would require full graph analysis)
        plugin_names.sort(key=lambda name: self._plugins[name].metadata.priority, reverse=True)

        return plugin_names

    def get_error_handlers(self) -> List[IErrorHandlerPlugin]:
        """Get all loaded error handler plugins."""
        return self._error_handlers.copy()

    def get_error_types(self) -> Dict[str, IErrorTypePlugin]:
        """Get all loaded error type plugins."""
        return self._error_types.copy()

    def get_processors(self, stage: str) -> List[IErrorProcessorPlugin]:
        """Get all processors for a specific stage."""
        return self._processors.get(stage, []).copy()

    def get_plugin_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all plugins."""
        return {
            name: {
                "metadata": descriptor.metadata,
                "lifecycle": descriptor.lifecycle.value,
                "error": descriptor.error_message,
                "active": descriptor.instance is not None,
            }
            for name, descriptor in self._plugins.items()
        }

    def shutdown_all_plugins(self) -> None:
        """Shutdown all loaded plugins."""
        for descriptor in self._plugins.values():
            if descriptor.instance:
                try:
                    descriptor.instance.shutdown()
                    descriptor.lifecycle = PluginLifecycle.DISABLED
                except Exception as e:
                    self.logger.error(f"Error shutting down plugin {descriptor.metadata.name}: {e}")


class ErrorProcessingPipeline:
    """Configurable error processing pipeline using plugins."""

    def __init__(self, registry: PluginRegistry, logger: Optional[ILogger] = None):
        self.registry = registry
        self.logger = logger or logging.getLogger(__name__)

    def process_error(self, error: Exception, context: Dict[str, Any]) -> bool:
        """
        Process error through the plugin pipeline.

        Returns True if error was handled, False otherwise.
        """
        # Pre-processing stage
        for processor in self.registry.get_processors("pre"):
            try:
                context = processor.process_error(error, context)
            except Exception as e:
                self.logger.error(f"Error in pre-processor {processor.metadata.name}: {e}")

        # Main processing stage (error handlers)
        handled = False
        for handler in self.registry.get_error_handlers():
            try:
                if handler.can_handle(error, context):
                    if handler.handle_error(error, context):
                        handled = True
                        break
            except Exception as e:
                self.logger.error(f"Error in handler {handler.metadata.name}: {e}")

        # Post-processing stage
        for processor in self.registry.get_processors("post"):
            try:
                context = processor.process_error(error, context)
            except Exception as e:
                self.logger.error(f"Error in post-processor {processor.metadata.name}: {e}")

        return handled


# Global plugin registry
_registry = PluginRegistry()


def get_plugin_registry() -> PluginRegistry:
    """Get the global plugin registry."""
    return _registry


# Export public API
__all__ = [
    "PluginLifecycle",
    "PluginMetadata",
    "IPlugin",
    "IErrorHandlerPlugin",
    "IErrorTypePlugin",
    "IErrorProcessorPlugin",
    "PluginRegistry",
    "ErrorProcessingPipeline",
    "get_plugin_registry",
]
