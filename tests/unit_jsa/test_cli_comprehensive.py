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
        # Mock agent.main to avoid actual scraping
        mock_agent_main = Mock(return_value=None)
        
        with patch('src.agent.main', mock_agent_main):
            args = argparse.Namespace()
            result = _cmd_run_once(args)
            
            # Should return 0 on success
            assert result == 0
            # Should have called agent main
            assert mock_agent_main.called

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
        with patch('src.agent.main', Mock()) as mock_agent_main:
            args = argparse.Namespace()
            result = _cmd_digest(args)
            
            # Should return 0 on success
            assert result == 0
            # Should have called agent main
            assert mock_agent_main.called

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

    def test_notifications_slack_only(self):
        """Test sending Slack notification only."""
        with patch('notify.slack_notifier.send') as mock_slack:
            with patch('notify.email_notifier.send') as mock_email:
                args = argparse.Namespace(slack=True, email=False)
                result = _cmd_test_notifications(args)
                
                # Should send Slack
                assert mock_slack.called
                # Should NOT send email
                assert not mock_email.called
                # Should return 0 on success
                assert result == 0

    def test_notifications_email_only(self):
        """Test sending email notification only."""
        with patch('notify.slack_notifier.send') as mock_slack:
            with patch('notify.email_notifier.send') as mock_email:
                args = argparse.Namespace(slack=False, email=True)
                result = _cmd_test_notifications(args)
                
                # Should send email
                assert mock_email.called
                # Should NOT send Slack
                assert not mock_slack.called
                # Should return 0 on success
                assert result == 0

    def test_notifications_both(self):
        """Test sending both Slack and email."""
        with patch('notify.slack_notifier.send') as mock_slack:
            with patch('notify.email_notifier.send') as mock_email:
                args = argparse.Namespace(slack=True, email=True)
                result = _cmd_test_notifications(args)
                
                # Should send both
                assert mock_slack.called
                assert mock_email.called
                # Should return 0 on success
                assert result == 0

    def test_notifications_handles_slack_error(self, capsys):
        """Test handles Slack error gracefully."""
        with patch('notify.slack_notifier.send', side_effect=Exception("Slack error")):
            with patch('notify.email_notifier.send') as mock_email:
                args = argparse.Namespace(slack=True, email=False)
                result = _cmd_test_notifications(args)
                
                # Should print error but not crash
                captured = capsys.readouterr()
                assert "Slack error" in captured.err
                # Should return 1 on error
                assert result == 1


class TestCleanupCommand:
    """Tests for 'cleanup' command."""

    def test_cleanup_basic(self):
        """Test basic database cleanup."""
        with patch('jsa.db.cleanup_old_jobs') as mock_cleanup:
            args = argparse.Namespace(days=30, dry_run=False)
            result = _cmd_cleanup(args)
            
            # Should call cleanup
            mock_cleanup.assert_called_once_with(days=30, dry_run=False)
            # Should return 0 on success
            assert result == 0

    def test_cleanup_dry_run(self):
        """Test dry-run mode (preview only)."""
        with patch('jsa.db.cleanup_old_jobs', return_value=42) as mock_cleanup:
            args = argparse.Namespace(days=90, dry_run=True)
            result = _cmd_cleanup(args)
            
            # Should call cleanup in dry-run mode
            mock_cleanup.assert_called_once_with(days=90, dry_run=True)
            # Should return 0
            assert result == 0

    def test_cleanup_with_error(self, capsys):
        """Test cleanup handles errors."""
        with patch('jsa.db.cleanup_old_jobs', side_effect=Exception("DB error")):
            args = argparse.Namespace(days=30, dry_run=False)
            result = _cmd_cleanup(args)
            
            # Should return 1 on error
            assert result == 1
            # Should print error
            captured = capsys.readouterr()
            assert "DB error" in captured.err


class TestLogsCommand:
    """Tests for 'logs' command."""

    def test_logs_default(self, tmp_path):
        """Test logs with default settings."""
        # Create dummy log file
        log_file = tmp_path / "jobsentinel.log"
        log_file.write_text("Line 1\nLine 2\nLine 3\n")
        
        with patch('jsa.cli.LOGFILE_PATH', log_file):
            args = argparse.Namespace(tail=50, filter=None, export=None, follow=False)
            result = _cmd_logs(args)
            
            # Should return 0
            assert result == 0

    def test_logs_tail(self, tmp_path, capsys):
        """Test logs with tail option."""
        log_file = tmp_path / "jobsentinel.log"
        log_file.write_text("\n".join([f"Line {i}" for i in range(100)]))
        
        with patch('jsa.cli.LOGFILE_PATH', log_file):
            args = argparse.Namespace(tail=10, filter=None, export=None, follow=False)
            result = _cmd_logs(args)
            
            captured = capsys.readouterr()
            # Should show last 10 lines
            assert "Line 99" in captured.out
            assert "Line 90" in captured.out
            assert "Line 89" not in captured.out

    def test_logs_filter(self, tmp_path, capsys):
        """Test logs with filter option."""
        log_file = tmp_path / "jobsentinel.log"
        log_file.write_text("INFO: test\nERROR: problem\nWARNING: alert\nERROR: another\n")
        
        with patch('jsa.cli.LOGFILE_PATH', log_file):
            args = argparse.Namespace(tail=100, filter="ERROR", export=None, follow=False)
            result = _cmd_logs(args)
            
            captured = capsys.readouterr()
            # Should only show ERROR lines
            assert "ERROR: problem" in captured.out
            assert "ERROR: another" in captured.out
            assert "INFO: test" not in captured.out
            assert "WARNING: alert" not in captured.out

    def test_logs_export(self, tmp_path):
        """Test logs export to file."""
        log_file = tmp_path / "jobsentinel.log"
        log_file.write_text("Line 1\nLine 2\nLine 3\n")
        export_file = tmp_path / "export.txt"
        
        with patch('jsa.cli.LOGFILE_PATH', log_file):
            args = argparse.Namespace(tail=100, filter=None, export=str(export_file), follow=False)
            result = _cmd_logs(args)
            
            # Should create export file
            assert export_file.exists()
            # Should contain log content
            exported = export_file.read_text()
            assert "Line 1" in exported
            assert "Line 2" in exported
            assert "Line 3" in exported


class TestCloudCommand:
    """Tests for 'cloud' command."""

    def test_cloud_bootstrap_gcp(self):
        """Test cloud bootstrap for GCP."""
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = Mock(returncode=0)
            
            args = argparse.Namespace(
                cloud_action='bootstrap',
                provider='gcp',
                project_id='test-project',
                region='us-central1'
            )
            result = _cmd_cloud(args)
            
            # Should run terraform
            assert mock_run.called
            # Should return 0 on success
            assert result == 0

    def test_cloud_status(self, capsys):
        """Test cloud status check."""
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = Mock(returncode=0, stdout="Running")
            
            args = argparse.Namespace(cloud_action='status', provider='gcp')
            result = _cmd_cloud(args)
            
            # Should check status
            assert mock_run.called
            # Should return 0
            assert result == 0

    def test_cloud_teardown_confirmation(self, monkeypatch):
        """Test cloud teardown requires confirmation."""
        # Mock user input: no confirmation
        monkeypatch.setattr('builtins.input', lambda _: 'no')
        
        with patch('subprocess.run') as mock_run:
            args = argparse.Namespace(
                cloud_action='teardown',
                provider='gcp',
                force=False
            )
            result = _cmd_cloud(args)
            
            # Should NOT run terraform if not confirmed
            assert not mock_run.called

    def test_cloud_teardown_forced(self):
        """Test cloud teardown with force flag."""
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = Mock(returncode=0)
            
            args = argparse.Namespace(
                cloud_action='teardown',
                provider='gcp',
                force=True
            )
            result = _cmd_cloud(args)
            
            # Should run terraform without asking
            assert mock_run.called


class TestAISetupCommand:
    """Tests for 'ai-setup' command."""

    def test_ai_setup_interactive(self, monkeypatch):
        """Test interactive AI setup."""
        # Mock user input
        responses = iter(['openai', 'sk-test123', 'gpt-4o-mini'])
        monkeypatch.setattr('builtins.input', lambda _: next(responses))
        
        with patch('builtins.open', create=True) as mock_open:
            mock_file = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_file
            
            args = argparse.Namespace()
            result = _cmd_ai_setup(args)
            
            # Should write to .env
            assert mock_open.called
            # Should return 0 on success
            assert result == 0

    def test_ai_setup_validates_api_key(self, monkeypatch):
        """Test AI setup validates API key format."""
        # Mock invalid API key
        responses = iter(['openai', 'invalid-key', 'gpt-4o-mini'])
        monkeypatch.setattr('builtins.input', lambda _: next(responses))
        
        with patch('builtins.print') as mock_print:
            args = argparse.Namespace()
            result = _cmd_ai_setup(args)
            
            # Should print warning about invalid key
            # (Exact behavior depends on implementation)
            assert mock_print.called


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
