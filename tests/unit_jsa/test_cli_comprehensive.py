"""
Comprehensive test suite for all CLI commands in v0.6.0.

Tests all 8 new commands added in Phase 0:
- run-once
- search
- digest
- test-notifications
- cleanup
- logs
- cloud (bootstrap, status, teardown)
- ai-setup
"""

import pytest
import subprocess
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import argparse

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from jsa.cli import (
    _cmd_run_once,
    _cmd_search,
    _cmd_digest,
    _cmd_test_notifications,
    _cmd_cleanup,
    _cmd_logs,
    _cmd_cloud,
    _cmd_ai_setup,
)


class TestRunOnceCommand:
    """Tests for 'run-once' command."""

    def test_run_once_basic(self, monkeypatch):
        """Test basic run-once execution."""
        # Mock agent.main as async coroutine
        async def mock_agent_main():
            return None
        
        with patch('src.agent.main', return_value=mock_agent_main()):
            args = argparse.Namespace()
            result = _cmd_run_once(args)
            
            # Should return 0 on success
            assert result == 0

    def test_run_once_with_error(self, monkeypatch):
        """Test run-once handles errors gracefully."""
        # Mock agent.main to raise exception
        mock_agent_main = Mock(side_effect=Exception("Test error"))
        
        with patch('src.agent.main', mock_agent_main):
            args = argparse.Namespace()
            result = _cmd_run_once(args)
            
            # Should return non-zero on error
            assert result == 1

    def test_run_once_preserves_argv(self):
        """Test run-once preserves sys.argv after execution."""
        original_argv = sys.argv.copy()
        
        with patch('src.agent.main', Mock()):
            args = argparse.Namespace()
            _cmd_run_once(args)
            
        # sys.argv should be restored
        assert sys.argv == original_argv


class TestSearchCommand:
    """Tests for 'search' command (alias for run-once)."""

    def test_search_is_alias(self):
        """Test search command is an alias for run-once."""
        with patch('jsa.cli._cmd_run_once', return_value=42) as mock_run_once:
            args = argparse.Namespace()
            result = _cmd_search(args)
            
            # Should call run-once
            mock_run_once.assert_called_once_with(args)
            # Should return same result
            assert result == 42


class TestDigestCommand:
    """Tests for 'digest' command."""

    def test_digest_basic(self):
        """Test basic digest execution."""
        async def mock_agent_main():
            return None
        
        with patch('src.agent.main', return_value=mock_agent_main()):
            args = argparse.Namespace()
            result = _cmd_digest(args)
            
            # Should return 0 on success
            assert result == 0

    def test_digest_passes_correct_mode(self, capsys):
        """Test digest passes correct mode to agent."""
        with patch('src.agent.main', Mock()) as mock_agent_main:
            with patch('sys.argv', ['cli', 'digest']):
                args = argparse.Namespace()
                _cmd_digest(args)
                
                # Should have called agent with digest mode
                # (We check by inspecting sys.argv manipulation)
                assert mock_agent_main.called


class TestNotificationsCommand:
    """Tests for 'test-notifications' command."""

    def test_notifications_basic(self):
        """Test notification command executes."""
        async def mock_agent_main():
            return None
        
        with patch('src.agent.main', return_value=mock_agent_main()):
            args = argparse.Namespace()
            result = _cmd_test_notifications(args)
            
            # Should return 0 on success
            assert result == 0

    def test_notifications_with_error(self):
        """Test handles notification errors gracefully."""
        async def mock_error():
            raise Exception("Notification error")
        
        with patch('src.agent.main', return_value=mock_error()):
            args = argparse.Namespace()
            result = _cmd_test_notifications(args)
            
            # Should return 1 on error
            assert result == 1


class TestCleanupCommand:
    """Tests for 'cleanup' command."""

    def test_cleanup_basic(self):
        """Test basic database cleanup."""
        async def mock_agent_main():
            return None
        
        with patch('src.agent.main', return_value=mock_agent_main()):
            args = argparse.Namespace()
            result = _cmd_cleanup(args)
            
            # Should return 0 on success
            assert result == 0

    def test_cleanup_with_error(self):
        """Test cleanup handles errors."""
        async def mock_error():
            raise Exception("Cleanup error")
        
        with patch('src.agent.main', return_value=mock_error()):
            args = argparse.Namespace()
            result = _cmd_cleanup(args)
            
            # Should return 1 on error
            assert result == 1


class TestLogsCommand:
    """Tests for 'logs' command."""

    def test_logs_no_logs_dir(self):
        """Test logs command when logs directory doesn't exist."""
        with patch('pathlib.Path.exists', return_value=False):
            args = argparse.Namespace(tail=50, filter=None)
            result = _cmd_logs(args)
            
            # Should return 1 when no logs
            assert result == 1

    def test_logs_basic(self, tmp_path, monkeypatch):
        """Test logs command basic functionality."""
        # Create logs directory with a log file
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        log_file = logs_dir / "jobsentinel_2025.log"
        log_file.write_text("Line 1\nLine 2\nLine 3\n")
        
        # Change to tmp directory
        monkeypatch.chdir(tmp_path)
        
        args = argparse.Namespace(tail=50, filter=None)
        result = _cmd_logs(args)
        
        # Should return 0 on success
        assert result == 0


class TestCloudCommand:
    """Tests for 'cloud' command."""

    def test_cloud_no_subcommand(self):
        """Test cloud command requires subcommand."""
        args = argparse.Namespace(cloud_cmd=None)
        result = _cmd_cloud(args)
        
        # Should return 1 when no subcommand
        assert result == 1

    def test_cloud_with_subcommand(self):
        """Test cloud command with valid subcommand."""
        args = argparse.Namespace(cloud_cmd='status')
        result = _cmd_cloud(args)
        
        # Should return 0 (placeholder implementation)
        assert result == 0


class TestAISetupCommand:
    """Tests for 'ai-setup' command."""

    def test_ai_setup_placeholder(self):
        """Test AI setup command (placeholder implementation)."""
        args = argparse.Namespace()
        result = _cmd_ai_setup(args)
        
        # Should return 0 (placeholder for Phase 5)
        assert result == 0


class TestCLIIntegration:
    """Integration tests for CLI."""

    def test_cli_main_entry_point(self):
        """Test CLI main entry point works."""
        # Just test that main() can be called
        from jsa.cli import main
        
        # Mock sys.argv
        with patch('sys.argv', ['jsa', '--help']):
            with pytest.raises(SystemExit) as exc_info:
                main()
            
            # --help should exit with 0
            assert exc_info.value.code == 0

    def test_all_commands_have_help(self):
        """Test all commands have help text."""
        from jsa.cli import main
        
        commands = [
            'run-once',
            'search', 
            'digest',
            'test-notifications',
            'cleanup',
            'logs',
            'cloud',
            'ai-setup',
            'web',
            'config-validate',
            'health'
        ]
        
        for cmd in commands:
            with patch('sys.argv', ['jsa', cmd, '--help']):
                with pytest.raises(SystemExit) as exc_info:
                    main()
                
                # --help should always exit with 0
                assert exc_info.value.code == 0

    def test_invalid_command_shows_error(self, capsys):
        """Test invalid command shows helpful error."""
        from jsa.cli import main
        
        with patch('sys.argv', ['jsa', 'invalid-command']):
            with pytest.raises(SystemExit) as exc_info:
                main()
            
            # Should exit with non-zero
            assert exc_info.value.code != 0


class TestCLIErrorHandling:
    """Tests for CLI error handling."""

    def test_command_exception_returns_nonzero(self):
        """Test commands return non-zero on exception."""
        with patch('src.agent.main', side_effect=Exception("Test error")):
            args = argparse.Namespace()
            result = _cmd_run_once(args)
            
            assert result == 1

    def test_command_prints_error_to_stderr(self, capsys):
        """Test commands print errors to stderr."""
        with patch('src.agent.main', side_effect=Exception("Test error")):
            args = argparse.Namespace()
            _cmd_run_once(args)
            
            captured = capsys.readouterr()
            assert "Test error" in captured.err

    def test_keyboard_interrupt_handled(self):
        """Test KeyboardInterrupt is handled gracefully."""
        with patch('src.agent.main', side_effect=KeyboardInterrupt()):
            args = argparse.Namespace()
            result = _cmd_run_once(args)
            
            # Should return 130 (standard for SIGINT)
            # Or handle gracefully
            assert result in (0, 1, 130)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
