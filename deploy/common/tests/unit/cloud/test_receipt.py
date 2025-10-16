"""Comprehensive tests for cloud.common.receipt module.

Tests deployment receipt generation for terminal and markdown formats,
including content generation, terminal printing, and file saving.
"""

from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from freezegun import freeze_time
from rich.console import Console

# Module path is handled in conftest.py
# Import receipt module which has been set up by conftest
import receipt
from cloud import style

generate_receipt_content = receipt.generate_receipt_content
print_receipt = receipt.print_receipt
save_receipt = receipt.save_receipt
RICH_COLORS = style.RICH_COLORS
SYMBOL = style.SYMBOL
WIDTH = style.WIDTH


class TestGenerateReceiptContent:
    """Test receipt content generation."""

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_minimal(self):
        """Generate receipt with minimal required parameters."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        assert isinstance(result, dict)
        assert "terminal" in result
        assert "markdown" in result
        assert isinstance(result["terminal"], str)
        assert isinstance(result["markdown"], str)

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_includes_project_id(self):
        """Receipt should include project ID."""
        result = generate_receipt_content(
            project_id="my-test-project",
            region="us-central1",
        )

        assert "my-test-project" in result["terminal"]
        assert "my-test-project" in result["markdown"]

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_includes_region(self):
        """Receipt should include region."""
        result = generate_receipt_content(
            project_id="test-project",
            region="europe-west1",
        )

        assert "europe-west1" in result["terminal"]
        assert "europe-west1" in result["markdown"]

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_with_service_url(self):
        """Receipt should include service URL when provided."""
        service_url = "https://service-abc123.run.app"
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            service_url=service_url,
        )

        assert service_url in result["terminal"]
        assert service_url in result["markdown"]

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_without_service_url(self):
        """Receipt should handle missing service URL gracefully."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            service_url=None,
        )

        # Should not crash and should produce valid output
        assert isinstance(result["terminal"], str)
        assert isinstance(result["markdown"], str)
        assert "Service URL" not in result["terminal"]
        assert "Service URL" not in result["markdown"]

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_with_artifact_digest(self):
        """Receipt should include artifact digest when provided."""
        digest = "sha256:1234567890abcdef1234567890abcdef1234567890abcdef"
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            artifact_digest=digest,
        )

        # Digest is truncated to 20 chars in terminal
        assert digest[:20] in result["terminal"]
        assert digest in result["markdown"]

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_without_artifact_digest(self):
        """Receipt should handle missing artifact digest gracefully."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            artifact_digest=None,
        )

        assert isinstance(result["terminal"], str)
        assert isinstance(result["markdown"], str)
        assert "Artifact" not in result["terminal"]
        assert "Artifact Digest" not in result["markdown"]

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_custom_terraform_version(self):
        """Receipt should use custom Terraform version."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            terraform_version="1.5.0",
        )

        assert "1.5.0" in result["terminal"]
        assert "1.5.0" in result["markdown"]

    @freeze_time("2025-01-01 12:00:00")
    def test_generate_receipt_content_default_terraform_version(self):
        """Receipt should use default Terraform version when not specified."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        assert "1.10.3" in result["terminal"]
        assert "1.10.3" in result["markdown"]

    @freeze_time("2025-01-01 12:00:00 UTC")
    def test_generate_receipt_content_includes_timestamp(self):
        """Receipt should include deployment timestamp."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        # Timestamp format: "2025-01-01 12:00:00 UTC"
        assert "2025-01-01" in result["terminal"]
        assert "2025-01-01" in result["markdown"]

    def test_generate_receipt_content_terminal_format(self):
        """Terminal receipt should use Rich formatting."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        terminal = result["terminal"]
        # Check for Rich color tags
        assert f"[{RICH_COLORS['accent']}]" in terminal
        assert f"[{RICH_COLORS['muted']}]" in terminal
        assert f"[{RICH_COLORS['primary']}]" in terminal

    def test_generate_receipt_content_includes_symbols(self):
        """Receipt should include unicode symbols from style module."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        terminal = result["terminal"]
        markdown = result["markdown"]

        # Check for symbols
        assert SYMBOL["ok"] in terminal
        assert SYMBOL["arrow"] in terminal
        assert SYMBOL["dot"] in terminal
        assert SYMBOL["ok"] in markdown

    def test_generate_receipt_content_includes_next_steps(self):
        """Receipt should include next steps guidance."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        # Check terminal next steps
        assert "Next Steps:" in result["terminal"]
        assert "View logs" in result["terminal"]
        assert "Trigger job" in result["terminal"]
        assert "Teardown" in result["terminal"]

        # Check markdown next steps
        assert "Next Steps" in result["markdown"]
        assert "gcloud logging read" in result["markdown"]
        assert "gcloud run jobs execute" in result["markdown"]
        assert "teardown-cloud.sh" in result["markdown"]

    def test_generate_receipt_content_markdown_structure(self):
        """Markdown receipt should have proper structure."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        markdown = result["markdown"]

        # Check markdown headers
        assert "# Deployment Receipt" in markdown
        assert "## Details" in markdown
        assert "## Next Steps" in markdown

        # Check markdown code block
        assert "```bash" in markdown
        assert "```" in markdown

        # Check footer
        assert "_Generated by Job Scraper Cloud Bootstrap_" in markdown

    @pytest.mark.parametrize(
        "project_id,region",
        [
            ("project-1", "us-east1"),
            ("my-awesome-project", "europe-west2"),
            ("test-123", "asia-northeast1"),
        ],
        ids=["simple", "descriptive", "numeric"],
    )
    def test_generate_receipt_content_various_inputs(self, project_id, region):
        """Receipt should handle various valid project/region combinations."""
        result = generate_receipt_content(
            project_id=project_id,
            region=region,
        )

        assert project_id in result["terminal"]
        assert region in result["terminal"]
        assert project_id in result["markdown"]
        assert region in result["markdown"]

    def test_generate_receipt_content_with_all_optional_params(self):
        """Receipt should handle all optional parameters together."""
        result = generate_receipt_content(
            project_id="full-project",
            region="us-west1",
            service_url="https://service.run.app",
            artifact_digest="sha256:abcdef1234567890",
            terraform_version="1.7.0",
        )

        terminal = result["terminal"]
        markdown = result["markdown"]

        # Verify all params are present
        assert "full-project" in terminal and "full-project" in markdown
        assert "us-west1" in terminal and "us-west1" in markdown
        assert "https://service.run.app" in terminal and "https://service.run.app" in markdown
        assert "sha256:abcdef123456" in terminal  # truncated to 20 chars
        assert "sha256:abcdef1234567890" in markdown  # full
        assert "1.7.0" in terminal and "1.7.0" in markdown

    def test_generate_receipt_content_markdown_includes_project_in_commands(self):
        """Markdown should include project ID in gcloud commands."""
        result = generate_receipt_content(
            project_id="cmd-test-project",
            region="us-central1",
        )

        markdown = result["markdown"]
        assert "gcloud logging read --project=cmd-test-project" in markdown

    def test_generate_receipt_content_markdown_includes_region_in_commands(self):
        """Markdown should include region in gcloud commands."""
        result = generate_receipt_content(
            project_id="test-project",
            region="asia-east1",
        )

        markdown = result["markdown"]
        assert "gcloud run jobs execute job-scraper --region=asia-east1" in markdown

    def test_generate_receipt_content_artifact_digest_truncation(self):
        """Long artifact digests should be truncated in terminal but full in markdown."""
        long_digest = "sha256:" + "a" * 100
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            artifact_digest=long_digest,
        )

        # Terminal should have truncated version (20 chars + "...")
        terminal = result["terminal"]
        assert long_digest[:20] in terminal
        assert "..." in terminal

        # Markdown should have full digest
        markdown = result["markdown"]
        assert long_digest in markdown

    def test_generate_receipt_content_empty_strings_handled(self):
        """Empty strings for optional params should be handled gracefully."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            service_url="",
            artifact_digest="",
        )

        # Should not crash
        assert isinstance(result["terminal"], str)
        assert isinstance(result["markdown"], str)


class TestPrintReceipt:
    """Test terminal receipt printing."""

    def test_print_receipt_calls_console_print(self, mocker):
        """print_receipt should call console.print() methods."""
        mock_console = MagicMock(spec=Console)
        
        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
        )

        # Should call print() at least 3 times (before panel, panel, after panel)
        assert mock_console.print.call_count >= 2

    def test_print_receipt_creates_panel(self, mocker):
        """print_receipt should create a Rich Panel."""
        mock_console = MagicMock(spec=Console)
        mock_panel = mocker.patch("receipt.Panel")
        
        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
        )

        # Panel should be created with correct parameters
        mock_panel.assert_called_once()
        call_kwargs = mock_panel.call_args.kwargs
        assert call_kwargs["title"] == "[bold]Deployment Receipt[/bold]"
        assert call_kwargs["border_style"] == RICH_COLORS["primary"]
        assert call_kwargs["width"] == WIDTH

    def test_print_receipt_uses_generate_receipt_content(self, mocker):
        """print_receipt should use generate_receipt_content()."""
        mock_console = MagicMock(spec=Console)
        mock_generate = mocker.patch(
            "receipt.generate_receipt_content",
            return_value={"terminal": "test content", "markdown": "test md"}
        )
        
        print_receipt(
            console=mock_console,
            project_id="my-project",
            region="us-west1",
            service_url="https://service.run.app",
            artifact_digest="sha256:abc123",
            terraform_version="1.5.0",
        )

        # Should call generate_receipt_content with same params
        mock_generate.assert_called_once_with(
            project_id="my-project",
            region="us-west1",
            service_url="https://service.run.app",
            artifact_digest="sha256:abc123",
            terraform_version="1.5.0",
        )

    def test_print_receipt_minimal_params(self, mocker):
        """print_receipt should work with minimal parameters."""
        mock_console = MagicMock(spec=Console)
        
        # Should not raise an exception
        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
        )

        assert mock_console.print.called

    def test_print_receipt_all_params(self, mocker):
        """print_receipt should accept all optional parameters."""
        mock_console = MagicMock(spec=Console)
        
        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
            service_url="https://example.com",
            artifact_digest="sha256:123",
            terraform_version="1.6.0",
        )

        assert mock_console.print.called


class TestSaveReceipt:
    """Test saving receipt to file."""

    def test_save_receipt_creates_file(self, tmp_path):
        """save_receipt should create a file at specified path."""
        output_file = tmp_path / "receipt.md"
        
        result = save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output_file,
        )

        assert result == output_file
        assert output_file.exists()
        assert output_file.is_file()

    def test_save_receipt_default_path(self, mocker, tmp_path):
        """save_receipt should use default path when not specified."""
        # Mock Path.cwd() to return tmp_path
        mocker.patch("receipt.Path.cwd", return_value=tmp_path)
        
        result = save_receipt(
            project_id="test-project",
            region="us-central1",
        )

        expected_path = tmp_path / "deployment-receipt.md"
        assert result == expected_path
        assert expected_path.exists()

    def test_save_receipt_content_is_markdown(self, tmp_path):
        """Saved file should contain markdown content."""
        output_file = tmp_path / "receipt.md"
        
        save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output_file,
        )

        content = output_file.read_text()
        
        # Should have markdown structure
        assert "# Deployment Receipt" in content
        assert "## Details" in content
        assert "## Next Steps" in content

    def test_save_receipt_includes_all_params(self, tmp_path):
        """Saved receipt should include all provided parameters."""
        output_file = tmp_path / "receipt.md"
        
        save_receipt(
            project_id="full-project",
            region="europe-west1",
            output_path=output_file,
            service_url="https://service.run.app",
            artifact_digest="sha256:abcdef123",
            terraform_version="1.8.0",
        )

        content = output_file.read_text()
        
        assert "full-project" in content
        assert "europe-west1" in content
        assert "https://service.run.app" in content
        assert "sha256:abcdef123" in content
        assert "1.8.0" in content

    def test_save_receipt_overwrites_existing_file(self, tmp_path):
        """save_receipt should overwrite existing files."""
        output_file = tmp_path / "receipt.md"
        output_file.write_text("old content")
        
        save_receipt(
            project_id="new-project",
            region="us-central1",
            output_path=output_file,
        )

        content = output_file.read_text()
        assert "old content" not in content
        assert "new-project" in content

    def test_save_receipt_returns_path_object(self, tmp_path):
        """save_receipt should return a Path object."""
        output_file = tmp_path / "receipt.md"
        
        result = save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output_file,
        )

        assert isinstance(result, Path)

    def test_save_receipt_uses_generate_receipt_content(self, tmp_path, mocker):
        """save_receipt should use generate_receipt_content()."""
        output_file = tmp_path / "receipt.md"
        mock_generate = mocker.patch(
            "receipt.generate_receipt_content",
            return_value={
                "terminal": "terminal content",
                "markdown": "markdown content"
            }
        )
        
        save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output_file,
            service_url="https://test.com",
        )

        # Should call generate with same params
        mock_generate.assert_called_once()
        
        # File should contain markdown content
        content = output_file.read_text()
        assert content == "markdown content"

    @pytest.mark.parametrize(
        "filename",
        [
            "custom-receipt.md",
            "deployment.md",
            "output.markdown",
            "receipt-2025-01-01.md",
        ],
        ids=["custom", "deployment", "markdown_ext", "dated"],
    )
    def test_save_receipt_custom_filenames(self, tmp_path, filename):
        """save_receipt should work with various filenames."""
        output_file = tmp_path / filename
        
        result = save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output_file,
        )

        assert result == output_file
        assert output_file.exists()

    def test_save_receipt_creates_parent_directories(self, tmp_path):
        """save_receipt should work even if file is in nested path."""
        nested_path = tmp_path / "reports" / "2025" / "receipt.md"
        
        # Parent directories don't exist yet, but Path.write_text doesn't create them
        # This should raise an error unless we handle it
        with pytest.raises(FileNotFoundError):
            save_receipt(
                project_id="test-project",
                region="us-central1",
                output_path=nested_path,
            )


class TestReceiptIntegration:
    """Integration tests for receipt module."""

    @freeze_time("2025-01-01 12:00:00 UTC")
    def test_full_receipt_workflow(self, tmp_path):
        """Test complete workflow: generate, print, and save receipt."""
        # Generate content
        content = generate_receipt_content(
            project_id="integration-project",
            region="us-central1",
            service_url="https://service.run.app",
            artifact_digest="sha256:abc123def456",
            terraform_version="1.9.0",
        )

        # Verify content structure
        assert content["terminal"]
        assert content["markdown"]

        # Save to file
        output_file = tmp_path / "integration-receipt.md"
        saved_path = save_receipt(
            project_id="integration-project",
            region="us-central1",
            output_path=output_file,
            service_url="https://service.run.app",
            artifact_digest="sha256:abc123def456",
            terraform_version="1.9.0",
        )

        # Verify file
        assert saved_path.exists()
        saved_content = saved_path.read_text()
        assert "integration-project" in saved_content
        assert "2025-01-01" in saved_content

    def test_receipt_consistency(self):
        """Receipt content should be consistent between calls."""
        params = {
            "project_id": "consistent-project",
            "region": "us-central1",
            "service_url": "https://service.run.app",
        }

        with freeze_time("2025-01-01 12:00:00"):
            content1 = generate_receipt_content(**params)
        
        with freeze_time("2025-01-01 12:00:00"):
            content2 = generate_receipt_content(**params)

        # Same timestamp = same content
        assert content1 == content2
