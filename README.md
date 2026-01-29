# Goveefy — Spotify → Govee Color Sync

**Goveefy** is an intelligent smart lighting controller that syncs your Spotify music to Govee H601F downlights. It extracts the dominant color from your album artwork in real-time, applies intelligent color processing optimized for Govee hardware, and automatically updates your lights to match—all seamlessly integrated with your music experience.

**Created by**: Anthony Hernandez

## Overview

Goveefy bridges the gap between your music and your environment by analyzing album artwork colors and translating them into vivid light displays. Whether you're discovering new music or revisiting your favorites, your lights will dynamically reflect the visual identity of what you're playing—creating an immersive, color-coordinated atmosphere that enhances your listening experience.

### How It Works

1. **Album Art Detection** — The Spicetify extension captures the album artwork of the currently playing track
2. **Color Extraction** — ColorThief analyzes the image and extracts the dominant color palette
3. **Intelligent Processing** — The backend applies H601F-optimized color boosts, saturation adjustments, and gamma correction
4. **Per-Album Customization** — Save custom color tweaks for individual albums via the web dashboard
5. **Real-Time Sync** — RGB values are sent to Govee devices via WebSocket with throttling to prevent excessive API calls

## Features

- 🎨 **Dominant Color Extraction** — Uses ColorThief for intelligent album artwork analysis
- 🔧 **H601F-Optimized Processing** — Custom color algorithms designed specifically for Govee downlights
- 📊 **Per-Album Tweaks** — Save saturation boost, hue shift, and brightness settings for any album
- 🌐 **Web Dashboard** — Intuitive interface for viewing now-playing, adjusting colors, and browsing logs
- 🚀 **Cross-Platform Auto-Start** — Automated setup for Windows, macOS, and Linux
- 📱 **Spicetify Integration** — Lightweight extension that works seamlessly with Spotify
- 🔄 **Real-Time Sync** — Low-latency WebSocket communication between Spotify and backend
- 📝 **Activity Logs** — Built-in logging for debugging and monitoring
- ⚙️ **Environment Flexible** — Loads secrets from `secrets.json` or environment variables
- 🎭 **Global Settings** — Toggle features like saturation boost and transitions globally

## System Architecture

### Components

```
Spotify
  ↓ (Album Art URL)
  ├─ Spicetify Extension (govee-sync.js)
  │   └─ Sends album metadata via WebSocket
  │
  ├─ Backend Server (govee-backend.js)
  │   ├─ Receives album URLs
  │   ├─ Extracts dominant colors (ColorThief)
  │   ├─ Applies H601F optimizations
  │   ├─ Stores per-album settings (album-settings.json)
  │   ├─ Manages Govee API communication
  │   └─ Hosts web dashboard (Express.js)
  │
  ├─ Web Dashboard (http://localhost:3000)
  │   ├─ Display now-playing track
  │   ├─ Adjust album-specific color tweaks
  │   ├─ Configure global settings
  │   └─ View real-time logs
  │
  └─ Govee Cloud API → Govee Devices
      └─ H601F Downlights receive RGB commands
```

### Technology Stack

- **Backend**: Node.js + Express.js
- **Color Analysis**: ColorThief (dominant color extraction)
- **Communication**: WebSocket (Spotify ↔ Backend) + HTTPS (Backend ↔ Govee API)
- **Frontend**: Vanilla JavaScript + CSS
- **Spicetify**: Custom extension for album art interception
- **Configuration**: JSON files (secrets.json, album-settings.json)
- **Platform Integration**: PowerShell (Windows), Bash (Linux/macOS), systemd (Linux), launchd (macOS)

## Prerequisites

Before installing Goveefy, ensure you have:

- **Node.js 14+** — [Download from nodejs.org](https://nodejs.org/)
- **npm** — Comes with Node.js
- **Spotify Account** — [Free or Premium](https://www.spotify.com)
- **Spicetify CLI** — [Installation guide](https://spicetify.app)
- **Govee Account + H601F Device(s)** — [Download Govee app](https://www.govee.com/app)
- **Govee API Key** — [Get from developer.govee.com](https://developer.govee.com)

### Required Device

This project is optimized for **Govee H601F Downlights**. While it may work with other Govee devices, color processing is specifically tuned for the H601F's color range and response characteristics.

## Installation

### Windows

Run the automated installer:

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

The installer will:
- Check for Node.js installation
- Install npm dependencies
- Prompt for your Govee API key and generate `secrets.json`
- Initialize `album-settings.json` for per-album color customization
- Register the backend as a Windows startup app (optional)

**After installation:**
1. Edit `secrets.json` and add your actual Govee device IDs
2. Copy `govee-sync.js` to `%appdata%\spicetify\Extensions`
3. Reload Spicetify in Spotify
4. Restart your computer (or manually run the backend)

### Linux / Debian / macOS

Run the automated installer:

```bash
bash install.sh
```

The installer will:
- Check for Node.js installation
- Install npm dependencies
- Prompt for your Govee API key and generate `secrets.json`
- Initialize `album-settings.json`
- Optionally configure systemd (Linux) or launchd (macOS) for auto-start

**After installation:**
1. Edit `secrets.json` and add your actual Govee device IDs
2. Copy `govee-sync.js` to `~/.config/spicetify/Extensions`
3. Reload Spicetify in Spotify
4. Enable auto-start or manually run: `./start.sh`

## Configuration

### secrets.json

This file stores your Govee API credentials and device list. **Never commit this to version control.**

```json
{
  "GOVEE_API_KEY": "your-api-key-from-developer.govee.com",
  "DEVICES": [
    {
      "device": "17:AD:DC:B4:D9:48:71:E8",
      "sku": "H601F",
      "name": "Living Room Light"
    },
    {
      "device": "03:DF:DC:B4:D9:58:76:CC",
      "sku": "H601F",
      "name": "Bedroom Light"
    }
  ]
}
```

**How to get your Govee API Key:**
1. Visit [developer.govee.com](https://developer.govee.com)
2. Sign in with your Govee account
3. Navigate to the API section
4. Generate a new API key
5. Paste it into `secrets.json`

**How to find your Device IDs:**
1. Open the Govee app
2. Go to your device settings
3. Look for "Device ID" or "MAC Address"
4. Add the device ID to the `DEVICES` array

### album-settings.json

Per-album color customization is stored automatically when you adjust settings via the dashboard. Example structure:

```json
{
  "ab67616d00001e026da75b164d6dbf8b37597234": {
    "saturationBoost": 1.5,
    "hueShift": 15,
    "brightnessFactor": 1.2
  }
}
```

**Settings explained:**
- **saturationBoost** (0.5–3.0) — Increases or decreases color saturation
- **hueShift** (–180 to +180) — Rotates the hue in degrees
- **brightnessFactor** (0.3–1.5) — Scales overall brightness

## Running the Backend

### Automatic (Auto-Start)

The installer registers the backend for automatic startup:

**Windows:** Backend launches on login via Registry
**macOS:** Enable with `launchctl load ~/Library/LaunchAgents/com.goveefy.backend.plist`
**Linux:** Enable with `systemctl --user enable goveefy.service`

### Manual

**Windows:**
```
start.bat
```

**Linux / macOS:**
```bash
./start.sh
```

**Or use npm:**
```bash
npm start
```

## Web Dashboard

Once the backend is running, open the dashboard at **http://localhost:3000**

### Dashboard Features

**Now Playing Section**
- Current track name and artist
- Album artwork display
- Current RGB color being sent to lights
- Album ID (for reference)

**Album Settings Section**
- **Saturation Boost** — Enhance or mute color intensity per album
- **Hue Shift** — Rotate color by degrees (useful for albums with colors you don't like)
- **Brightness Factor** — Make colors brighter or dimmer per album
- Save button to persist changes

**Global Settings Section**
- Toggle global saturation boost
- Toggle transitions (placeholder)
- Toggle genre mode (placeholder)

**Logs Section**
- Real-time activity log showing color updates, API calls, and errors
- Refresh and Restart buttons for debugging

## Spicetify Extension Setup

The `govee-sync.js` extension integrates with Spotify via the Spicetify CLI.

### Installation Steps

1. Ensure Spicetify is installed and working
2. Locate your Spicetify extensions folder:
   - **Windows**: `%appdata%\spicetify\Extensions`
   - **macOS**: `~/.config/spicetify/Extensions`
   - **Linux**: `~/.config/spicetify/Extensions`
3. Copy `govee-sync.js` to that directory
4. Reload Spicetify in Spotify (or restart Spotify)

### Verification

If the extension loads correctly, you should see:
- A console message in Spotify's DevTools: "✅ Govee Sync — Album Art URL Mode"
- A notification in Spotify: "Govee connected (album art mode)"
- Real-time color updates in the dashboard when you change tracks

## Auto-Start Configuration

### Windows

The installer automatically adds a Registry entry:

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
Name: Goveefy Backend
Value: node C:\path\to\govee-backend.js
```

Backend starts automatically on next login.

**To disable:** Open Registry Editor and remove the "Goveefy Backend" entry, or run the installer with `-NoStartup` flag.

### macOS

The installer optionally creates a launchd plist:

**Enable auto-start:**
```bash
launchctl load ~/Library/LaunchAgents/com.goveefy.backend.plist
```

**Disable auto-start:**
```bash
launchctl unload ~/Library/LaunchAgents/com.goveefy.backend.plist
```

**View logs:**
```bash
log stream --predicate 'process == "node"'
```

### Linux

The installer optionally creates a systemd user service:

**Enable auto-start:**
```bash
systemctl --user enable goveefy.service
systemctl --user start goveefy.service
```

**Disable auto-start:**
```bash
systemctl --user disable goveefy.service
systemctl --user stop goveefy.service
```

**View logs:**
```bash
journalctl --user -u goveefy.service -f
```

**Check service status:**
```bash
systemctl --user status goveefy.service
```

## Color Processing Pipeline

Goveefy applies a sophisticated multi-stage color processing pipeline optimized for H601F downlights:

### Stage 1: RGB Extraction
The dominant color is extracted from the album artwork using ColorThief, producing an RGB value.

### Stage 2: H601F Base Boost
Colors are converted to HSL, then:
- **Saturation** increased by 1.9x (+20%)
- **Lightness** reduced slightly (×0.92) for better contrast
- **Gamma correction** applied (0.85) to match human perception

### Stage 3: Album-Specific Tweaks
If tweaks exist for the album:
- Apply saturation boost multiplier
- Apply hue shift (rotation)
- Apply brightness factor

### Stage 4: Global Settings
If global saturation boost is enabled:
- Further boost saturation globally

### Result
The final RGB value is clamped to valid ranges and sent to Govee API.

## Troubleshooting

### Common Issues

**"Node.js not found"**
- Install Node.js from [nodejs.org](https://nodejs.org)
- Verify installation: `node --version`

**"Connection refused" on dashboard**
- Ensure backend is running: `npm start`
- Check that port 3000 is not in use
- Look for errors in the logs section of the dashboard

**"Lights not updating"**
- Verify `secrets.json` has a valid Govee API key
- Check that device IDs match your actual devices
- Confirm devices are online in the Govee app
- Check backend logs for API errors

**"Spicetify extension not loading"**
- Verify `govee-sync.js` is in the Extensions folder
- Reload Spicetify or restart Spotify
- Open DevTools in Spotify (Ctrl+Shift+I) and check console for errors

**"Port 3000 or 8080 already in use"**
- Edit `govee-backend.js` and change `HTTP_PORT` or `WS_PORT`
- Or kill the process using those ports

**"Installer permission denied"**
- Windows: Run PowerShell as Administrator
- Linux/macOS: Run `chmod +x install.sh` first, then `bash install.sh`

### Debug Mode

To see detailed logs, edit `govee-backend.js` and set `log()` calls to log more information. Check the backend logs section in the dashboard for real-time debugging.

## Performance & Throttling

To prevent excessive API calls, the backend implements throttling:
- **Update Throttle**: 500ms minimum between color updates
- **Color Threshold**: Only update if color difference > 20 RGB units

Adjust these in `govee-backend.js`:
```javascript
const UPDATE_THROTTLE = 500; // ms
const COLOR_THRESHOLD = 20;  // RGB units
```

## Security

### API Keys

- **Never commit `secrets.json`** — It's in `.gitignore`
- API keys are only read from:
  - `secrets.json` (local file)
  - `GOVEE_API_KEY` environment variable
- The installer never stores credentials online

### Environment Variables

Alternatively, set your API key as an environment variable instead of using `secrets.json`:

**Windows (PowerShell):**
```powershell
$env:GOVEE_API_KEY = "your-api-key"
node govee-backend.js
```

**Linux/macOS (Bash):**
```bash
export GOVEE_API_KEY="your-api-key"
./start.sh
```

## Advanced Configuration

### Custom Color Processing

Edit the `boostColorForH601FBase()` and `applyAlbumAndGlobalTweaks()` functions in `govee-backend.js` to customize color processing for your preferences.

### Additional Devices

Add more Govee H601F devices to `secrets.json`:

```json
{
  "DEVICES": [
    { "device": "...", "sku": "H601F", "name": "..." },
    { "device": "...", "sku": "H601F", "name": "..." },
    { "device": "...", "sku": "H601F", "name": "..." }
  ]
}
```

All configured devices receive color updates simultaneously.

### Custom Ports

Change the default ports in `govee-backend.js`:

```javascript
const WS_PORT = 8080;   // WebSocket for Spicetify
const HTTP_PORT = 3000; // Dashboard
```

## FAQ

**Q: Will this work with other Govee devices?**
A: The color processing is optimized specifically for H601F downlights. Other devices may work but colors won't be calibrated optimally.

**Q: Does this require Spotify Premium?**
A: No, it works with both Free and Premium accounts.

**Q: Can I use this on multiple computers?**
A: Yes, but each instance needs its own `secrets.json` and will control the same lights. Be careful not to run multiple instances simultaneously.

**Q: What if my album artwork isn't available?**
A: The extension attempts multiple methods to fetch artwork. If none work, no update is sent. Check the logs for details.

**Q: Can I adjust colors in real-time without using the dashboard?**
A: The dashboard is currently the primary interface. Consider it a feature request for future enhancement!

**Q: Does this work offline?**
A: No, the backend requires internet connectivity to communicate with Govee's cloud API.

**Q: Can I use environment variables instead of secrets.json?**
A: Yes! Set `GOVEE_API_KEY` as an environment variable and the backend will use it.

## Contributing

Found a bug or have a feature request? Open an issue on GitHub. Contributions are welcome!

## Roadmap

Future enhancements may include:
- Genre-based color palettes
- Smooth color transitions
- Brightness auto-adjustment based on time of day
- Support for additional Govee device types
- Web UI improvements and mobile responsiveness
- Scene/preset saving

## License

Apache 2.0 — see [LICENSE](LICENSE)

This project is licensed under the Apache License 2.0, which requires:
- **Attribution** — Any use, modification, or distribution must include notice of changes and credit to the original author
- **Disclosure** — If you distribute modified versions, you must document what was changed
- **Patent Grant** — Users receive an explicit patent license from contributors

## Contact & Support

**Created by**: Anthony Hernandez

For issues, questions, or suggestions, please open an issue on the repository.

---

Enjoy syncing your music to your lights! 🎵💡
