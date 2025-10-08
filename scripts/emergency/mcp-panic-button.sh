#!/bin/bash
#
# MCP Panic Button - Emergency disable for compromised MCP servers
#
# Usage:
#   ./scripts/mcp-panic-button.sh                    # Disable ALL MCP servers
#   ./scripts/mcp-panic-button.sh jobspy             # Disable specific server
#   ./scripts/mcp-panic-button.sh --restore          # Restore from backup
#   ./scripts/mcp-panic-button.sh --status           # Show current status
#
# Cost: FREE
# Impact: CRITICAL (incident response)

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

CONFIG_FILE="config/user_prefs.json"
BACKUP_FILE="config/user_prefs.json.backup.$(date +%Y%m%d_%H%M%S)"
DISABLE_FLAG=".mcp_disabled"

show_help() {
    cat << EOF
MCP Panic Button - Emergency Disable for Compromised Servers

Usage:
  $0                    Disable ALL MCP servers (emergency)
  $0 <server>           Disable specific server (jobspy, reed, etc.)
  $0 --restore          Restore MCP servers from backup
  $0 --status           Show MCP server status
  $0 --help             Show this help message

Examples:
  $0                    # Disable everything
  $0 jobspy             # Disable JobSpy only
  $0 --restore          # Undo disable

Security Notes:
  - Creates backup before disabling
  - Kills Docker containers (if running)
  - Sets .mcp_disabled flag to prevent restart
  - Logs event to audit log

EOF
    exit 0
}

show_status() {
    echo -e "${GREEN}=== MCP Server Status ===${NC}\n"

    if [ -f "$DISABLE_FLAG" ]; then
        echo -e "${RED}🚨 PANIC MODE ACTIVE${NC}"
        echo "All MCP servers are DISABLED"
        echo "Flag file: $DISABLE_FLAG"
        echo ""
        echo "To restore: $0 --restore"
        echo ""
    else
        echo -e "${GREEN}✅ Normal operation${NC}"
        echo "MCP servers are enabled"
        echo ""
    fi

    # Check config
    if [ -f "$CONFIG_FILE" ]; then
        echo "Configuration: $CONFIG_FILE"
        echo ""
        echo "Enabled servers:"
        python3 -c "
import json
try:
    with open('$CONFIG_FILE', 'r') as f:
        config = json.load(f)
        mcp_servers = config.get('mcp_servers', {})
        for name, settings in mcp_servers.items():
            enabled = settings.get('enabled', False)
            status = '✅ ENABLED' if enabled else '❌ DISABLED'
            print(f'  • {name}: {status}')
except Exception as e:
    print(f'Error reading config: {e}')
"
    else
        echo -e "${YELLOW}⚠️  Config file not found: $CONFIG_FILE${NC}"
    fi

    # Check Docker containers
    echo ""
    echo "Docker containers:"
    if command -v docker &> /dev/null; then
        docker ps --filter "name=mcp-" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "  (none running)"
    else
        echo "  Docker not available"
    fi

    exit 0
}

disable_all_servers() {
    echo -e "${RED}🚨 INITIATING PANIC MODE${NC}"
    echo ""
    echo "This will:"
    echo "  1. Create config backup"
    echo "  2. Disable ALL MCP servers in config"
    echo "  3. Kill all Docker containers"
    echo "  4. Set .mcp_disabled flag"
    echo ""
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi

    # 1. Backup config
    if [ -f "$CONFIG_FILE" ]; then
        cp "$CONFIG_FILE" "$BACKUP_FILE"
        echo -e "${GREEN}✅ Created backup: $BACKUP_FILE${NC}"
    else
        echo -e "${YELLOW}⚠️  Config file not found, skipping backup${NC}"
    fi

    # 2. Disable in config
    if [ -f "$CONFIG_FILE" ]; then
        python3 << 'PYTHON_SCRIPT'
import json
import sys

try:
    with open('config/user_prefs.json', 'r') as f:
        config = json.load(f)

    if 'mcp_servers' in config:
        for server_name in config['mcp_servers']:
            config['mcp_servers'][server_name]['enabled'] = False

    with open('config/user_prefs.json', 'w') as f:
        json.dump(config, f, indent=2)

    print('✅ Disabled all MCP servers in config')
except Exception as e:
    print(f'❌ Error updating config: {e}')
    sys.exit(1)
PYTHON_SCRIPT
    fi

    # 3. Kill Docker containers
    if command -v docker &> /dev/null; then
        echo "Stopping MCP Docker containers..."
        docker ps --filter "name=mcp-" --format "{{.Names}}" | xargs -r docker stop 2>/dev/null || true
        echo -e "${GREEN}✅ Stopped Docker containers${NC}"
    fi

    # 4. Set disable flag
    touch "$DISABLE_FLAG"
    echo -e "${GREEN}✅ Set disable flag: $DISABLE_FLAG${NC}"

    # 5. Log to audit log
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - PANIC BUTTON: Disabled all MCP servers" >> logs/audit.jsonl

    echo ""
    echo -e "${RED}🚨 PANIC MODE ACTIVE${NC}"
    echo "All MCP servers are now DISABLED"
    echo ""
    echo "To restore: $0 --restore"
}

disable_specific_server() {
    SERVER_NAME="$1"

    echo -e "${YELLOW}⚠️  Disabling MCP server: $SERVER_NAME${NC}"

    # Backup config
    if [ -f "$CONFIG_FILE" ]; then
        cp "$CONFIG_FILE" "$BACKUP_FILE"
        echo -e "${GREEN}✅ Created backup: $BACKUP_FILE${NC}"
    fi

    # Disable specific server
    python3 << PYTHON_SCRIPT
import json
import sys

server_name = "$SERVER_NAME"

try:
    with open('config/user_prefs.json', 'r') as f:
        config = json.load(f)

    if 'mcp_servers' in config and server_name in config['mcp_servers']:
        config['mcp_servers'][server_name]['enabled'] = False

        with open('config/user_prefs.json', 'w') as f:
            json.dump(config, f, indent=2)

        print(f'✅ Disabled {server_name}')
    else:
        print(f'❌ Server not found: {server_name}')
        sys.exit(1)
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
PYTHON_SCRIPT

    # Stop Docker container if running
    if command -v docker &> /dev/null; then
        docker stop "mcp-${SERVER_NAME}" 2>/dev/null || true
        echo -e "${GREEN}✅ Stopped Docker container (if running)${NC}"
    fi

    # Log event
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - PANIC BUTTON: Disabled MCP server '$SERVER_NAME'" >> logs/audit.jsonl

    echo ""
    echo -e "${GREEN}✅ Server '$SERVER_NAME' is now DISABLED${NC}"
}

restore_servers() {
    echo -e "${GREEN}Restoring MCP servers from backup...${NC}"

    # Find most recent backup
    LATEST_BACKUP=$(ls -t config/user_prefs.json.backup.* 2>/dev/null | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ No backup found${NC}"
        exit 1
    fi

    echo "Restoring from: $LATEST_BACKUP"
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi

    # Restore config
    cp "$LATEST_BACKUP" "$CONFIG_FILE"
    echo -e "${GREEN}✅ Restored config${NC}"

    # Remove disable flag
    if [ -f "$DISABLE_FLAG" ]; then
        rm "$DISABLE_FLAG"
        echo -e "${GREEN}✅ Removed disable flag${NC}"
    fi

    # Log event
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - PANIC BUTTON: Restored MCP servers from backup" >> logs/audit.jsonl

    echo ""
    echo -e "${GREEN}✅ MCP servers restored${NC}"
    echo "Review configuration before restarting: $CONFIG_FILE"
}

# Main logic
case "${1:-}" in
    --help|-h)
        show_help
        ;;
    --status|-s)
        show_status
        ;;
    --restore|-r)
        restore_servers
        ;;
    "")
        disable_all_servers
        ;;
    *)
        disable_specific_server "$1"
        ;;
esac
