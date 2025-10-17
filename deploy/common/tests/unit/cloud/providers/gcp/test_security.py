"""Comprehensive tests for cloud.providers.gcp.security module.

Tests Binary Authorization setup for container image security policies.
Following pytest architect best practices with async testing and mocking.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, mock_open, patch

import pytest

from cloud.providers.gcp.security import setup_binary_authorization


class TestSetupBinaryAuthorization:
    """Test Binary Authorization configuration."""

    @pytest.mark.asyncio
    async def test_setup_binary_auth_success(self):
        """Should configure Binary Authorization policy successfully."""
        logger = MagicMock()
        project_id = "test-project-123"
        region = "us-central1"

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                mock_file = MagicMock()
                mock_file.name = "/tmp/policy.json"
                mock_file.__enter__.return_value = mock_file
                mock_temp.return_value = mock_file
                
                mock_run.return_value = AsyncMock()

                await setup_binary_authorization(logger, project_id, region)

        # Verify command was called
        mock_run.assert_called_once()
        call_args = mock_run.call_args
        command = call_args[0][0]
        
        assert "gcloud" in command
        assert "container" in command
        assert "binauthz" in command
        assert "policy" in command
        assert "import" in command
        assert f"--project={project_id}" in command

    @pytest.mark.asyncio
    async def test_setup_creates_correct_policy(self):
        """Should create policy with correct structure."""
        logger = MagicMock()
        project_id = "test-project-123"
        region = "us-west1"

        captured_policy = {}
        
        def capture_json_dump(data, file):
            captured_policy.update(data)
            
        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                with patch("cloud.providers.gcp.security.json.dump", side_effect=capture_json_dump):
                    mock_file = MagicMock()
                    mock_file.name = "/tmp/policy.json"
                    mock_file.__enter__.return_value = mock_file
                    mock_temp.return_value = mock_file
                    
                    mock_run.return_value = AsyncMock()

                    await setup_binary_authorization(logger, project_id, region)

        # Verify policy structure
        assert "defaultAdmissionRule" in captured_policy
        assert captured_policy["defaultAdmissionRule"]["evaluationMode"] == "ALWAYS_DENY"
        assert captured_policy["defaultAdmissionRule"]["enforcementMode"] == "ENFORCED_BLOCK_AND_AUDIT_LOG"
        assert "admissionAllowlistPatterns" in captured_policy
        
        # Verify allowlist pattern includes project's artifact registry
        patterns = captured_policy["admissionAllowlistPatterns"]
        assert len(patterns) == 1
        assert patterns[0]["namePattern"] == f"{region}-docker.pkg.dev/{project_id}/*"

    @pytest.mark.asyncio
    async def test_setup_with_retries(self):
        """Should use retries for gcloud command."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                mock_file = MagicMock()
                mock_file.name = "/tmp/policy.json"
                mock_file.__enter__.return_value = mock_file
                mock_temp.return_value = mock_file
                
                mock_run.return_value = AsyncMock()

                await setup_binary_authorization(logger, "test-project", "us-central1")

        # Verify retries are configured
        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["retries"] == 3
        assert call_kwargs["delay"] == 5

    @pytest.mark.asyncio
    async def test_setup_ignores_check_failure(self):
        """Should not raise on gcloud command failure (check=False)."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                mock_file = MagicMock()
                mock_file.name = "/tmp/policy.json"
                mock_file.__enter__.return_value = mock_file
                mock_temp.return_value = mock_file
                
                mock_run.return_value = AsyncMock()

                # Should not raise
                await setup_binary_authorization(logger, "test-project", "us-central1")

        # Verify check=False is used
        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["check"] is False

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "project_id,region",
        [
            ("project-1", "us-central1"),
            ("my-gcp-project", "europe-west1"),
            ("prod-deployment", "asia-northeast1"),
        ],
        ids=["central", "europe", "asia"]
    )
    async def test_setup_with_various_regions(self, project_id, region):
        """Should configure policy for various project/region combinations."""
        logger = MagicMock()

        captured_policy = {}
        
        def capture_json_dump(data, file):
            captured_policy.update(data)

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                with patch("cloud.providers.gcp.security.json.dump", side_effect=capture_json_dump):
                    mock_file = MagicMock()
                    mock_file.name = "/tmp/policy.json"
                    mock_file.__enter__.return_value = mock_file
                    mock_temp.return_value = mock_file
                    
                    mock_run.return_value = AsyncMock()

                    await setup_binary_authorization(logger, project_id, region)

        # Verify region-specific artifact registry pattern
        pattern = captured_policy["admissionAllowlistPatterns"][0]["namePattern"]
        assert pattern == f"{region}-docker.pkg.dev/{project_id}/*"

    @pytest.mark.asyncio
    async def test_setup_uses_temp_file(self):
        """Should use temporary file for policy JSON."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                mock_file = MagicMock()
                mock_file.name = "/tmp/test_policy_12345.json"
                mock_file.__enter__.return_value = mock_file
                mock_temp.return_value = mock_file
                
                mock_run.return_value = AsyncMock()

                await setup_binary_authorization(logger, "test-project", "us-central1")

        # Verify temp file was requested with correct parameters
        mock_temp.assert_called_once_with(mode="w", suffix=".json")
        
        # Verify temp file name was used in command
        command = mock_run.call_args[0][0]
        assert "/tmp/test_policy_12345.json" in command

    @pytest.mark.asyncio
    async def test_setup_logs_progress(self):
        """Should log setup progress."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                mock_file = MagicMock()
                mock_file.name = "/tmp/policy.json"
                mock_file.__enter__.return_value = mock_file
                mock_temp.return_value = mock_file
                
                mock_run.return_value = AsyncMock()

                await setup_binary_authorization(logger, "test-project", "us-central1")

        # Verify logging calls
        assert logger.info.call_count >= 2
        log_messages = [call[0][0] for call in logger.info.call_args_list]
        assert any("Setting up Binary Authorization" in msg for msg in log_messages)
        assert any("security policies" in msg.lower() for msg in log_messages)

    @pytest.mark.asyncio
    async def test_setup_policy_denies_by_default(self):
        """Should configure policy to deny all images by default."""
        logger = MagicMock()

        captured_policy = {}
        
        def capture_json_dump(data, file):
            captured_policy.update(data)

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                with patch("cloud.providers.gcp.security.json.dump", side_effect=capture_json_dump):
                    mock_file = MagicMock()
                    mock_file.name = "/tmp/policy.json"
                    mock_file.__enter__.return_value = mock_file
                    mock_temp.return_value = mock_file
                    
                    mock_run.return_value = AsyncMock()

                    await setup_binary_authorization(logger, "test-project", "us-central1")

        # Verify deny-by-default configuration
        assert captured_policy["defaultAdmissionRule"]["evaluationMode"] == "ALWAYS_DENY"
        assert captured_policy["defaultAdmissionRule"]["enforcementMode"] == "ENFORCED_BLOCK_AND_AUDIT_LOG"

    @pytest.mark.asyncio
    async def test_setup_policy_allows_only_project_registry(self):
        """Should only allow images from project's Artifact Registry."""
        logger = MagicMock()
        project_id = "secure-project"
        region = "us-east1"

        captured_policy = {}
        
        def capture_json_dump(data, file):
            captured_policy.update(data)

        with patch("cloud.providers.gcp.security.run_command") as mock_run:
            with patch("cloud.providers.gcp.security.tempfile.NamedTemporaryFile") as mock_temp:
                with patch("cloud.providers.gcp.security.json.dump", side_effect=capture_json_dump):
                    mock_file = MagicMock()
                    mock_file.name = "/tmp/policy.json"
                    mock_file.__enter__.return_value = mock_file
                    mock_temp.return_value = mock_file
                    
                    mock_run.return_value = AsyncMock()

                    await setup_binary_authorization(logger, project_id, region)

        # Verify only one allowlist pattern exists
        assert len(captured_policy["admissionAllowlistPatterns"]) == 1
        
        # Verify it's for the project's registry only
        pattern = captured_policy["admissionAllowlistPatterns"][0]["namePattern"]
        assert project_id in pattern
        assert region in pattern
        assert pattern.endswith("/*")  # Wildcard for any image in the registry
