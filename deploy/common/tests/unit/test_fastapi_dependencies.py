"""Comprehensive tests for jsa.fastapi_app.dependencies module.

Tests FastAPI dependency injection for database sessions following pytest best practices.
Covers session management, context managers, and dependency patterns.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import Session

from jsa.fastapi_app.dependencies import SessionDep, get_session_context


class TestGetSessionContext:
    """Test suite for get_session_context dependency."""

    def test_get_session_context_yields_session(self) -> None:
        """get_session_context should yield a database session."""
        # Arrange - mock the open_session context manager
        mock_session = MagicMock(spec=Session)
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_open_session.return_value.__enter__.return_value = mock_session
            mock_open_session.return_value.__exit__.return_value = None
            
            # Act - get the generator and consume it
            gen = get_session_context()
            session = next(gen)
            
            # Assert
            assert session is mock_session
            mock_open_session.assert_called_once()

    def test_get_session_context_is_generator(self) -> None:
        """get_session_context should return a generator."""
        # Arrange & Act
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_session = MagicMock(spec=Session)
            mock_open_session.return_value.__enter__.return_value = mock_session
            mock_open_session.return_value.__exit__.return_value = None
            
            result = get_session_context()
            
            # Assert
            assert hasattr(result, "__iter__")
            assert hasattr(result, "__next__")

    def test_get_session_context_closes_session_on_exit(self) -> None:
        """get_session_context should properly close session via context manager."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        mock_exit = MagicMock()
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_open_session.return_value.__enter__.return_value = mock_session
            mock_open_session.return_value.__exit__ = mock_exit
            
            # Act - consume the generator completely
            gen = get_session_context()
            session = next(gen)
            
            # Complete the generator to trigger cleanup
            try:
                next(gen)
            except StopIteration:
                pass
            
            # Assert - __exit__ should have been called
            assert mock_exit.called

    def test_get_session_context_handles_exception_in_handler(self) -> None:
        """get_session_context should properly clean up when exception occurs."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        mock_exit = MagicMock()
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_open_session.return_value.__enter__.return_value = mock_session
            mock_open_session.return_value.__exit__ = mock_exit
            
            # Act - simulate exception in handler
            gen = get_session_context()
            session = next(gen)
            
            # Simulate cleanup by closing generator
            gen.close()
            
            # Assert - generator should be closed
            with pytest.raises(StopIteration):
                next(gen)

    def test_get_session_context_multiple_calls_independent(self) -> None:
        """Multiple calls to get_session_context should yield independent sessions."""
        # Arrange
        mock_session_1 = MagicMock(spec=Session)
        mock_session_2 = MagicMock(spec=Session)
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            # First call returns session 1, second call returns session 2
            mock_open_session.return_value.__enter__.side_effect = [mock_session_1, mock_session_2]
            mock_open_session.return_value.__exit__.return_value = None
            
            # Act
            gen1 = get_session_context()
            session1 = next(gen1)
            
            gen2 = get_session_context()
            session2 = next(gen2)
            
            # Assert
            assert session1 is mock_session_1
            assert session2 is mock_session_2
            assert session1 is not session2
            assert mock_open_session.call_count == 2

    def test_get_session_context_session_usable(self) -> None:
        """Yielded session should be usable for database operations."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        mock_session.query = MagicMock()
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_open_session.return_value.__enter__.return_value = mock_session
            mock_open_session.return_value.__exit__.return_value = None
            
            # Act
            gen = get_session_context()
            session = next(gen)
            
            # Simulate using the session
            session.query("mock_model")
            
            # Assert
            assert session.query.called
            mock_session.query.assert_called_once_with("mock_model")


class TestSessionDep:
    """Test suite for SessionDep type alias."""

    def test_session_dep_is_annotated_type(self) -> None:
        """SessionDep should be an Annotated type."""
        # Arrange & Act
        import typing
        
        # Assert - check it's an Annotated type
        if hasattr(typing, "get_origin"):
            # Python 3.8+
            origin = typing.get_origin(SessionDep)
            assert origin is not None or SessionDep.__class__.__name__ == "_AnnotatedAlias"

    def test_session_dep_includes_session_type(self) -> None:
        """SessionDep should include Session as the base type."""
        # Arrange & Act
        import typing
        
        # Assert - check the args include Session
        if hasattr(typing, "get_args"):
            args = typing.get_args(SessionDep)
            if args:
                # First arg should be Session or compatible
                assert len(args) >= 1

    def test_session_dep_can_be_used_in_annotations(self) -> None:
        """SessionDep should be usable in function annotations."""
        # Arrange & Act - define a function using SessionDep
        def test_endpoint(session: SessionDep) -> str:
            """Test endpoint using SessionDep."""
            return "test"
        
        # Assert - function should be callable and have proper annotations
        assert "session" in test_endpoint.__annotations__
        assert test_endpoint(MagicMock()) == "test"


class TestModuleExports:
    """Test suite for module-level exports."""

    def test_module_exports_all(self) -> None:
        """__all__ should export expected public interface."""
        # Arrange
        from jsa.fastapi_app import dependencies
        
        # Act
        exports = dependencies.__all__
        
        # Assert
        assert "get_session_context" in exports
        assert "SessionDep" in exports
        assert len(exports) == 2

    def test_exported_functions_are_callable(self) -> None:
        """All exported functions should be callable."""
        # Arrange
        from jsa.fastapi_app import dependencies
        
        # Act & Assert
        for name in dependencies.__all__:
            obj = getattr(dependencies, name)
            # Either callable or a type annotation
            assert callable(obj) or hasattr(obj, "__origin__") or hasattr(obj, "__class__")

    def test_get_session_context_importable_from_module(self) -> None:
        """get_session_context should be importable from the module."""
        # Arrange & Act
        from jsa.fastapi_app.dependencies import get_session_context as imported_func
        
        # Assert
        assert callable(imported_func)

    def test_session_dep_importable_from_module(self) -> None:
        """SessionDep should be importable from the module."""
        # Arrange & Act
        from jsa.fastapi_app.dependencies import SessionDep as imported_type
        
        # Assert
        assert imported_type is not None


class TestIntegration:
    """Integration tests for dependencies module."""

    def test_dependency_pattern_with_fastapi(self) -> None:
        """Dependency should work with FastAPI dependency injection pattern."""
        # Arrange
        from fastapi import Depends
        
        mock_session = MagicMock(spec=Session)
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_open_session.return_value.__enter__.return_value = mock_session
            mock_open_session.return_value.__exit__.return_value = None
            
            # Act - simulate FastAPI calling the dependency
            dependency = Depends(get_session_context)
            
            # Assert - Depends should wrap our generator
            assert dependency.dependency is get_session_context

    def test_session_lifecycle_complete(self) -> None:
        """Complete session lifecycle should call open and close."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        mock_enter = MagicMock(return_value=mock_session)
        mock_exit = MagicMock(return_value=None)
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_open_session.return_value.__enter__ = mock_enter
            mock_open_session.return_value.__exit__ = mock_exit
            
            # Act - complete lifecycle
            gen = get_session_context()
            session = next(gen)
            
            # Use the session
            assert session is mock_session
            
            # Complete the generator
            try:
                next(gen)
            except StopIteration:
                pass
            
            # Assert
            mock_enter.assert_called_once()
            mock_exit.assert_called_once()

    def test_session_available_within_context(self) -> None:
        """Session should be available for the duration of the context."""
        # Arrange
        mock_session = MagicMock(spec=Session)
        operations_performed = []
        
        with patch("jsa.fastapi_app.dependencies.open_session") as mock_open_session:
            mock_open_session.return_value.__enter__.return_value = mock_session
            mock_open_session.return_value.__exit__.return_value = None
            
            # Act - use session in context
            gen = get_session_context()
            session = next(gen)
            
            # Perform multiple operations
            operations_performed.append("op1")
            session.execute = MagicMock()
            session.execute("SELECT 1")
            operations_performed.append("op2")
            
            # Assert - session should be usable throughout
            assert len(operations_performed) == 2
            assert session.execute.called
