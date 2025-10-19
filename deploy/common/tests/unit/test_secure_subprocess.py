"""Comprehensive tests for utils.secure_subprocess module.

Tests cover:
- Binary allowlisting and security checks
- Argument redaction for sensitive data
- Subprocess execution with various options
- Error handling for security violations
- Edge cases and boundary conditions
"""

import os
import subprocess
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from utils.secure_subprocess import (
    ALLOWED_BINARIES,
    SENSITIVE_ARG_KEYWORDS,
    SubprocessSecurityError,
    _redact,
    _which,
    run_secure,
    run_secure_async,
)


class TestWhichFunction:
    """Tests for _which helper function."""

    def test_which_finds_existing_binary(self):
        """_which finds binary on PATH."""
        # Python should exist in test environment
        result = _which("python3")
        
        assert result is not None
        assert isinstance(result, Path)
        assert result.is_file() or result.is_symlink()

    def test_which_returns_none_for_nonexistent(self):
        """_which returns None for non-existent binary."""
        result = _which("definitely_not_a_real_binary_12345")
        
        assert result is None

    def test_which_resolves_absolute_path(self):
        """_which resolves to absolute path."""
        result = _which("python3")
        
        if result:  # Skip if not found
            assert result.is_absolute()

    @pytest.mark.parametrize(
        "binary_name",
        ["python3", "python", "gcloud"],
        ids=["python3", "python", "gcloud"],
    )
    def test_which_handles_various_binaries(self, binary_name):
        """_which works with various binary names."""
        result = _which(binary_name)
        # May or may not exist, but should not raise
        assert result is None or isinstance(result, Path)


class TestRedactFunction:
    """Tests for _redact argument redaction function."""

    def test_redact_normal_args_unchanged(self):
        """_redact leaves normal arguments unchanged."""
        args = ["python3", "script.py", "--verbose", "output.txt"]
        result = _redact(args)
        
        assert result == "python3 script.py --verbose output.txt"

    def test_redact_token_with_equals(self):
        """_redact redacts token arguments with = syntax."""
        args = ["gcloud", "auth", "--token=secret123"]
        result = _redact(args)
        
        assert "secret123" not in result
        assert "--token=***REDACTED***" in result

    def test_redact_token_as_separate_arg(self):
        """_redact redacts token passed as separate argument."""
        args = ["gcloud", "auth", "--token", "secret123", "other"]
        result = _redact(args)
        
        assert "secret123" not in result
        assert "***REDACTED***" in result
        assert "other" in result

    @pytest.mark.parametrize(
        "keyword",
        ["token", "password", "secret", "key", "passwd", "webhook"],
        ids=list(SENSITIVE_ARG_KEYWORDS),
    )
    def test_redact_all_sensitive_keywords(self, keyword):
        """_redact redacts all configured sensitive keywords."""
        args = ["cmd", f"--{keyword}=value123"]
        result = _redact(args)
        
        assert "value123" not in result
        assert "***REDACTED***" in result

    def test_redact_case_insensitive(self):
        """_redact is case-insensitive for keywords."""
        args = ["cmd", "--TOKEN=abc", "--PaSsWoRd=def"]
        result = _redact(args)
        
        assert "abc" not in result
        assert "def" not in result

    def test_redact_multiple_sensitive_args(self):
        """_redact handles multiple sensitive arguments."""
        args = ["cmd", "--token=t1", "--password", "p1", "--key=k1"]
        result = _redact(args)
        
        assert "t1" not in result
        assert "p1" not in result
        assert "k1" not in result
        assert result.count("***REDACTED***") == 3

    def test_redact_empty_args(self):
        """_redact handles empty argument list."""
        result = _redact([])
        
        assert result == ""

    def test_redact_single_arg(self):
        """_redact handles single argument."""
        result = _redact(["python3"])
        
        assert result == "python3"

    def test_redact_preserves_order(self):
        """_redact preserves argument order."""
        args = ["cmd", "arg1", "--token=sec", "arg2"]
        result = _redact(args)
        
        parts = result.split()
        assert parts[0] == "cmd"
        assert parts[1] == "arg1"
        # token should be redacted but in position 2
        assert "***REDACTED***" in parts[2]

    def test_redact_substring_match(self):
        """_redact matches keywords as substrings."""
        args = ["cmd", "--api-token=value"]
        result = _redact(args)
        
        assert "value" not in result
        assert "***REDACTED***" in result

    def test_redact_last_arg_is_sensitive(self):
        """_redact handles sensitive keyword as last arg."""
        args = ["cmd", "arg1", "--password"]
        result = _redact(args)
        
        # No value to redact, but should not fail
        assert "--password" in result


class TestRunSecureBasics:
    """Tests for run_secure basic functionality."""

    def test_run_secure_empty_args_raises(self):
        """run_secure raises for empty command."""
        with pytest.raises(SubprocessSecurityError, match="Empty command"):
            run_secure([])

    def test_run_secure_disallowed_binary_raises(self):
        """run_secure raises for non-allowlisted binary."""
        with pytest.raises(SubprocessSecurityError, match="not allowlisted"):
            run_secure(["not_allowed_binary", "arg"])

    def test_run_secure_nonexistent_binary_raises(self):
        """run_secure raises for binary not on PATH."""
        # First need to add to allowlist, then it will check PATH
        import utils.secure_subprocess
        original_allowed = utils.secure_subprocess.ALLOWED_BINARIES.copy()
        try:
            utils.secure_subprocess.ALLOWED_BINARIES.add("nonexistent_fake_binary_xyz")
            with pytest.raises(SubprocessSecurityError, match="not found on PATH"):
                run_secure(["nonexistent_fake_binary_xyz"])
        finally:
            utils.secure_subprocess.ALLOWED_BINARIES = original_allowed

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_executes_allowed_command(self, mock_tracker, mock_run, mock_which):
        """run_secure executes allowed command successfully."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_proc = Mock(spec=subprocess.CompletedProcess)
        mock_run.return_value = mock_proc
        
        result = run_secure(["python3", "--version"])
        
        assert result is mock_proc
        mock_run.assert_called_once()
        mock_tracker.incr_subprocess.assert_called_once()

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_passes_arguments(self, mock_tracker, mock_run, mock_which):
        """run_secure passes all arguments correctly."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "script.py", "--arg1", "value1"])
        
        call_args = mock_run.call_args[0][0]
        assert call_args == ["python3", "script.py", "--arg1", "value1"]

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_increments_tracker(self, mock_tracker, mock_run, mock_which):
        """run_secure increments subprocess tracker."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "--version"])
        
        mock_tracker.incr_subprocess.assert_called_once()


class TestRunSecureOptions:
    """Tests for run_secure with various options."""

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_with_cwd(self, mock_tracker, mock_run, mock_which):
        """run_secure passes cwd option."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        test_cwd = Path("/tmp/test")
        
        run_secure(["python3", "--version"], cwd=test_cwd)
        
        assert mock_run.call_args[1]["cwd"] == str(test_cwd)

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_with_env(self, mock_tracker, mock_run, mock_which):
        """run_secure passes env option."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        test_env = {"VAR": "value"}
        
        run_secure(["python3", "--version"], env=test_env)
        
        assert mock_run.call_args[1]["env"] == test_env

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_with_timeout(self, mock_tracker, mock_run, mock_which):
        """run_secure passes timeout option."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "--version"], timeout=60)
        
        assert mock_run.call_args[1]["timeout"] == 60

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_capture_output_true(self, mock_tracker, mock_run, mock_which):
        """run_secure captures output when requested."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "--version"], capture_output=True)
        
        assert mock_run.call_args[1]["capture_output"] is True

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_capture_output_false(self, mock_tracker, mock_run, mock_which):
        """run_secure respects capture_output=False."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "--version"], capture_output=False)
        
        assert mock_run.call_args[1]["capture_output"] is False

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_check_true(self, mock_tracker, mock_run, mock_which):
        """run_secure passes check=True."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "--version"], check=True)
        
        assert mock_run.call_args[1]["check"] is True

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_check_false(self, mock_tracker, mock_run, mock_which):
        """run_secure respects check=False."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "--version"], check=False)
        
        assert mock_run.call_args[1]["check"] is False


class TestRunSecureErrorHandling:
    """Tests for run_secure error handling."""

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_timeout_raises(self, mock_tracker, mock_run, mock_which):
        """run_secure raises RuntimeError on timeout."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.side_effect = subprocess.TimeoutExpired("python3", 10)
        
        with pytest.raises(RuntimeError, match="timed out"):
            run_secure(["python3", "slow.py"], timeout=10)

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_called_process_error_with_check(self, mock_tracker, mock_run, mock_which):
        """run_secure raises RuntimeError on CalledProcessError when check=True."""
        mock_which.return_value = Path("/usr/bin/python3")
        error = subprocess.CalledProcessError(1, "python3", stderr="Error output")
        mock_run.side_effect = error
        
        with pytest.raises(RuntimeError, match="Command failed"):
            run_secure(["python3", "bad.py"], check=True)

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_called_process_error_without_check(self, mock_tracker, mock_run, mock_which):
        """run_secure returns exception when check=False."""
        mock_which.return_value = Path("/usr/bin/python3")
        error = subprocess.CalledProcessError(1, "python3")
        mock_run.side_effect = error
        
        result = run_secure(["python3", "bad.py"], check=False)
        
        # Should return the exception itself
        assert result is error

    def test_run_secure_absolute_path_mismatch_raises(self):
        """run_secure raises on absolute path that doesn't match resolved."""
        # This would require crafting a scenario where resolved != provided
        # For now, test that using absolute path works when it matches
        with patch("utils.secure_subprocess._which") as mock_which:
            mock_which.return_value = Path("/usr/bin/python3")
            
            # Providing absolute path that doesn't match
            with pytest.raises(SubprocessSecurityError, match="mismatch"):
                run_secure(["/different/path/python3"], check=False)


class TestRunSecureSecurity:
    """Tests for security features of run_secure."""

    @pytest.mark.parametrize(
        "binary",
        ["python", "python3", "gcloud", "cmd"],
        ids=["python", "python3", "gcloud", "cmd"],
    )
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_allows_all_allowlisted_binaries(self, mock_tracker, mock_run, binary):
        """run_secure allows all binaries in ALLOWED_BINARIES."""
        # Only test if binary exists
        if _which(binary):
            mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
            
            # Should not raise
            run_secure([binary, "--version"])

    def test_run_secure_redacts_sensitive_args_in_error(self):
        """run_secure redacts sensitive args in error messages."""
        with patch("utils.secure_subprocess._which") as mock_which:
            mock_which.return_value = Path("/usr/bin/python3")
            
            with patch("subprocess.run") as mock_run:
                error = subprocess.CalledProcessError(
                    1, "python3", stderr="Error"
                )
                mock_run.side_effect = error
                
                with pytest.raises(RuntimeError) as exc_info:
                    run_secure(["python3", "--token=secret123"], check=True)
                
                # Error message should have redacted the token
                assert "secret123" not in str(exc_info.value)
                assert "***REDACTED***" in str(exc_info.value)

    @patch("utils.secure_subprocess._which")
    @patch("subprocess.run")
    @patch("utils.secure_subprocess.tracker")
    def test_run_secure_no_shell_execution(self, mock_tracker, mock_run, mock_which):
        """run_secure never uses shell=True."""
        mock_which.return_value = Path("/usr/bin/python3")
        mock_run.return_value = Mock(spec=subprocess.CompletedProcess)
        
        run_secure(["python3", "--version"])
        
        # Verify shell is not in kwargs or is False
        call_kwargs = mock_run.call_args[1]
        assert call_kwargs.get("shell", False) is False


class TestRunSecureAsync:
    """Tests for run_secure_async placeholder."""

    def test_run_secure_async_not_implemented(self):
        """run_secure_async raises NotImplementedError."""
        with pytest.raises(NotImplementedError, match="not yet implemented"):
            run_secure_async(["python3", "--version"])


class TestAllowedBinaries:
    """Tests for ALLOWED_BINARIES configuration."""

    def test_allowed_binaries_is_set(self):
        """ALLOWED_BINARIES is defined and non-empty."""
        assert ALLOWED_BINARIES
        assert isinstance(ALLOWED_BINARIES, set)
        assert len(ALLOWED_BINARIES) > 0

    def test_allowed_binaries_contains_expected(self):
        """ALLOWED_BINARIES contains expected binaries."""
        expected = {"python3", "python", "gcloud"}
        assert expected.issubset(ALLOWED_BINARIES)


class TestSensitiveKeywords:
    """Tests for SENSITIVE_ARG_KEYWORDS configuration."""

    def test_sensitive_keywords_is_set(self):
        """SENSITIVE_ARG_KEYWORDS is defined and non-empty."""
        assert SENSITIVE_ARG_KEYWORDS
        assert isinstance(SENSITIVE_ARG_KEYWORDS, set)
        assert len(SENSITIVE_ARG_KEYWORDS) > 0

    def test_sensitive_keywords_contains_expected(self):
        """SENSITIVE_ARG_KEYWORDS contains expected keywords."""
        expected = {"token", "password", "secret", "key"}
        assert expected.issubset(SENSITIVE_ARG_KEYWORDS)
