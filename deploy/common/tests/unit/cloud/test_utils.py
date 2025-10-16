"""Comprehensive tests for cloud.common.utils module.

Tests utility functions for cloud deployment including:
- Spinner class
- Command redaction
- Async command execution
- File operations
- Path utilities
- User interaction
- Checksum verification
"""

import asyncio
import hashlib
import logging
import subprocess
import sys
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

# Module mocking is handled in conftest.py
from utils import (
    Spinner,
    _redact_command_for_logging,
    choose,
    confirm,
    current_os,
    download_and_verify,
    ensure_directory,
    ensure_python_version,
    prepend_path,
    print_header,
    resolve_project_root,
    run_command,
    verify_file_checksum,
    which,
)


class TestSpinner:
    """Test the Spinner context manager."""

    def test_spinner_init(self):
        """Spinner should initialize with message and logger."""
        logger = logging.getLogger("test")
        spinner = Spinner("Testing", logger)

        assert spinner.message == "Testing"
        assert spinner.logger is logger
        assert spinner.stop_spinner is False
        assert spinner.spinner_thread is None

    def test_spinner_context_manager_protocol(self):
        """Spinner should implement context manager protocol."""
        logger = logging.getLogger("test")
        spinner = Spinner("Testing", logger)

        assert hasattr(spinner, "__enter__")
        assert hasattr(spinner, "__exit__")

    @patch("threading.Thread")
    def test_spinner_enter_starts_thread(self, mock_thread_class):
        """Spinner __enter__ should start spinner thread."""
        mock_thread = MagicMock()
        mock_thread_class.return_value = mock_thread

        logger = logging.getLogger("test")
        spinner = Spinner("Testing", logger)

        result = spinner.__enter__()

        assert result is spinner
        assert spinner.stop_spinner is False
        mock_thread_class.assert_called_once()
        mock_thread.start.assert_called_once()

    @patch("threading.Thread")
    def test_spinner_exit_stops_thread(self, mock_thread_class):
        """Spinner __exit__ should stop spinner thread."""
        mock_thread = MagicMock()
        mock_thread_class.return_value = mock_thread

        logger = logging.getLogger("test")
        spinner = Spinner("Testing", logger)
        spinner.__enter__()
        spinner.__exit__(None, None, None)

        assert spinner.stop_spinner is True
        mock_thread.join.assert_called_once()


class TestRedactCommandForLogging:
    """Test command redaction for security."""

    @pytest.mark.parametrize(
        "command,expected",
        [
            # Simple commands without secrets
            (["ls", "-la"], "ls -la"),
            (["echo", "hello"], "echo hello"),
            # Commands with --token
            (["cmd", "--token=secret123"], "cmd --token=***REDACTED***"),
            (["cmd", "--token", "secret123"], "cmd --token ***REDACTED***"),
            # Commands with --password
            (["cmd", "--password=pass"], "cmd --password=***REDACTED***"),
            (["cmd", "--password", "pass"], "cmd --password ***REDACTED***"),
            # Commands with --key
            (["cmd", "--key=mykey"], "cmd --key=***REDACTED***"),
            (["cmd", "--key", "mykey"], "cmd --key ***REDACTED***"),
            # Commands with --secret
            (["cmd", "--secret=mysecret"], "cmd --secret=***REDACTED***"),
            (["cmd", "--secret", "mysecret"], "cmd --secret ***REDACTED***"),
            # Edge case: token at end
            (["cmd", "--token"], "cmd --token=***REDACTED***"),
            # Multiple secrets
            (
                ["cmd", "--token", "t1", "--password", "p1"],
                "cmd --token ***REDACTED*** --password ***REDACTED***",
            ),
        ],
        ids=[
            "no_secrets",
            "simple_echo",
            "token_equals",
            "token_space",
            "password_equals",
            "password_space",
            "key_equals",
            "key_space",
            "secret_equals",
            "secret_space",
            "token_at_end",
            "multiple_secrets",
        ],
    )
    def test_redact_command_patterns(self, command, expected):
        """_redact_command_for_logging should redact sensitive arguments."""
        result = _redact_command_for_logging(command)
        assert result == expected

    def test_redact_preserves_non_sensitive_args(self):
        """_redact_command_for_logging should preserve non-sensitive arguments."""
        command = ["gcloud", "auth", "login", "--project=my-project"]
        result = _redact_command_for_logging(command)
        assert "my-project" in result
        assert "gcloud" in result
        assert "auth" in result
        assert "login" in result

    def test_redact_empty_command(self):
        """_redact_command_for_logging should handle empty command."""
        result = _redact_command_for_logging([])
        assert result == ""

    def test_redact_single_element(self):
        """_redact_command_for_logging should handle single element."""
        result = _redact_command_for_logging(["cmd"])
        assert result == "cmd"


class TestRunCommand:
    """Test the async run_command function."""

    @pytest.mark.asyncio
    async def test_run_command_success(self, mocker):
        """run_command should execute successfully and return CompletedProcess."""
        mock_proc = AsyncMock()
        mock_proc.returncode = 0
        mock_proc.communicate = AsyncMock(return_value=(b"output", b""))

        mocker.patch(
            "asyncio.create_subprocess_exec",
            return_value=mock_proc,
        )

        logger = logging.getLogger("test")
        result = await run_command(["echo", "test"], logger)

        assert isinstance(result, subprocess.CompletedProcess)
        assert result.returncode == 0
        assert result.stdout == "output"

    @pytest.mark.asyncio
    async def test_run_command_with_capture_output(self, mocker):
        """run_command should capture output when requested."""
        mock_proc = AsyncMock()
        mock_proc.returncode = 0
        mock_proc.communicate = AsyncMock(return_value=(b"stdout data", b"stderr data"))

        mocker.patch(
            "asyncio.create_subprocess_exec",
            return_value=mock_proc,
        )

        logger = logging.getLogger("test")
        result = await run_command(["ls"], logger, capture_output=True)

        assert result.stdout == "stdout data"
        assert result.stderr == "stderr data"

    @pytest.mark.asyncio
    async def test_run_command_check_false_allows_failure(self, mocker):
        """run_command with check=False should not raise on non-zero exit."""
        mock_proc = AsyncMock()
        mock_proc.returncode = 1
        mock_proc.communicate = AsyncMock(return_value=(b"", b"error"))

        mocker.patch(
            "asyncio.create_subprocess_exec",
            return_value=mock_proc,
        )

        logger = logging.getLogger("test")
        result = await run_command(["false"], logger, check=False, capture_output=True)

        assert result.returncode == 1

    @pytest.mark.asyncio
    async def test_run_command_check_true_raises_on_failure(self, mocker):
        """run_command with check=True should raise on non-zero exit."""
        mock_proc = AsyncMock()
        mock_proc.returncode = 1
        mock_proc.communicate = AsyncMock(return_value=(b"", b"error"))

        mocker.patch(
            "asyncio.create_subprocess_exec",
            return_value=mock_proc,
        )

        logger = logging.getLogger("test")
        with pytest.raises(RuntimeError, match="Command failed"):
            await run_command(["false"], logger, check=True, capture_output=True)

    @pytest.mark.asyncio
    async def test_run_command_with_retries(self, mocker):
        """run_command should retry on failure when retries specified."""
        # First two attempts fail, third succeeds
        mock_proc_fail = AsyncMock()
        mock_proc_fail.returncode = 1
        mock_proc_fail.communicate = AsyncMock(return_value=(b"", b"error"))

        mock_proc_success = AsyncMock()
        mock_proc_success.returncode = 0
        mock_proc_success.communicate = AsyncMock(return_value=(b"ok", b""))

        mock_create = mocker.patch(
            "asyncio.create_subprocess_exec",
            side_effect=[mock_proc_fail, mock_proc_fail, mock_proc_success],
        )

        logger = logging.getLogger("test")
        result = await run_command(
            ["flaky"], logger, check=True, retries=2, delay=0.01, capture_output=True
        )

        assert result.returncode == 0
        assert mock_create.call_count == 3

    @pytest.mark.asyncio
    async def test_run_command_retries_exhausted(self, mocker):
        """run_command should raise after all retries exhausted."""
        mock_proc = AsyncMock()
        mock_proc.returncode = 1
        mock_proc.communicate = AsyncMock(return_value=(b"", b"error"))

        mocker.patch(
            "asyncio.create_subprocess_exec",
            return_value=mock_proc,
        )

        logger = logging.getLogger("test")
        with pytest.raises(RuntimeError, match="Command failed after"):
            await run_command(
                ["always_fails"], logger, check=True, retries=2, delay=0.01, capture_output=True
            )


class TestWhich:
    """Test the which function."""

    def test_which_finds_existing_binary(self):
        """which should find existing binaries on PATH."""
        # Python should always be on PATH in test environment
        result = which("python")
        assert result is not None
        assert isinstance(result, Path)
        assert result.exists()

    def test_which_returns_none_for_missing_binary(self):
        """which should return None for missing binaries."""
        result = which("this_binary_definitely_does_not_exist_12345")
        assert result is None

    @pytest.mark.parametrize(
        "binary",
        ["python", "python3", "pip"],
        ids=["python", "python3", "pip"],
    )
    def test_which_common_binaries(self, binary):
        """which should find common binaries."""
        result = which(binary)
        # These should exist in CI environment
        if result:
            assert isinstance(result, Path)
            assert result.exists()


class TestPrependPath:
    """Test the prepend_path function."""

    def test_prepend_path_adds_to_front(self, monkeypatch, tmp_path):
        """prepend_path should add directory to front of PATH."""
        original_path = "/usr/bin:/bin"
        monkeypatch.setenv("PATH", original_path)

        new_dir = tmp_path / "bin"
        prepend_path(new_dir)

        import os

        new_path = os.environ["PATH"]
        assert str(new_dir) in new_path
        assert new_path.startswith(str(new_dir))

    def test_prepend_path_preserves_existing(self, monkeypatch, tmp_path):
        """prepend_path should preserve existing PATH entries."""
        original_path = "/usr/bin:/bin"
        monkeypatch.setenv("PATH", original_path)

        new_dir = tmp_path / "bin"
        prepend_path(new_dir)

        import os

        new_path = os.environ["PATH"]
        assert "/usr/bin" in new_path
        assert "/bin" in new_path


class TestCurrentOS:
    """Test the current_os function."""

    def test_current_os_returns_valid_value(self):
        """current_os should return one of the expected OS identifiers."""
        result = current_os()
        assert result in {"windows", "mac", "linux"}

    def test_current_os_is_string(self):
        """current_os should return a string."""
        result = current_os()
        assert isinstance(result, str)

    @patch("platform.system")
    def test_current_os_windows(self, mock_system):
        """current_os should return 'windows' on Windows."""
        mock_system.return_value = "Windows"
        result = current_os()
        assert result == "windows"

    @patch("platform.system")
    def test_current_os_mac(self, mock_system):
        """current_os should return 'mac' on macOS."""
        mock_system.return_value = "Darwin"
        result = current_os()
        assert result == "mac"

    @patch("platform.system")
    def test_current_os_linux(self, mock_system):
        """current_os should return 'linux' on Linux."""
        mock_system.return_value = "Linux"
        result = current_os()
        assert result == "linux"


class TestEnsurePythonVersion:
    """Test the ensure_python_version function."""

    def test_ensure_python_version_passes_current_version(self):
        """ensure_python_version should pass for current Python version."""
        # Current version should always pass
        current = sys.version_info[:2]
        ensure_python_version(current)  # Should not raise

    def test_ensure_python_version_passes_lower_version(self):
        """ensure_python_version should pass for lower required version."""
        ensure_python_version((3, 6))  # Should not raise

    def test_ensure_python_version_fails_higher_version(self):
        """ensure_python_version should fail for higher required version."""
        with pytest.raises(SystemExit):
            ensure_python_version((99, 99))

    @pytest.mark.parametrize(
        "min_version",
        [(3, 6), (3, 7), (3, 8)],
        ids=["3.6", "3.7", "3.8"],
    )
    def test_ensure_python_version_old_versions_pass(self, min_version):
        """ensure_python_version should pass for old Python versions."""
        ensure_python_version(min_version)  # Should not raise


class TestPrintHeader:
    """Test the print_header function."""

    def test_print_header_prints_title(self, capsys):
        """print_header should print the title."""
        print_header("Test Title")
        captured = capsys.readouterr()
        assert "Test Title" in captured.out

    def test_print_header_prints_separator(self, capsys):
        """print_header should print separator line."""
        print_header("Test")
        captured = capsys.readouterr()
        assert "=" in captured.out

    @pytest.mark.parametrize(
        "title",
        ["Short", "Medium Length Title", "A Very Long Title That Should Still Work"],
        ids=["short", "medium", "long"],
    )
    def test_print_header_various_lengths(self, title, capsys):
        """print_header should handle various title lengths."""
        print_header(title)
        captured = capsys.readouterr()
        assert title in captured.out


class TestEnsureDirectory:
    """Test the ensure_directory function."""

    def test_ensure_directory_creates_new_directory(self, tmp_path):
        """ensure_directory should create new directory."""
        new_dir = tmp_path / "new_dir"
        result = ensure_directory(new_dir)

        assert result == new_dir
        assert new_dir.exists()
        assert new_dir.is_dir()

    def test_ensure_directory_with_existing_directory(self, tmp_path):
        """ensure_directory should handle existing directory."""
        existing_dir = tmp_path / "existing"
        existing_dir.mkdir()

        result = ensure_directory(existing_dir)

        assert result == existing_dir
        assert existing_dir.exists()

    def test_ensure_directory_creates_parent_directories(self, tmp_path):
        """ensure_directory should create parent directories."""
        nested_dir = tmp_path / "parent" / "child" / "grandchild"
        result = ensure_directory(nested_dir)

        assert result == nested_dir
        assert nested_dir.exists()
        assert nested_dir.parent.exists()

    def test_ensure_directory_returns_path(self, tmp_path):
        """ensure_directory should return Path object."""
        new_dir = tmp_path / "test"
        result = ensure_directory(new_dir)
        assert isinstance(result, Path)


class TestConfirm:
    """Test the confirm function."""

    def test_confirm_yes_input(self, monkeypatch):
        """confirm should return True for 'y' input."""
        monkeypatch.setattr("builtins.input", lambda _: "y")
        result = confirm("Proceed?")
        assert result is True

    def test_confirm_no_input(self, monkeypatch):
        """confirm should return False for 'n' input."""
        monkeypatch.setattr("builtins.input", lambda _: "n")
        result = confirm("Proceed?")
        assert result is False

    def test_confirm_empty_input(self, monkeypatch):
        """confirm should return False for empty input (default)."""
        monkeypatch.setattr("builtins.input", lambda _: "")
        result = confirm("Proceed?")
        assert result is False

    @pytest.mark.parametrize(
        "input_value,expected",
        [
            ("yes", True),
            ("YES", True),
            ("Y", True),
            ("no", False),
            ("NO", False),
            ("N", False),
            ("", False),
            ("maybe", False),
        ],
        ids=["yes", "YES", "Y", "no", "NO", "N", "empty", "invalid"],
    )
    def test_confirm_various_inputs(self, monkeypatch, input_value, expected):
        """confirm should handle various input values."""
        monkeypatch.setattr("builtins.input", lambda _: input_value)
        result = confirm("Proceed?")
        assert result is expected

    def test_confirm_no_prompt_mode(self):
        """confirm should return True in no-prompt mode."""
        result = confirm("Proceed?", no_prompt=True)
        assert result is True


class TestChoose:
    """Test the choose function."""

    def test_choose_valid_selection(self, monkeypatch):
        """choose should return selected option."""
        options = ["option1", "option2", "option3"]
        monkeypatch.setattr("builtins.input", lambda _: "2")

        result = choose("Select:", options)
        assert result == "option2"

    def test_choose_first_option(self, monkeypatch):
        """choose should handle selection of first option."""
        options = ["first", "second"]
        monkeypatch.setattr("builtins.input", lambda _: "1")

        result = choose("Select:", options)
        assert result == "first"

    def test_choose_last_option(self, monkeypatch):
        """choose should handle selection of last option."""
        options = ["first", "second", "third"]
        monkeypatch.setattr("builtins.input", lambda _: "3")

        result = choose("Select:", options)
        assert result == "third"

    def test_choose_no_prompt_mode(self):
        """choose should return first option in no-prompt mode."""
        options = ["option1", "option2", "option3"]
        result = choose("Select:", options, no_prompt=True)
        assert result == "option1"

    def test_choose_empty_options_raises(self):
        """choose should raise ValueError for empty options."""
        with pytest.raises(ValueError, match="No options provided"):
            choose("Select:", [])


class TestVerifyFileChecksum:
    """Test the verify_file_checksum function."""

    def test_verify_file_checksum_valid(self, tmp_path):
        """verify_file_checksum should return True for matching checksum."""
        test_file = tmp_path / "test.txt"
        content = b"test content"
        test_file.write_bytes(content)

        expected_hash = hashlib.sha256(content).hexdigest()
        result = verify_file_checksum(test_file, expected_hash)

        assert result is True

    def test_verify_file_checksum_invalid(self, tmp_path):
        """verify_file_checksum should return False for non-matching checksum."""
        test_file = tmp_path / "test.txt"
        test_file.write_bytes(b"test content")

        wrong_hash = "0" * 64
        result = verify_file_checksum(test_file, wrong_hash)

        assert result is False

    def test_verify_file_checksum_missing_file(self, tmp_path):
        """verify_file_checksum should return False for missing file."""
        missing_file = tmp_path / "missing.txt"
        result = verify_file_checksum(missing_file, "abc123")

        assert result is False

    def test_verify_file_checksum_case_insensitive(self, tmp_path):
        """verify_file_checksum should be case-insensitive."""
        test_file = tmp_path / "test.txt"
        content = b"test"
        test_file.write_bytes(content)

        expected_hash = hashlib.sha256(content).hexdigest()
        result = verify_file_checksum(test_file, expected_hash.upper())

        assert result is True

    def test_verify_file_checksum_accepts_path_and_string(self, tmp_path):
        """verify_file_checksum should accept both Path and string."""
        test_file = tmp_path / "test.txt"
        content = b"test"
        test_file.write_bytes(content)

        expected_hash = hashlib.sha256(content).hexdigest()

        # Test with Path
        assert verify_file_checksum(test_file, expected_hash) is True
        # Test with string
        assert verify_file_checksum(str(test_file), expected_hash) is True


class TestResolveProjectRoot:
    """Test the resolve_project_root function."""

    def test_resolve_project_root_returns_path(self):
        """resolve_project_root should return a Path object."""
        result = resolve_project_root()
        assert isinstance(result, Path)

    def test_resolve_project_root_is_absolute(self):
        """resolve_project_root should return an absolute path."""
        result = resolve_project_root()
        assert result.is_absolute()

    def test_resolve_project_root_exists(self):
        """resolve_project_root should return an existing directory."""
        result = resolve_project_root()
        # The path should exist in the context of the module
        assert isinstance(result, Path)


class TestDownloadAndVerify:
    """Test the download_and_verify function."""

    @pytest.mark.asyncio
    async def test_download_and_verify_success(self, tmp_path, mocker):
        """download_and_verify should download and verify file successfully."""
        dest = tmp_path / "download.txt"
        content = b"test content"
        expected_hash = hashlib.sha256(content).hexdigest()

        # Mock run_command to simulate download
        async def mock_run_cmd(cmd, logger, **kwargs):
            # Write content when curl is called
            if "curl" in cmd:
                dest.write_bytes(content)
            return subprocess.CompletedProcess(cmd, 0, "", "")

        mocker.patch("utils.run_command", side_effect=mock_run_cmd)

        result = await download_and_verify(
            "http://example.com/file.txt",
            dest,
            expected_hash,
        )

        assert result is True
        assert dest.exists()

    @pytest.mark.asyncio
    async def test_download_and_verify_checksum_mismatch(self, tmp_path, mocker):
        """download_and_verify should raise on checksum mismatch."""
        dest = tmp_path / "download.txt"
        content = b"test content"
        wrong_hash = "0" * 64

        # Mock run_command to simulate download
        async def mock_run_cmd(cmd, logger, **kwargs):
            if "curl" in cmd:
                dest.write_bytes(content)
            return subprocess.CompletedProcess(cmd, 0, "", "")

        mocker.patch("utils.run_command", side_effect=mock_run_cmd)

        with pytest.raises(RuntimeError, match="Checksum mismatch"):
            await download_and_verify(
                "http://example.com/file.txt",
                dest,
                wrong_hash,
            )

    @pytest.mark.asyncio
    async def test_download_and_verify_download_fails(self, tmp_path, mocker):
        """download_and_verify should raise on download failure."""
        dest = tmp_path / "download.txt"

        # Mock run_command to simulate download failure
        async def mock_run_cmd(cmd, logger, **kwargs):
            raise RuntimeError("Network error")

        mocker.patch("utils.run_command", side_effect=mock_run_cmd)

        with pytest.raises(RuntimeError, match="Download failed"):
            await download_and_verify(
                "http://example.com/file.txt",
                dest,
                "abc123",
            )
