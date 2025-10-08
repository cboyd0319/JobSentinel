#!/usr/bin/env python3
"""
Enterprise-grade dependency injection and interface abstraction layer.

Implements inversion of control for error handling, logging, and configuration
to enable true modularity, testability, and extensibility.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, Type, TypeVar

# Type variables for generic injection
T = TypeVar("T")
ServiceType = TypeVar("ServiceType")


class ServiceScope(Enum):
    """Service lifecycle scopes for dependency injection."""

    SINGLETON = "singleton"
    TRANSIENT = "transient"
    SCOPED = "scoped"


@dataclass
class ServiceDescriptor:
    """Describes how a service should be created and managed."""

    service_type: Type
    implementation: Optional[Type] = None
    factory: Optional[callable] = None
    instance: Optional[Any] = None
    scope: ServiceScope = ServiceScope.TRANSIENT
    dependencies: List[Type] = None

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []


class ServiceContainer:
    """
    Dependency injection container with service registration and resolution.

    Provides inversion of control for error handling, logging, and configuration
    enabling loose coupling and high testability.
    """

    def __init__(self):
        self._services: Dict[Type, ServiceDescriptor] = {}
        self._singletons: Dict[Type, Any] = {}
        self._scoped_instances: Dict[str, Dict[Type, Any]] = {}
        self._current_scope: Optional[str] = None

    def register_singleton(
        self,
        service_type: Type[T],
        implementation: Optional[Type[T]] = None,
        factory: Optional[callable] = None,
        instance: Optional[T] = None,
    ) -> "ServiceContainer":
        """Register a singleton service."""
        return self._register(
            service_type, implementation, factory, instance, ServiceScope.SINGLETON
        )

    def register_transient(
        self,
        service_type: Type[T],
        implementation: Optional[Type[T]] = None,
        factory: Optional[callable] = None,
    ) -> "ServiceContainer":
        """Register a transient service (new instance each time)."""
        return self._register(service_type, implementation, factory, None, ServiceScope.TRANSIENT)

    def register_scoped(
        self,
        service_type: Type[T],
        implementation: Optional[Type[T]] = None,
        factory: Optional[callable] = None,
    ) -> "ServiceContainer":
        """Register a scoped service (one instance per scope)."""
        return self._register(service_type, implementation, factory, None, ServiceScope.SCOPED)

    def _register(
        self,
        service_type: Type[T],
        implementation: Optional[Type[T]],
        factory: Optional[callable],
        instance: Optional[T],
        scope: ServiceScope,
    ) -> "ServiceContainer":
        """Internal registration method."""
        if sum(x is not None for x in [implementation, factory, instance]) != 1:
            raise ValueError("Exactly one of implementation, factory, or instance must be provided")

        descriptor = ServiceDescriptor(
            service_type=service_type,
            implementation=implementation,
            factory=factory,
            instance=instance,
            scope=scope,
        )

        self._services[service_type] = descriptor
        return self

    def resolve(self, service_type: Type[T]) -> T:
        """Resolve a service instance with dependency injection."""
        if service_type not in self._services:
            raise ValueError(f"Service {service_type} is not registered")

        descriptor = self._services[service_type]

        # Handle singleton scope
        if descriptor.scope == ServiceScope.SINGLETON:
            if service_type not in self._singletons:
                self._singletons[service_type] = self._create_instance(descriptor)
            return self._singletons[service_type]

        # Handle scoped instances
        elif descriptor.scope == ServiceScope.SCOPED:
            if not self._current_scope:
                raise ValueError("No active scope for scoped service")

            if self._current_scope not in self._scoped_instances:
                self._scoped_instances[self._current_scope] = {}

            scope_instances = self._scoped_instances[self._current_scope]
            if service_type not in scope_instances:
                scope_instances[service_type] = self._create_instance(descriptor)

            return scope_instances[service_type]

        # Handle transient instances
        else:
            return self._create_instance(descriptor)

    def _create_instance(self, descriptor: ServiceDescriptor) -> Any:
        """Create service instance with dependency injection."""
        # Use provided instance
        if descriptor.instance is not None:
            return descriptor.instance

        # Use factory function
        if descriptor.factory is not None:
            # Inject dependencies into factory if it requires them
            return descriptor.factory()

        # Use implementation class with constructor injection
        if descriptor.implementation is not None:
            # Get constructor dependencies
            dependencies = self._resolve_dependencies(descriptor.implementation)
            return descriptor.implementation(**dependencies)

        raise ValueError(f"Cannot create instance for {descriptor.service_type}")

    def _resolve_dependencies(self, implementation: Type) -> Dict[str, Any]:
        """Resolve constructor dependencies for implementation."""
        # Simplified dependency resolution - in production would use
        # inspection of __init__ parameters and type hints
        return {}

    def create_scope(self, scope_id: str) -> "ServiceScope":
        """Create a new service scope for scoped lifetime management."""
        return ServiceScopeContext(self, scope_id)


class ServiceScopeContext:
    """Context manager for service scopes."""

    def __init__(self, container: ServiceContainer, scope_id: str):
        self.container = container
        self.scope_id = scope_id
        self.previous_scope = None

    def __enter__(self) -> "ServiceScopeContext":
        self.previous_scope = self.container._current_scope
        self.container._current_scope = self.scope_id
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Clean up scoped instances
        if self.scope_id in self.container._scoped_instances:
            del self.container._scoped_instances[self.scope_id]

        # Restore previous scope
        self.container._current_scope = self.previous_scope


# Service interfaces for loose coupling
class ILogger(Protocol):
    """Abstract logger interface for dependency injection."""

    def debug(self, message: str, **kwargs) -> None: ...
    def info(self, message: str, **kwargs) -> None: ...
    def warning(self, message: str, **kwargs) -> None: ...
    def error(self, message: str, **kwargs) -> None: ...
    def log_structured(self, level: int, data: Dict[str, Any]) -> None: ...


class IConfigurationProvider(Protocol):
    """Abstract configuration provider interface."""

    def get(self, key: str, default: Any = None) -> Any: ...
    def get_section(self, section: str) -> Dict[str, Any]: ...
    def set(self, key: str, value: Any) -> None: ...
    def reload(self) -> None: ...


class IErrorHandler(Protocol):
    """Abstract error handler interface for pluggable error processing."""

    def handle_error(self, error: Exception, context: Dict[str, Any]) -> bool: ...
    def can_handle(self, error_type: Type[Exception]) -> bool: ...
    def get_priority(self) -> int: ...


class IMetricsCollector(Protocol):
    """Abstract metrics collection interface."""

    def increment_counter(self, name: str, tags: Dict[str, str] = None) -> None: ...
    def record_gauge(self, name: str, value: float, tags: Dict[str, str] = None) -> None: ...
    def record_histogram(self, name: str, value: float, tags: Dict[str, str] = None) -> None: ...


# Global service container instance
_container = ServiceContainer()


def get_service_container() -> ServiceContainer:
    """Get the global service container."""
    return _container


def configure_services() -> ServiceContainer:
    """Configure default service registrations."""
    container = get_service_container()

    # Register default implementations
    # (These would be imported from concrete implementations)

    return container


# Decorator for dependency injection
def inject(service_type: Type[T]) -> T:
    """Decorator/function for service resolution."""
    return get_service_container().resolve(service_type)


# Export public API
__all__ = [
    "ServiceContainer",
    "ServiceScope",
    "ServiceDescriptor",
    "ILogger",
    "IConfigurationProvider",
    "IErrorHandler",
    "IMetricsCollector",
    "get_service_container",
    "configure_services",
    "inject",
]
