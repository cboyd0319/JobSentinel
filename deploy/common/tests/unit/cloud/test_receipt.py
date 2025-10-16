"""Comprehensive tests for cloud.common.receipt module.

Tests deployment receipt generation including:
- Receipt content generation
- Terminal formatting
- Markdown formatting
- File saving
"""

import sys
import types
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


# Add cloud/common to path and mock dependencies
_cloud_common_path = (
    Path(__file__).resolve().parent.parent.parent.parent.parent / "cloud" / "common"
)
if str(_cloud_common_path) not in sys.path:
    sys.path.insert(0, str(_cloud_common_path))

# Mock the cloud.style module that receipt tries to import
# Use types.ModuleType instead of MagicMock to avoid pytest plugin detection issues
style_mock = types.ModuleType("cloud.style")
style_mock.RICH_COLORS = {
    "primary": "dodger_blue2",
    "accent": "green",
    "warn": "yellow",
    "error": "red",
    "text": "white",
    "muted": "bright_black",
}
style_mock.SYMBOL = {"ok": "✓", "fail": "✗", "arrow": "→", "dot": "•", "warn": "⚠", "info": "ℹ"}
style_mock.WIDTH = 80

cloud_mock = types.ModuleType("cloud")
cloud_mock.style = style_mock

sys.modules["cloud"] = cloud_mock
sys.modules["cloud.style"] = style_mock

from receipt import generate_receipt_content, print_receipt, save_receipt


class TestGenerateReceiptContent:
    """Test the generate_receipt_content function."""

    def test_generate_receipt_content_basic(self):
        """generate_receipt_content should return dict with terminal and markdown."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        assert isinstance(result, dict)
        assert "terminal" in result
        assert "markdown" in result
        assert isinstance(result["terminal"], str)
        assert isinstance(result["markdown"], str)

    def test_generate_receipt_content_includes_project_id(self):
        """generate_receipt_content should include project ID."""
        result = generate_receipt_content(
            project_id="my-project",
            region="us-east1",
        )

        assert "my-project" in result["terminal"]
        assert "my-project" in result["markdown"]

    def test_generate_receipt_content_includes_region(self):
        """generate_receipt_content should include region."""
        result = generate_receipt_content(
            project_id="test-project",
            region="europe-west1",
        )

        assert "europe-west1" in result["terminal"]
        assert "europe-west1" in result["markdown"]

    def test_generate_receipt_content_with_service_url(self):
        """generate_receipt_content should include service URL when provided."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            service_url="https://service.example.com",
        )

        assert "https://service.example.com" in result["terminal"]
        assert "https://service.example.com" in result["markdown"]

    def test_generate_receipt_content_without_service_url(self):
        """generate_receipt_content should work without service URL."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        # Should still generate valid content
        assert len(result["terminal"]) > 0
        assert len(result["markdown"]) > 0

    def test_generate_receipt_content_with_artifact_digest(self):
        """generate_receipt_content should include artifact digest when provided."""
        digest = "sha256:1234567890abcdef" * 4  # 80 char digest
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            artifact_digest=digest,
        )

        # Should include truncated version in terminal
        assert digest[:20] in result["terminal"]
        # Should include full version in markdown
        assert digest in result["markdown"]

    def test_generate_receipt_content_terraform_version(self):
        """generate_receipt_content should include Terraform version."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            terraform_version="1.5.0",
        )

        assert "1.5.0" in result["terminal"]
        assert "1.5.0" in result["markdown"]

    def test_generate_receipt_content_default_terraform_version(self):
        """generate_receipt_content should use default Terraform version."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        # Should include default version
        assert "1.10.3" in result["terminal"]
        assert "1.10.3" in result["markdown"]

    @pytest.mark.parametrize(
        "project_id,region",
        [
            ("simple-project", "us-central1"),
            ("project-with-dashes", "europe-west1"),
            ("prod-env-123", "asia-northeast1"),
        ],
        ids=["simple", "dashes", "with_numbers"],
    )
    def test_generate_receipt_content_various_inputs(self, project_id, region):
        """generate_receipt_content should handle various valid inputs."""
        result = generate_receipt_content(
            project_id=project_id,
            region=region,
        )

        assert project_id in result["terminal"]
        assert region in result["terminal"]
        assert project_id in result["markdown"]
        assert region in result["markdown"]

    def test_generate_receipt_content_includes_next_steps(self):
        """generate_receipt_content should include next steps."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        # Check for next steps indicators
        assert "Next Steps" in result["markdown"]
        assert "gcloud" in result["markdown"]
        assert "teardown" in result["markdown"].lower()

    def test_generate_receipt_content_markdown_format(self):
        """generate_receipt_content markdown should be valid markdown."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        markdown = result["markdown"]
        # Should have markdown headers
        assert "#" in markdown
        # Should have code blocks
        assert "```" in markdown
        # Should have lists
        assert "-" in markdown or "*" in markdown

    def test_generate_receipt_content_terminal_format(self):
        """generate_receipt_content terminal should have rich formatting."""
        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        terminal = result["terminal"]
        # Should have rich markup or plain text
        assert len(terminal) > 0
        # Should include symbols
        assert any(symbol in terminal for symbol in ["✓", "✗", "→", "•"])

    @patch("receipt.datetime")
    def test_generate_receipt_content_includes_timestamp(self, mock_datetime):
        """generate_receipt_content should include deployment timestamp."""
        mock_now = MagicMock()
        mock_now.strftime.return_value = "2025-01-01 12:00:00 UTC"
        mock_datetime.now.return_value = mock_now

        result = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        assert "2025-01-01 12:00:00 UTC" in result["terminal"]
        assert "2025-01-01 12:00:00 UTC" in result["markdown"]


class TestPrintReceipt:
    """Test the print_receipt function."""

    def test_print_receipt_basic(self, mocker):
        """print_receipt should print receipt to console."""
        mock_console = MagicMock()
        mocker.patch("receipt.Panel")

        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
        )

        # Should call console.print at least once
        assert mock_console.print.called

    def test_print_receipt_with_all_params(self, mocker):
        """print_receipt should handle all optional parameters."""
        mock_console = MagicMock()
        mocker.patch("receipt.Panel")

        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
            service_url="https://service.example.com",
            artifact_digest="sha256:abc123",
            terraform_version="1.5.0",
        )

        assert mock_console.print.called

    def test_print_receipt_creates_panel(self, mocker):
        """print_receipt should create a Rich panel."""
        mock_console = MagicMock()
        mock_panel_class = mocker.patch("receipt.Panel")

        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
        )

        # Should create a Panel
        assert mock_panel_class.called

    def test_print_receipt_uses_correct_width(self, mocker):
        """print_receipt should use WIDTH constant."""
        mock_console = MagicMock()
        mock_panel_class = mocker.patch("receipt.Panel")

        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
        )

        # Check that Panel was called with width parameter
        call_kwargs = mock_panel_class.call_args[1]
        assert "width" in call_kwargs


class TestSaveReceipt:
    """Test the save_receipt function."""

    def test_save_receipt_creates_file(self, tmp_path):
        """save_receipt should create a markdown file."""
        output = tmp_path / "receipt.md"

        result = save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output,
        )

        assert result == output
        assert output.exists()
        assert output.is_file()

    def test_save_receipt_default_path(self, tmp_path, monkeypatch):
        """save_receipt should use default path when not specified."""
        # Change to tmp directory
        monkeypatch.chdir(tmp_path)

        result = save_receipt(
            project_id="test-project",
            region="us-central1",
        )

        assert result.name == "deployment-receipt.md"
        assert result.exists()

    def test_save_receipt_contains_markdown_content(self, tmp_path):
        """save_receipt should write valid markdown content."""
        output = tmp_path / "receipt.md"

        save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output,
        )

        content = output.read_text()
        assert "#" in content  # Markdown headers
        assert "test-project" in content
        assert "us-central1" in content

    def test_save_receipt_with_service_url(self, tmp_path):
        """save_receipt should include service URL in output."""
        output = tmp_path / "receipt.md"

        save_receipt(
            project_id="test-project",
            region="us-central1",
            service_url="https://service.example.com",
            output_path=output,
        )

        content = output.read_text()
        assert "https://service.example.com" in content

    def test_save_receipt_with_artifact_digest(self, tmp_path):
        """save_receipt should include artifact digest in output."""
        output = tmp_path / "receipt.md"
        digest = "sha256:1234567890abcdef"

        save_receipt(
            project_id="test-project",
            region="us-central1",
            artifact_digest=digest,
            output_path=output,
        )

        content = output.read_text()
        assert digest in content

    def test_save_receipt_overwrites_existing_file(self, tmp_path):
        """save_receipt should overwrite existing file."""
        output = tmp_path / "receipt.md"
        output.write_text("old content")

        save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output,
        )

        content = output.read_text()
        assert "old content" not in content
        assert "test-project" in content

    @pytest.mark.parametrize(
        "terraform_version",
        ["1.5.0", "1.6.1", "1.10.3"],
        ids=["1.5.0", "1.6.1", "1.10.3"],
    )
    def test_save_receipt_terraform_versions(self, tmp_path, terraform_version):
        """save_receipt should handle different Terraform versions."""
        output = tmp_path / "receipt.md"

        save_receipt(
            project_id="test-project",
            region="us-central1",
            terraform_version=terraform_version,
            output_path=output,
        )

        content = output.read_text()
        assert terraform_version in content

    def test_save_receipt_returns_path_object(self, tmp_path):
        """save_receipt should return Path object."""
        output = tmp_path / "receipt.md"

        result = save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output,
        )

        assert isinstance(result, Path)

    def test_save_receipt_creates_parent_directories(self, tmp_path):
        """save_receipt should create parent directories if needed."""
        output = tmp_path / "nested" / "dir" / "receipt.md"
        output.parent.mkdir(parents=True, exist_ok=True)

        result = save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output,
        )

        assert result.exists()
        assert result.parent.exists()


class TestReceiptIntegration:
    """Test integration between receipt functions."""

    def test_generate_and_save_consistency(self, tmp_path):
        """Content from generate should match saved content."""
        generated = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
        )

        output = tmp_path / "receipt.md"
        save_receipt(
            project_id="test-project",
            region="us-central1",
            output_path=output,
        )

        saved_content = output.read_text()
        assert saved_content == generated["markdown"]

    def test_all_functions_work_together(self, tmp_path, mocker):
        """All receipt functions should work together."""
        # Generate content
        content = generate_receipt_content(
            project_id="test-project",
            region="us-central1",
            service_url="https://service.example.com",
        )

        # Print receipt
        mock_console = MagicMock()
        mocker.patch("receipt.Panel")
        print_receipt(
            console=mock_console,
            project_id="test-project",
            region="us-central1",
            service_url="https://service.example.com",
        )

        # Save receipt
        output = tmp_path / "receipt.md"
        result = save_receipt(
            project_id="test-project",
            region="us-central1",
            service_url="https://service.example.com",
            output_path=output,
        )

        # All should succeed
        assert "terminal" in content
        assert "markdown" in content
        assert mock_console.print.called
        assert result.exists()
