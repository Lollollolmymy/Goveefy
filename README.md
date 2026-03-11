# Goveefy

> Sync your Govee lights to your Spotify album art — automatically.

Goveefy is a [Spicetify](https://spicetify.app) extension that reads the dominant color from whatever album art is currently playing and sends it to your Govee lights in real-time. Every track change brings a new color to your room.

---

## Features

- 🎨 Extracts the most vibrant color from album art using K-means clustering
- 💡 Supports multiple Govee lights — toggle each one on or off individually
- 🎛️ Segment mode toggle — works with both regular lights and segment-capable devices
- ⚙️ Fully configurable from inside Spotify's own Settings page — no config files to edit
- 💾 Settings persist across Spotify restarts
- ⚡ Throttle and threshold controls to tune how often lights update

---

## Supported Devices

Any Govee device supported by the Govee Open API. Tested on:

- **H601F** (Govee Downlight) — with segments enabled

Other Govee devices should work too — just enter the correct SKU and toggle segments off if your device doesn't support them.

---

## Requirements

- [Spicetify](https://spicetify.app) installed and set up
- A [Govee Developer API key](https://developer.govee.com) (free to get)
- Your Govee device's MAC address (found in the Govee app under device info)

---

## Installation

### Via Spicetify Marketplace
Search for **Goveefy** in the Spicetify Marketplace and click Install.

### Manual
1. Download `goveefy.js`
2. Copy it to your Spicetify extensions folder:
   ```
   %appdata%\spicetify\Extensions\        (Windows)
   ~/.config/spicetify/Extensions/        (macOS / Linux)
   ```
3. Run:
   ```
   spicetify config extensions goveefy.js
   spicetify apply
   ```

---

## Setup

1. Open Spotify
2. Click your **profile avatar** → **Settings**
3. Scroll to the very bottom — you'll see the **Goveefy** section
4. Paste in your **Govee API key**
5. Set how many **segments** your light uses
6. Toggle **Enable light segments** on if your device supports segments
7. Add your lights — each one needs a **name**, **MAC address**, and **SKU**
8. Toggle individual lights on or off with the **Status** switch
9. Hit **Save**

That's it. Play a song and your lights will follow.

---

## Getting Your API Key

1. Go to the [Govee Developer portal](https://developer.govee.com)
2. Sign in with your Govee account
3. Request an API key — it's free and instant
4. Paste it into Goveefy's settings

## Finding Your Device MAC Address

1. Open the **Govee Home** app
2. Tap your device → tap the settings icon (top right)
3. Look for **Device Info** — the MAC address is listed there

---

## Settings Reference

| Setting | Description |
|---|---|
| Govee API Key | Your personal key from the Govee Developer portal |
| Light segments | How many segments each light has |
| Enable light segments | Turn on for segment-capable devices like LED strips |
| Lights | Add, remove, rename, and toggle your lights individually |
| Update throttle | Minimum ms between API calls on track change |
| Color change threshold | How different a new color must be (0–255) to trigger an update |

---

## License

MIT — credit must be given to the original author.

