# Enhanced Installer Features 🎨

## What's New

All three installer files have been completely rewritten with **interactive device configuration** that lets you add multiple Govee lights during installation!

## Features Overview

### ✨ Interactive Device Setup
- Add **unlimited** Govee devices during installation
- Enter device ID, SKU, and custom name for each light
- Validates input to prevent errors
- Generates properly formatted `secrets.json` automatically

### 🎨 Beautiful Interface
- Color-coded output for better readability
- Clear step-by-step prompts
- Progress indicators
- Professional formatting

### 🔍 Smart Validation
- Checks for Node.js installation
- Verifies existing configuration files
- Asks before overwriting existing configs
- Validates device information

### 🚀 Auto-Start Options
- **Linux**: systemd user service
- **macOS**: launchd service
- **Windows**: Startup folder or Task Scheduler

## Installation Files

### 1. `install.sh` (Linux & macOS)
```bash
bash install.sh
```

**Features:**
- Auto-detects OS (Linux or macOS)
- Interactive device addition with jq support (fallback if not available)
- Creates launchd plist (macOS) or systemd service (Linux)
- Sets executable permissions automatically
- Color-coded terminal output

**What it does:**
1. Checks Node.js installation
2. Runs `npm install`
3. Prompts for Govee API key
4. Interactive device addition loop
5. Creates `secrets.json` with all devices
6. Initializes `album-settings.json`
7. Offers auto-start configuration

### 2. `install.ps1` (Windows PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

**Features:**
- PowerShell-native implementation
- Interactive device addition
- Task Scheduler or Startup folder integration
- JSON generation using native PowerShell
- Color-coded console output
- Waits for keypress at end

**What it does:**
1. Checks Node.js installation
2. Runs `npm install`
3. Prompts for Govee API key
4. Interactive device addition loop
5. Creates `secrets.json` with all devices
6. Initializes `album-settings.json`
7. Offers Startup folder or Task Scheduler auto-start

### 3. Enhanced Startup Scripts

#### `start.sh` (Linux & macOS)
- Validates `secrets.json` exists
- Displays device configuration (with jq)
- Shows device count and names
- Auto-installs dependencies if missing
- Formatted banner with connection info

#### `start.bat` (Windows)
- Validates `secrets.json` exists
- Uses Node.js to parse and display config
- Shows device count and names
- Auto-installs dependencies if missing
- Formatted banner with connection info

## Usage Examples

### Adding Multiple Devices

**Example session:**
```
═══════════════════════════════════════════════════════════
🔑 Govee API Configuration
═══════════════════════════════════════════════════════════

📝 Get your API key from: https://developer.govee.com/

   Enter your Govee API key: your-key-here

═══════════════════════════════════════════════════════════
💡 Adding Govee Devices
═══════════════════════════════════════════════════════════

You can add multiple Govee devices to control.

━━━ Device #1 ━━━

   Device ID: AA:BB:CC:DD:EE:FF:GG:HH

   Common SKUs: H601F, H6076, H6199, H7021, H7022
   Device SKU (default: H601F): H601F

   Device Name: Living Room

✅ Added: Living Room (H601F)

   Add another device? (y/n): y

━━━ Device #2 ━━━

   Device ID: AA:BB:CC:DD:EE:FF:GG:II

   Common SKUs: H601F, H6076, H6199, H7021, H7022
   Device SKU (default: H601F): H6076

   Device Name: Bedroom

✅ Added: Bedroom (H6076)

   Add another device? (y/n): n

✅ secrets.json created with 2 device(s)
```

### Generated Configuration

The installer creates a properly formatted `secrets.json`:

```json
{
  "GOVEE_API_KEY": "your-api-key",
  "DEVICES": [
    {
      "device": "AA:BB:CC:DD:EE:FF:GG:HH",
      "sku": "H601F",
      "name": "Living Room"
    },
    {
      "device": "AA:BB:CC:DD:EE:FF:GG:II",
      "sku": "H6076",
      "name": "Bedroom"
    }
  ]
}
```

## Common Govee Device SKUs

Here are some popular Govee models:

- **H601F** - Govee Downlight (most common for this project)
- **H6076** - Govee TV Backlight
- **H6199** - Govee Strip Lights
- **H7021** - Govee Floor Lamp
- **H7022** - Govee Table Lamp
- **H6182** - Govee RGBIC Strip
- **H7060** - Govee Cylinder Light

## Tips

### Finding Your Device IDs

**Method 1: Using the Govee API**
```bash
curl -X GET "https://openapi.api.govee.com/router/api/v1/user/devices" \
  -H "Govee-API-Key: YOUR_API_KEY"
```

**Method 2: From the Govee App**
- Open Govee Home app
- Go to device settings
- Device ID is usually shown in "Device Info"

### Reinstalling Configuration

If you need to reconfigure:
```bash
# Delete existing config
rm secrets.json

# Run installer again
bash install.sh
# or
powershell -ExecutionPolicy Bypass -File install.ps1
```

The installer will detect missing `secrets.json` and guide you through setup again.

### Adding More Devices Later

You can manually edit `secrets.json` or just run the installer again and choose to recreate the configuration.

## Startup Script Features

When you run the startup scripts, they now show:

```
════════════════════════════════════════════════════════════
♫  Goveefy Backend Launcher
════════════════════════════════════════════════════════════

📋 Configuration:

   ✓ API key configured
   ✓ 2 device(s) configured

   Devices:
      • Living Room (H601F)
      • Bedroom (H6076)

════════════════════════════════════════════════════════════
✅ Starting Goveefy backend...
════════════════════════════════════════════════════════════

Dashboard:  http://localhost:3000
WebSocket:  ws://localhost:8080

Press Ctrl+C to stop
```

## Troubleshooting

**Installer won't run (Linux/macOS)**
```bash
chmod +x install.sh
./install.sh
```

**PowerShell execution policy error (Windows)**
```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

**Can't see device configuration on startup**
- Linux/macOS: Install `jq` for better config parsing
- Windows: Should work automatically with Node.js

**Auto-start not working**
- Check if services are enabled
- View logs in system logs (systemd journal, Task Scheduler, etc.)

## Summary

✅ **Interactive** - Step-by-step device addition
✅ **Validated** - Input validation prevents errors
✅ **Flexible** - Add as many devices as you want
✅ **Beautiful** - Color-coded, formatted output
✅ **Smart** - Detects existing configs, auto-installs dependencies
✅ **Complete** - Sets up everything including auto-start

Enjoy your enhanced installation experience! 🎉
