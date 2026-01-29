#!/bin/bash
# Goveefy Startup — Quick launcher for Linux & macOS
# Checks configuration and starts the backend with nice formatting
# Run: ./start.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

function print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function print_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

clear
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}♫  Goveefy Backend Launcher${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if secrets.json exists
if [ ! -f "$SCRIPT_DIR/secrets.json" ]; then
    print_error "secrets.json not found!"
    echo ""
    echo "Please run the installer first:"
    echo "  bash install.sh"
    echo ""
    exit 1
fi

# Check if node_modules exist
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    print_warning "node_modules not found, running npm install..."
    cd "$SCRIPT_DIR"
    npm install
    echo ""
fi

# Read and display configuration
echo -e "${GREEN}📋 Configuration:${NC}"
echo ""

# Count devices in secrets.json
if command -v jq &> /dev/null; then
    DEVICE_COUNT=$(jq '.DEVICES | length' "$SCRIPT_DIR/secrets.json" 2>/dev/null || echo "0")
    API_KEY_SET=$(jq -r '.GOVEE_API_KEY' "$SCRIPT_DIR/secrets.json" 2>/dev/null)
    
    if [ "$API_KEY_SET" = "null" ] || [ -z "$API_KEY_SET" ]; then
        print_warning "API key not set in secrets.json"
    else
        echo -e "   ${GREEN}✓${NC} API key configured"
    fi
    
    if [ "$DEVICE_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✓${NC} $DEVICE_COUNT device(s) configured"
        echo ""
        echo -e "${CYAN}   Devices:${NC}"
        jq -r '.DEVICES[] | "      • \(.name) (\(.sku))"' "$SCRIPT_DIR/secrets.json" 2>/dev/null || true
    else
        print_warning "No devices configured in secrets.json"
    fi
else
    echo -e "   ${YELLOW}ℹ️${NC} Install 'jq' for detailed config info"
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Starting Goveefy backend...${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Dashboard:${NC}  http://localhost:3000"
echo -e "${CYAN}WebSocket:${NC}  ws://localhost:8080"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

cd "$SCRIPT_DIR"
node govee-backend.js
