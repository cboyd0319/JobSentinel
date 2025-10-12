"""
Unit tests for CLI commands (src/jsa/cli.py).

Tests all CLI commands added in Phase 0 to ensure they work correctly.
"""

import pytest
from unittest.mock import patch, MagicMock, Mock
from pathlib import Path
import json

from jsa.cli import (
    build_parser,
    main,
    _cmd_run_once,
    _cmd_search,
    _cmd_digest,
    _cmd_test_notifications,
    _cmd_cleanup,
    _cmd_logs,
    _cmd_cloud,
    _cmd_ai_setup,
    _cmd_web,
    _cmd_config_validate,
    _cmd_health,
)


class TestCLIParser:
    """Test argument parser construction."""
    
    def test_parser_has_all_commands(self):
        """Test that parser includes all expected commands."""
        parser = build_parser()
        
        # Get all subparser actions
        subparsers_actions = [
            action for action in parser._actions 
            if isinstance(action, type(parser._subparsers))
        ]
        
        # Get the choices (available commands)
        for action in subparsers_actions:
            commands = action.choices.keys()
            
            expected_commands = {
                'web', 'config-validate', 'health',
                'run-once', 'search', 'digest',
                'test-notifications', 'cleanup', 'logs',
                'cloud', 'ai-setup'
            }
            
            assert expected_commands.issubset(set(commands)), \
                f"Missing commands: {expected_commands - set(commands)}"
    
    def test_parser_help_doesnt_crash(self):
        """Test that --help doesn't crash."""
        parser = build_parser()
        
        with pytest.raises(SystemExit) as exc_info:
            parser.parse_args(['--help'])
        
        assert exc_info.value.code == 0
    
    def test_parser_requires_command(self):
        """Test that parser requires a command."""
        parser = build_parser()
        
        with pytest.raises(SystemExit):
            parser.parse_args([])


class TestWebCommand:
    """Test web UI command."""
    
    @patch('jsa.web.app.create_app')
    def test_web_default_port(self, mock_create_app):
        """Test web command with default port."""
        mock_app = MagicMock()
        mock_create_app.return_value = mock_app
        
        args = MagicMock(debug=False, port=5000)
        result = _cmd_web(args)
        
        assert result == 0
        mock_create_app.assert_called_once()
        mock_app.run.assert_called_once_with(debug=False, port=5000)
    
    @patch('jsa.web.app.create_app')
    def test_web_custom_port(self, mock_create_app):
        """Test web command with custom port."""
        mock_app = MagicMock()
        mock_create_app.return_value = mock_app
        
        args = MagicMock(debug=True, port=8080)
        result = _cmd_web(args)
        
        assert result == 0
        mock_app.run.assert_called_once_with(debug=True, port=8080)


class TestConfigValidateCommand:
    """Test configuration validation command."""
    
    @patch('jsa.cli.ConfigService')
    def test_config_validate_success(self, mock_config_service):
        """Test successful config validation."""
        mock_prefs = MagicMock()
        mock_prefs.keywords_boost = ["python", "java"]
        mock_prefs.digest_min_score = 0.7
        
        mock_service = MagicMock()
        mock_service.user_preferences.return_value = mock_prefs
        mock_config_service.return_value = mock_service
        
        args = MagicMock(path="config/user_prefs.json")
        result = _cmd_config_validate(args)
        
        assert result == 0
    
    @patch('jsa.cli.ConfigService')
    def test_config_validate_custom_path(self, mock_config_service):
        """Test config validation with custom path."""
        mock_prefs = MagicMock()
        mock_prefs.keywords_boost = []
        mock_prefs.digest_min_score = 0.5
        
        mock_service = MagicMock()
        mock_service.user_preferences.return_value = mock_prefs
        mock_config_service.return_value = mock_service
        
        args = MagicMock(path="/custom/path.json")
        result = _cmd_config_validate(args)
        
        assert result == 0
        mock_config_service.assert_called_once()
        assert mock_config_service.call_args[1]['config_path'] == Path("/custom/path.json")


class TestHealthCommand:
    """Test health check command."""
    
    @patch('jsa.cli.get_stats_sync')
    def test_health_ok(self, mock_get_stats):
        """Test health command when system is healthy."""
        mock_get_stats.return_value = {
            "total_jobs": 42,
            "high_score_jobs": 7
        }
        
        args = MagicMock()
        result = _cmd_health(args)
        
        assert result == 0
        mock_get_stats.assert_called_once()
    
    @patch('jsa.cli.get_stats_sync')
    def test_health_degraded(self, mock_get_stats):
        """Test health command when system has issues."""
        mock_get_stats.side_effect = Exception("Database error")
        
        args = MagicMock()
        result = _cmd_health(args)
        
        assert result == 1


class TestRunOnceCommand:
    """Test run-once command (main job search)."""
    
    @patch('src.agent.main')
    @patch('jsa.cli.asyncio.run')
    def test_run_once_success(self, mock_asyncio_run, mock_agent_main):
        """Test successful run-once execution."""
        mock_asyncio_run.return_value = None
        
        args = MagicMock()
        result = _cmd_run_once(args)
        
        assert result == 0
        mock_asyncio_run.assert_called_once()
    
    @patch('src.agent.main')
    @patch('jsa.cli.asyncio.run')
    def test_run_once_failure(self, mock_asyncio_run, mock_agent_main):
        """Test run-once with error."""
        mock_asyncio_run.side_effect = Exception("Scraping failed")
        
        args = MagicMock()
        result = _cmd_run_once(args)
        
        assert result == 1


class TestSearchCommand:
    """Test search command (alias for run-once)."""
    
    @patch('jsa.cli._cmd_run_once')
    def test_search_calls_run_once(self, mock_run_once):
        """Test that search command calls run-once."""
        mock_run_once.return_value = 0
        
        args = MagicMock()
        result = _cmd_search(args)
        
        assert result == 0
        mock_run_once.assert_called_once_with(args)


class TestDigestCommand:
    """Test digest generation command."""
    
    @patch('src.agent.main')
    @patch('jsa.cli.asyncio.run')
    def test_digest_success(self, mock_asyncio_run, mock_agent_main):
        """Test successful digest generation."""
        mock_asyncio_run.return_value = None
        
        args = MagicMock()
        result = _cmd_digest(args)
        
        assert result == 0
    
    @patch('src.agent.main')
    @patch('jsa.cli.asyncio.run')
    def test_digest_failure(self, mock_asyncio_run, mock_agent_main):
        """Test digest with error."""
        mock_asyncio_run.side_effect = Exception("Slack webhook failed")
        
        args = MagicMock()
        result = _cmd_digest(args)
        
        assert result == 1


class TestNotificationsCommand:
    """Test notification testing command."""
    
    @patch('src.agent.main')
    @patch('jsa.cli.asyncio.run')
    def test_notifications_success(self, mock_asyncio_run, mock_agent_main):
        """Test successful notification test."""
        mock_asyncio_run.return_value = None
        
        args = MagicMock()
        result = _cmd_test_notifications(args)
        
        assert result == 0


class TestCleanupCommand:
    """Test cleanup command."""
    
    @patch('src.agent.main')
    @patch('jsa.cli.asyncio.run')
    def test_cleanup_success(self, mock_asyncio_run, mock_agent_main):
        """Test successful cleanup."""
        mock_asyncio_run.return_value = None
        
        args = MagicMock()
        result = _cmd_cleanup(args)
        
        assert result == 0


class TestLogsCommand:
    """Test logs viewing command."""
    
    def test_logs_no_directory(self, tmp_path, monkeypatch):
        """Test logs command when no logs directory exists."""
        # Change to temp directory that has no logs
        monkeypatch.chdir(tmp_path)
        
        args = MagicMock(filter=None, tail=None)
        result = _cmd_logs(args)
        
        assert result == 1
    
    def test_logs_no_files(self, tmp_path, monkeypatch):
        """Test logs command when logs directory is empty."""
        # Create empty logs directory
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        monkeypatch.chdir(tmp_path)
        
        args = MagicMock(filter=None, tail=None)
        result = _cmd_logs(args)
        
        assert result == 1
    
    def test_logs_with_file(self, tmp_path, monkeypatch):
        """Test logs command with existing log file."""
        # Create logs directory and file
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        log_file = logs_dir / "jobsentinel_20250112.log"
        log_file.write_text("Line 1\nLine 2\nLine 3\n")
        
        monkeypatch.chdir(tmp_path)
        
        args = MagicMock(filter=None, tail=None)
        result = _cmd_logs(args)
        
        assert result == 0
    
    def test_logs_with_filter(self, tmp_path, monkeypatch):
        """Test logs command with filter."""
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        log_file = logs_dir / "jobsentinel_20250112.log"
        log_file.write_text("ERROR: Something bad\nINFO: All good\nERROR: Another problem\n")
        
        monkeypatch.chdir(tmp_path)
        
        args = MagicMock(filter="ERROR", tail=None)
        result = _cmd_logs(args)
        
        assert result == 0
    
    def test_logs_with_tail(self, tmp_path, monkeypatch):
        """Test logs command with tail limit."""
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        log_file = logs_dir / "jobsentinel_20250112.log"
        log_file.write_text("\n".join([f"Line {i}" for i in range(100)]))
        
        monkeypatch.chdir(tmp_path)
        
        args = MagicMock(filter=None, tail=10)
        result = _cmd_logs(args)
        
        assert result == 0


class TestCloudCommand:
    """Test cloud management command."""
    
    def test_cloud_no_subcommand(self):
        """Test cloud command without subcommand."""
        args = MagicMock()
        delattr(args, 'cloud_cmd')  # Simulate no subcommand
        
        result = _cmd_cloud(args)
        
        assert result == 1
    
    def test_cloud_bootstrap(self):
        """Test cloud bootstrap subcommand."""
        args = MagicMock(cloud_cmd='bootstrap')
        result = _cmd_cloud(args)
        
        # Currently returns 0 with placeholder message
        assert result == 0
    
    def test_cloud_status(self):
        """Test cloud status subcommand."""
        args = MagicMock(cloud_cmd='status')
        result = _cmd_cloud(args)
        
        assert result == 0


class TestAISetupCommand:
    """Test AI setup wizard command."""
    
    def test_ai_setup_displays_instructions(self):
        """Test AI setup shows configuration instructions."""
        args = MagicMock()
        result = _cmd_ai_setup(args)
        
        # Currently just displays instructions
        assert result == 0


class TestMainFunction:
    """Test main CLI entry point."""
    
    @patch('jsa.cli._cmd_health')
    def test_main_calls_command(self, mock_health):
        """Test that main calls the appropriate command."""
        mock_health.return_value = 0
        
        result = main(['health'])
        
        assert result == 0
        mock_health.assert_called_once()
    
    @patch('jsa.cli._cmd_run_once')
    def test_main_run_once(self, mock_run_once):
        """Test main with run-once command."""
        mock_run_once.return_value = 0
        
        result = main(['run-once'])
        
        assert result == 0
        mock_run_once.assert_called_once()
    
    def test_main_invalid_command(self):
        """Test main with invalid command."""
        with pytest.raises(SystemExit):
            main(['invalid-command'])


class TestEndToEnd:
    """End-to-end integration tests."""
    
    def test_help_for_all_commands(self):
        """Test that help works for all commands."""
        parser = build_parser()
        commands = [
            'web', 'config-validate', 'health',
            'run-once', 'search', 'digest',
            'test-notifications', 'cleanup', 'logs',
            'cloud', 'ai-setup'
        ]
        
        for cmd in commands:
            with pytest.raises(SystemExit) as exc_info:
                parser.parse_args([cmd, '--help'])
            assert exc_info.value.code == 0, f"Help failed for command: {cmd}"
    
    @patch('jsa.cli.get_stats_sync')
    def test_full_health_check(self, mock_get_stats):
        """Test complete health check flow."""
        mock_get_stats.return_value = {"total_jobs": 0, "high_score_jobs": 0}
        
        result = main(['health'])
        
        assert result == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
