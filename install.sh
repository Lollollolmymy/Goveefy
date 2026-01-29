#!/bin/bash
# Goveefy Installer — Auto-setup for Linux & macOS
# Installs dependencies, generates config with multiple devices, and optionally sets up backend auto-start
# Run: bash install.sh

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function print_info() {
    echo -e "${BLUE}📋${NC} $1"
}

function print_prompt() {
    echo -e "${CYAN}❯${NC} $1"
}

# Banner
clear
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎨 Goveefy Installer — Linux & macOS${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Detect OS
OS="Unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
else
    print_warning "Unknown OS: $OSTYPE (proceeding anyway)"
fi
echo "Detected OS: $OS"
echo ""

# Step 1: Check Node.js
print_info "Checking prerequisites…"
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install from https://nodejs.org/"
fi
NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION found"

# Step 2: Install dependencies
echo ""
print_info "Installing npm dependencies…"
npm install
print_success "Dependencies installed"

# Step 3: Generate secrets.json with interactive device configuration
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🔑 Govee API Configuration${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

SECRETS_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/secrets.json"

if [ -f "$SECRETS_PATH" ]; then
    print_warning "secrets.json already exists!"
    read -p "   Do you want to recreate it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Keeping existing secrets.json"
    else
        rm "$SECRETS_PATH"
        print_info "Removed old secrets.json"
    fi
fi

if [ ! -f "$SECRETS_PATH" ]; then
    echo -e "${YELLOW}📝 Get your API key from: https://developer.govee.com/${NC}"
    echo ""
    read -p "   Enter your Govee API key: " API_KEY
    
    if [ -z "$API_KEY" ]; then
        print_warning "API key is empty. You can add it to secrets.json later."
        API_KEY=""
    fi
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}💡 Adding Govee Devices${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "You can add multiple Govee devices to control."
    echo ""
    
    # Array to store devices
    DEVICES_JSON="[]"
    DEVICE_COUNT=0
    
    while true; do
        DEVICE_COUNT=$((DEVICE_COUNT + 1))
        
        echo -e "${GREEN}━━━ Device #$DEVICE_COUNT ━━━${NC}"
        echo ""
        
        # Get device ID
        read -p "   Device ID (e.g., AA:BB:CC:DD:EE:FF:GG:HH): " DEVICE_ID
        if [ -z "$DEVICE_ID" ]; then
            print_warning "Device ID cannot be empty"
            DEVICE_COUNT=$((DEVICE_COUNT - 1))
            continue
        fi
        
        # Get device SKU
        echo ""
        echo "   Common SKUs: H601F, H6076, H6199, H7021, H7022"
        read -p "   Device SKU (default: H601F): " DEVICE_SKU
        DEVICE_SKU=${DEVICE_SKU:-H601F}
        
        # Get device name
        echo ""
        read -p "   Device Name (e.g., Living Room): " DEVICE_NAME
        DEVICE_NAME=${DEVICE_NAME:-"Govee Device $DEVICE_COUNT"}
        
        # Add device to JSON array using jq if available, otherwise manual JSON construction
        if command -v jq &> /dev/null; then
            DEVICES_JSON=$(echo "$DEVICES_JSON" | jq --arg device "$DEVICE_ID" --arg sku "$DEVICE_SKU" --arg name "$DEVICE_NAME" '. += [{device: $device, sku: $sku, name: $name}]')
        else
            # Manual JSON construction (fallback)
            if [ "$DEVICE_COUNT" -eq 1 ]; then
                DEVICES_JSON="[{\"device\":\"$DEVICE_ID\",\"sku\":\"$DEVICE_SKU\",\"name\":\"$DEVICE_NAME\"}"
            else
                DEVICES_JSON="${DEVICES_JSON},{\"device\":\"$DEVICE_ID\",\"sku\":\"$DEVICE_SKU\",\"name\":\"$DEVICE_NAME\"}"
            fi
        fi
        
        print_success "Added: $DEVICE_NAME ($DEVICE_SKU)"
        echo ""
        
        # Ask if user wants to add more devices
        read -p "   Add another device? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            break
        fi
        echo ""
    done
    
    # Close JSON array if not using jq
    if ! command -v jq &> /dev/null; then
        DEVICES_JSON="${DEVICES_JSON}]"
    fi
    
    # Create secrets.json
    cat > "$SECRETS_PATH" << EOF
{
  "GOVEE_API_KEY": "$API_KEY",
  "DEVICES": $DEVICES_JSON
}
EOF
    
    print_success "secrets.json created with $DEVICE_COUNT device(s)"
    echo ""
    echo -e "${GREEN}📄 Configuration saved to: $SECRETS_PATH${NC}"
fi

# Step 4: Generate album-settings.json
echo ""
print_info "Initializing album settings…"
ALBUM_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/album-settings.json"
if [ -f "$ALBUM_PATH" ]; then
    print_warning "album-settings.json already exists, skipping"
else
    echo "{}" > "$ALBUM_PATH"
    print_success "album-settings.json created"
fi

# Step 5: Make scripts executable
echo ""
print_info "Setting up executable permissions…"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$SCRIPT_DIR/start.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/install.sh" 2>/dev/null || true
print_success "Scripts made executable"

# Step 6: Auto-start setup
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Auto-start Configuration${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$OS" = "macOS" ]; then
    echo "   macOS detected. You can:"
    echo "   1. Manually add to Login Items (System Settings → General → Login Items)"
    echo "   2. Use launchd (advanced users)"
    echo ""
    read -p "   Enable launchd auto-start? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        LAUNCHD_DIR="$HOME/Library/LaunchAgents"
        mkdir -p "$LAUNCHD_DIR"
        
        LAUNCHD_PLIST="$LAUNCHD_DIR/com.goveefy.backend.plist"
        NODE_PATH=$(which node)
        BACKEND_PATH="$SCRIPT_DIR/govee-backend.js"
        
        cat > "$LAUNCHD_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.goveefy.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$BACKEND_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/.goveefy/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.goveefy/logs/stderr.log</string>
</dict>
</plist>
EOF
        mkdir -p "$HOME/.goveefy/logs"
        print_success "Registered launchd service at $LAUNCHD_PLIST"
        echo ""
        echo "   To enable:"
        echo "   launchctl load $LAUNCHD_PLIST"
        echo ""
        echo "   To disable:"
        echo "   launchctl unload $LAUNCHD_PLIST"
    fi

elif [ "$OS" = "Linux" ]; then
    echo "   Linux detected. You can:"
    echo "   1. Manually run 'npm start' or './start.sh' after login"
    echo "   2. Use systemd user service (recommended)"
    echo "   3. Add to ~/.bashrc or ~/.profile (simple)"
    echo ""
    read -p "   Enable systemd user service? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SYSTEMD_DIR="$HOME/.config/systemd/user"
        mkdir -p "$SYSTEMD_DIR"
        
        SYSTEMD_SERVICE="$SYSTEMD_DIR/goveefy.service"
        NODE_PATH=$(which node)
        BACKEND_PATH="$SCRIPT_DIR/govee-backend.js"
        
        cat > "$SYSTEMD_SERVICE" << EOF
[Unit]
Description=Goveefy Spotify to Govee Backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$NODE_PATH $BACKEND_PATH
Restart=on-failure
RestartSec=10

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
        
        print_success "Created systemd user service at $SYSTEMD_SERVICE"
        echo ""
        echo "   To enable auto-start:"
        echo "   systemctl --user enable goveefy.service"
        echo "   systemctl --user start goveefy.service"
        echo ""
        echo "   To view logs:"
        echo "   journalctl --user -u goveefy.service -f"
    fi
fi

# Step 7: Summary
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. ${GREEN}Verify your configuration:${NC}"
echo "     cat secrets.json"
echo ""
echo "  2. ${GREEN}Install Spicetify extension:${NC}"
if [ "$OS" = "macOS" ]; then
    echo "     cp govee-sync.js ~/.config/spicetify/Extensions/"
elif [ "$OS" = "Linux" ]; then
    echo "     cp govee-sync.js ~/.config/spicetify/Extensions/"
fi
echo "     spicetify config extensions govee-sync.js"
echo "     spicetify apply"
echo ""
echo "  3. ${GREEN}Start the backend:${NC}"
echo "     ./start.sh"
echo "     or: npm start"
echo ""
echo -e "${CYAN}Dashboard:${NC}  http://localhost:3000"
echo -e "${CYAN}WebSocket:${NC}  ws://localhost:8080"
echo ""
echo -e "${GREEN}Enjoy your synchronized lighting! 🎵 → 🎨 → 💡${NC}"
echo ""
