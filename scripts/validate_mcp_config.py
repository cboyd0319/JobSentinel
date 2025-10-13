#!/usr/bin/env python3
"""
MCP Server Configuration Validator

Tests connectivity and configuration for all MCP servers defined in .github/copilot-mcp.json.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple


def load_mcp_config() -> Dict:
    """Load MCP configuration from .github/copilot-mcp.json"""
    config_path = Path(__file__).parent.parent / ".github" / "copilot-mcp.json"
    with open(config_path) as f:
        return json.load(f)


def check_command_available(command: str) -> Tuple[bool, str]:
    """Check if a command is available in PATH"""
    try:
        result = subprocess.run(
            ["which", command],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
        return False, f"Command '{command}' not found in PATH"
    except Exception as e:
        return False, str(e)


def check_http_server(name: str, config: Dict) -> Tuple[bool, str]:
    """Check HTTP-based MCP server connectivity"""
    url = config.get("url", "")
    
    # Check if API key is configured
    headers = config.get("headers", {})
    api_key_var = None
    for key, value in headers.items():
        if value.startswith("$"):
            api_key_var = value[1:]  # Remove $ prefix
            break
    
    if api_key_var:
        api_key_value = os.environ.get(api_key_var)
        if not api_key_value:
            return False, f"API key environment variable '{api_key_var}' is not set"
    
    # Try to connect to the endpoint
    try:
        import httpx
        
        # Build headers with actual API key
        test_headers = {}
        if api_key_var and api_key_value:
            for key, value in headers.items():
                if value.startswith("$"):
                    test_headers[key] = api_key_value
                else:
                    test_headers[key] = value
        
        # Try a basic connectivity check
        with httpx.Client(timeout=10.0) as client:
            # Don't make actual API calls, just check if server is reachable
            # Most MCP servers require proper JSON-RPC 2.0 messages
            response = client.get(url, headers=test_headers)
            if response.status_code < 500:
                return True, f"Server reachable (HTTP {response.status_code})"
            return False, f"Server error (HTTP {response.status_code})"
    except ImportError:
        return False, "httpx not installed (run: pip install httpx)"
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


def check_local_server(name: str, config: Dict) -> Tuple[bool, str]:
    """Check local command-based MCP server"""
    command = config.get("command", "")
    
    # Check if command is available
    available, path_or_error = check_command_available(command)
    if not available:
        return False, path_or_error
    
    # Check environment variables
    env_vars = config.get("env", {})
    missing_vars = []
    for var_name, var_value in env_vars.items():
        if var_value.startswith("$"):
            env_var_name = var_value[1:]
            if not os.environ.get(env_var_name):
                missing_vars.append(env_var_name)
    
    if missing_vars:
        return False, f"Missing environment variables: {', '.join(missing_vars)}"
    
    return True, f"Command available at {path_or_error}"


def validate_servers() -> List[Dict]:
    """Validate all MCP servers"""
    config = load_mcp_config()
    servers = config.get("mcpServers", {})
    
    results = []
    for name, server_config in servers.items():
        server_type = server_config.get("type", "")
        description = server_config.get("description", "")
        
        print(f"\n{'='*70}")
        print(f"Testing: {name}")
        print(f"Type: {server_type}")
        print(f"Description: {description[:80]}...")
        print(f"{'='*70}")
        
        if server_type == "http":
            success, message = check_http_server(name, server_config)
        elif server_type == "local":
            success, message = check_local_server(name, server_config)
        else:
            success = False
            message = f"Unknown server type: {server_type}"
        
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"Status: {status}")
        print(f"Details: {message}")
        
        results.append({
            "name": name,
            "type": server_type,
            "success": success,
            "message": message
        })
    
    return results


def print_summary(results: List[Dict]):
    """Print validation summary"""
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    
    total = len(results)
    passed = sum(1 for r in results if r["success"])
    failed = total - passed
    
    print(f"Total servers: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\nFailed servers:")
        for result in results:
            if not result["success"]:
                print(f"  - {result['name']}: {result['message']}")
    
    print(f"\n{'='*70}")
    print("NOTES")
    print(f"{'='*70}")
    print("1. GitHub MCP tools are built-in to Copilot and don't need external configuration")
    print("2. HTTP servers (context7) may require API keys to be set in environment")
    print("3. Local servers (openai-websearch, fetch, playwright) require commands in PATH")
    print("4. Some servers may return 406/400 without proper JSON-RPC 2.0 requests")
    print("   but still indicate they are reachable and properly configured")
    
    return failed == 0


def main():
    """Main entry point"""
    print("MCP Server Configuration Validator")
    print("=" * 70)
    
    try:
        results = validate_servers()
        success = print_summary(results)
        sys.exit(0 if success else 1)
    except FileNotFoundError as e:
        print(f"Error: Configuration file not found: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
