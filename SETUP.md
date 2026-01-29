# Goveefy Setup Guide

Complete step-by-step guide to get Goveefy running on your system.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Installation](#detailed-installation)
4. [Spicetify Extension Setup](#spicetify-extension-setup)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **Spotify Desktop Client** with Spicetify installed ([Spicetify Installation](https://spicetify.app/docs/getting-started))
- **Govee Account** with API access ([Developer Portal](https://developer.govee.com/))
- **Govee H601F** (or compatible) devices set up in the Govee app

### Check Your Setup
```bash
# Verify Node.js installation
node --version  # Should show v16.0.0 or higher

# Verify npm
npm --version

# Verify Spicetify (if installed)
spicetify --version
```

---

## Quick Start

### Windows
```powershell
# Run the automated installer
powershell -ExecutionPolicy Bypass -File install.ps1

# Follow the prompts to configure
# Then start the backend
start.bat
```

### Linux/macOS
```bash
# Run the automated installer
bash install.sh

# Follow the prompts to configure
# Then start the backend
./start.sh
```

---

## Detailed Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/goveefy.git
cd goveefy
```

### 2. Install Dependencies
```bash
npm install
```

This will install:
- `colorthief` - Color extraction from album art
- `express` - Web server for dashboard
- `ws` - WebSocket server for Spotify communication
- `node-fetch` - HTTP requests

### 3. Get Your Govee API Key

1. Go to [Govee Developer Portal](https://developer.govee.com/)
2. Sign in with your Govee account
3. Create a new API key
4. Copy the API key (you'll need this in the next step)

### 4. Get Your Device IDs

#### Option 1: Using Govee API
```bash
# Make a request to list your devices
curl -X GET "https://openapi.api.govee.com/router/api/v1/user/devices" \
  -H "Govee-API-Key: YOUR_API_KEY_HERE"
```

#### Option 2: Using the Govee App
Device IDs are visible in the Govee Home app under device settings.

### 5. Create Configuration File

Copy the example secrets file:
```bash
cp secrets.json.example secrets.json
```

Edit `secrets.json` with your actual values:
```json
{
  "GOVEE_API_KEY": "your-actual-api-key",
  "DEVICES": [
    {
      "device": "AA:BB:CC:DD:EE:FF:GG:HH",
      "sku": "H601F",
      "name": "Bedroom Downlight"
    }
  ]
}
```

**Important**: `secrets.json` is ignored by Git and will never be committed.

---

## Spicetify Extension Setup

### 1. Locate Your Spicetify Extensions Folder

**Windows**:
```
%APPDATA%\spicetify\Extensions\
```

**Linux/macOS**:
```
~/.config/spicetify/Extensions/
```

### 2. Copy the Extension
```bash
# From the goveefy directory
# Windows (PowerShell)
Copy-Item govee-sync.js "$env:APPDATA\spicetify\Extensions\"

# Linux/macOS
cp govee-sync.js ~/.config/spicetify/Extensions/
```

### 3. Enable the Extension
```bash
spicetify config extensions govee-sync.js
spicetify apply
```

### 4. Verify Installation
Open Spotify Desktop and check the console (Ctrl+Shift+I or Cmd+Option+I):
```
🎨 Govee Sync — Album Art URL Mode
✅ WebSocket connected
```

---

## Configuration

### Album-Specific Settings
The `album-settings.json` file stores per-album color tweaks:

```json
{
  "ab67616d00001e026da75b164d6dbf8b37597234": {
    "saturationBoost": 3,
    "hueShift": 0,
    "brightnessFactor": 1.5
  }
}
```

You can adjust these via the dashboard at `http://localhost:3000`

### Global Settings
- **Saturation Boost**: Enhances color vibrancy
- **Transitions**: Smooth color transitions (placeholder)
- **Genre Mode**: Genre-based color mapping (placeholder)

---

## Running Goveefy

### Start the Backend

**Windows**:
```batch
start.bat
```

**Linux/macOS**:
```bash
./start.sh
```

**Or manually**:
```bash
npm start
```

### Access the Dashboard
Open your browser and go to:
```
http://localhost:3000
```

### How It Works
1. Play a song in Spotify Desktop
2. The Spicetify extension sends album art to the backend
3. Backend extracts dominant colors and adjusts for H601F
4. Colors are sent to your Govee devices via API
5. Dashboard shows real-time status and controls

---

## Troubleshooting

### Backend Won't Start

**Error**: `secrets.json not found`
- **Solution**: Run the installer or manually create `secrets.json` from the example

**Error**: `GOVEE_API_KEY not set`
- **Solution**: Add your API key to `secrets.json`

**Error**: `Port 3000 already in use`
- **Solution**: Kill the process using port 3000 or change `HTTP_PORT` in `govee-backend.js`

### Spicetify Extension Not Working

**Extension not loading**:
```bash
# Reinstall Spicetify
spicetify restore
spicetify backup apply
spicetify config extensions govee-sync.js
spicetify apply
```

**WebSocket connection failed**:
- Ensure backend is running (`npm start`)
- Check backend logs for errors
- Verify WebSocket port 8080 is not blocked by firewall

### Colors Not Updating

**Lights don't change**:
1. Check Govee API key is valid
2. Verify device IDs are correct in `secrets.json`
3. Ensure devices are online in Govee app
4. Check backend logs for API errors

**Colors look wrong**:
- Try adjusting settings in the dashboard
- Some albums have unusual color palettes
- H601F-specific tuning may need adjustment

### Dashboard Issues

**Dashboard not loading**:
- Ensure `public/` folder exists with all files
- Check browser console for errors
- Try clearing browser cache

**WebSocket disconnected**:
- Backend may have crashed - check terminal
- Restart backend with `npm start`

---

## Advanced Configuration

### Auto-Start on Boot

**Windows**: Add to Task Scheduler or Startup folder

**macOS**: Use launchd (created by `install.sh`)
```bash
launchctl load ~/Library/LaunchAgents/com.goveefy.backend.plist
```

**Linux**: Use systemd (created by `install.sh`)
```bash
systemctl --user enable goveefy.service
systemctl --user start goveefy.service
```

### Custom Ports
Edit `govee-backend.js`:
```javascript
const WS_PORT = 8080;    // WebSocket port
const HTTP_PORT = 3000;  // Dashboard port
```

### Multiple Devices
Add more devices to `secrets.json`:
```json
{
  "GOVEE_API_KEY": "your-key",
  "DEVICES": [
    {
      "device": "DEVICE_ID_1",
      "sku": "H601F",
      "name": "Room 1"
    },
    {
      "device": "DEVICE_ID_2",
      "sku": "H601F",
      "name": "Room 2"
    }
  ]
}
```

---

## Getting Help

- **Documentation**: Read the [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/goveefy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/goveefy/discussions)

---

## Next Steps

1. ✅ Backend running
2. ✅ Spicetify extension installed
3. ✅ Dashboard accessible
4. 🎵 Play music and watch your lights sync!

Enjoy your synchronized lighting experience! 🎨💡
