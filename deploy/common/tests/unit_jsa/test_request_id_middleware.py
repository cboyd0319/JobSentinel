"""Comprehensive tests for jsa.fastapi_app.middleware.request_id module.

Tests the RequestIDMiddleware which adds unique request IDs to each request
for tracing and debugging purposes.

Coverage targets:
- Happy path: Request ID generation and propagation
- Request ID extraction from headers
- Client IP detection (direct, forwarded, unknown)
- Request/response lifecycle logging
- Edge cases: missing client, multiple forwarded IPs
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, Request, Response
from starlette.testclient import TestClient

from jsa.fastapi_app.middleware.request_id import RequestIDMiddleware


@pytest.fixture
def app():
    """Create a FastAPI app with RequestIDMiddleware for testing."""
    app = FastAPI()
    app.add_middleware(RequestIDMiddleware)

    @app.get("/test")
    async def test_endpoint(request: Request):
        """Test endpoint that returns request ID from state."""
        return {"request_id": request.state.request_id}

    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


class TestRequestIDMiddleware:
    """Test suite for RequestIDMiddleware."""

    def test_middleware_generates_request_id_when_not_provided(self, client):
        """Test that middleware generates a UUID when no X-Request-ID header is provided."""
        # Act
        response = client.get("/test")

        # Assert
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        
        # Verify it's a valid UUID
        request_id = response.headers["X-Request-ID"]
        try:
            uuid.UUID(request_id)
        except ValueError:
            pytest.fail(f"Request ID '{request_id}' is not a valid UUID")

        # Verify it's in the response body (from request state)
        assert response.json()["request_id"] == request_id

    def test_middleware_uses_provided_request_id(self, client):
        """Test that middleware uses X-Request-ID from request headers if provided."""
        # Arrange
        custom_id = "custom-request-id-12345"

        # Act
        response = client.get("/test", headers={"X-Request-ID": custom_id})

        # Assert
        assert response.status_code == 200
        assert response.headers["X-Request-ID"] == custom_id
        assert response.json()["request_id"] == custom_id

    @pytest.mark.parametrize(
        "custom_id",
        [
            "simple-id",
            "abc123",
            str(uuid.uuid4()),
            "request-with-dashes-and-numbers-123",
        ],
        ids=["simple", "alphanumeric", "uuid", "complex"],
    )
    def test_middleware_accepts_various_request_id_formats(self, client, custom_id):
        """Test that middleware accepts various request ID formats."""
        # Act
        response = client.get("/test", headers={"X-Request-ID": custom_id})

        # Assert
        assert response.headers["X-Request-ID"] == custom_id
        assert response.json()["request_id"] == custom_id

    def test_middleware_adds_request_id_to_request_state(self, client):
        """Test that request ID is available in request.state."""
        # Act
        response = client.get("/test")

        # Assert
        assert response.status_code == 200
        request_id = response.json()["request_id"]
        assert request_id is not None
        assert len(request_id) > 0

    @patch("jsa.fastapi_app.middleware.request_id.logger")
    def test_middleware_logs_request_start(self, mock_logger, client):
        """Test that middleware logs request start with request details."""
        # Act
        client.get("/test")

        # Assert
        # Find the "Request started" log call
        started_calls = [
            call for call in mock_logger.info.call_args_list
            if call[0][0] == "Request started"
        ]
        assert len(started_calls) > 0
        
        # Check that it includes expected fields
        call_kwargs = started_calls[0][1]
        assert "request_id" in call_kwargs
        assert call_kwargs["method"] == "GET"
        assert call_kwargs["path"] == "/test"
        assert "client_ip" in call_kwargs

    @patch("jsa.fastapi_app.middleware.request_id.logger")
    def test_middleware_logs_request_completion(self, mock_logger, client):
        """Test that middleware logs request completion with status."""
        # Act
        client.get("/test")

        # Assert
        # Find the "Request completed" log call
        completed_calls = [
            call for call in mock_logger.info.call_args_list
            if call[0][0] == "Request completed"
        ]
        assert len(completed_calls) > 0
        
        # Check that it includes expected fields
        call_kwargs = completed_calls[0][1]
        assert "request_id" in call_kwargs
        assert call_kwargs["status_code"] == 200


class TestClientIPDetection:
    """Test suite for client IP detection logic."""

    def test_get_client_ip_with_direct_connection(self):
        """Test IP detection when client connects directly."""
        # Arrange
        middleware = RequestIDMiddleware(app=MagicMock())
        request = MagicMock(spec=Request)
        request.headers.get.return_value = None  # No X-Forwarded-For
        request.client = MagicMock()
        request.client.host = "192.168.1.100"

        # Act
        ip = middleware._get_client_ip(request)

        # Assert
        assert ip == "192.168.1.100"

    def test_get_client_ip_with_forwarded_header(self):
        """Test IP detection when X-Forwarded-For header is present."""
        # Arrange
        middleware = RequestIDMiddleware(app=MagicMock())
        request = MagicMock(spec=Request)
        request.headers.get.return_value = "203.0.113.42, 192.168.1.1, 10.0.0.1"

        # Act
        ip = middleware._get_client_ip(request)

        # Assert
        # Should return the first IP in the chain (original client)
        assert ip == "203.0.113.42"

    def test_get_client_ip_with_single_forwarded_ip(self):
        """Test IP detection with single IP in X-Forwarded-For."""
        # Arrange
        middleware = RequestIDMiddleware(app=MagicMock())
        request = MagicMock(spec=Request)
        request.headers.get.return_value = "203.0.113.42"

        # Act
        ip = middleware._get_client_ip(request)

        # Assert
        assert ip == "203.0.113.42"

    def test_get_client_ip_with_spaces_in_forwarded_header(self):
        """Test IP detection handles whitespace in X-Forwarded-For."""
        # Arrange
        middleware = RequestIDMiddleware(app=MagicMock())
        request = MagicMock(spec=Request)
        request.headers.get.return_value = "  203.0.113.42  , 192.168.1.1"

        # Act
        ip = middleware._get_client_ip(request)

        # Assert
        assert ip == "203.0.113.42"  # Should strip whitespace

    def test_get_client_ip_with_no_client_or_headers(self):
        """Test IP detection when neither client nor headers are available."""
        # Arrange
        middleware = RequestIDMiddleware(app=MagicMock())
        request = MagicMock(spec=Request)
        request.headers.get.return_value = None
        request.client = None

        # Act
        ip = middleware._get_client_ip(request)

        # Assert
        assert ip == "unknown"


class TestRequestIDPropagation:
    """Test suite for request ID propagation through request lifecycle."""

    @pytest.mark.asyncio
    async def test_request_id_available_throughout_request_lifecycle(self):
        """Test that request ID is accessible at various stages of request."""
        # Arrange
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)
        
        captured_ids = []

        @app.get("/capture")
        async def capture_endpoint(request: Request):
            """Capture request ID at different points."""
            captured_ids.append(request.state.request_id)
            # Simulate some processing
            captured_ids.append(request.state.request_id)
            return {"id": request.state.request_id}

        client = TestClient(app)

        # Act
        response = client.get("/capture")

        # Assert
        assert response.status_code == 200
        request_id = response.json()["id"]
        
        # All captured IDs should match
        assert len(captured_ids) == 2
        assert all(rid == request_id for rid in captured_ids)
        
        # Response header should match
        assert response.headers["X-Request-ID"] == request_id

    def test_different_requests_get_different_ids(self, client):
        """Test that each request gets a unique request ID."""
        # Act
        response1 = client.get("/test")
        response2 = client.get("/test")
        response3 = client.get("/test")

        # Assert
        id1 = response1.headers["X-Request-ID"]
        id2 = response2.headers["X-Request-ID"]
        id3 = response3.headers["X-Request-ID"]
        
        # All IDs should be unique
        assert id1 != id2
        assert id2 != id3
        assert id1 != id3


@pytest.mark.asyncio
class TestMiddlewareErrorHandling:
    """Test suite for middleware behavior during errors."""

    async def test_middleware_propagates_request_id_on_error(self):
        """Test that request ID is logged even when endpoint raises error.
        
        Note: When an unhandled exception occurs, the middleware may not
        complete normally, so the request ID might not be in response headers.
        However, it should still be logged for debugging purposes.
        """
        # Arrange
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)

        @app.get("/error")
        async def error_endpoint():
            raise ValueError("Test error")

        client = TestClient(app, raise_server_exceptions=False)

        # Act
        with patch("jsa.fastapi_app.middleware.request_id.logger") as mock_logger:
            response = client.get("/error")

            # Assert
            assert response.status_code == 500
            
            # Request should be logged with request_id
            started_calls = [
                call for call in mock_logger.info.call_args_list
                if call[0][0] == "Request started"
            ]
            assert len(started_calls) > 0
            assert "request_id" in started_calls[0][1]

    @patch("jsa.fastapi_app.middleware.request_id.logger")
    async def test_middleware_logs_on_error_response(self, mock_logger):
        """Test that middleware logs completion even for error responses."""
        # Arrange
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)

        @app.get("/error")
        async def error_endpoint():
            return Response(status_code=400)

        client = TestClient(app)

        # Act
        client.get("/error")

        # Assert
        # Should have both started and completed logs
        completed_calls = [
            call for call in mock_logger.info.call_args_list
            if call[0][0] == "Request completed"
        ]
        assert len(completed_calls) > 0
        assert completed_calls[0][1]["status_code"] == 400
