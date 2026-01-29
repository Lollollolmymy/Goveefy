// govee-backend.js — Album art → ColorThief → H601F-Optimized Color → Govee + Web Dashboard
// Run with: node govee-backend.js

const WebSocket = require("ws");
const https = require("https");
const fetch = require("node-fetch");
const ColorThief = require("colorthief");
const express = require("express");
const path = require("path");
const fs = require("fs");

// CONFIG
const WS_PORT = 8080;          // WebSocket for Spotify extension
const HTTP_PORT = 3000;        // HTTP for dashboard

// Secrets and device list are loaded from an external file `secrets.json` (ignored)
// or from the environment variable `GOVEE_API_KEY`.
let GOVEE_API_KEY = process.env.GOVEE_API_KEY || null;
let DEVICES = [];

try {
  const secretsPath = path.join(__dirname, "secrets.json");
  if (fs.existsSync(secretsPath)) {
    const sec = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    GOVEE_API_KEY = sec.GOVEE_API_KEY || GOVEE_API_KEY;
    DEVICES = sec.DEVICES || DEVICES;
  }
} catch (e) {
  console.warn("Failed to load secrets.json:", e);
}

if (!GOVEE_API_KEY) {
  console.warn("GOVEE_API_KEY not set. Add a secrets.json or set the GOVEE_API_KEY env var before running.");
}

let lastColor = { r: 0, g: 0, b: 0 };
let lastUpdateTime = 0;
const UPDATE_THROTTLE = 500; // ms
const COLOR_THRESHOLD = 20;

// Runtime state
let currentTrack = null;
let currentAlbumArtUrl = null;

// Global settings
let GLOBAL_SETTINGS = {
  saturationBoostEnabled: true,
  transitionsEnabled: false,
  genreModeEnabled: false
};

// Album-specific settings file
const ALBUM_SETTINGS_FILE = path.join(__dirname, "album-settings.json");
let albumSettings = {};

// Load album settings
function loadAlbumSettings() {
  try {
    if (fs.existsSync(ALBUM_SETTINGS_FILE)) {
      albumSettings = JSON.parse(fs.readFileSync(ALBUM_SETTINGS_FILE, "utf8"));
    } else {
      albumSettings = {};
    }
  } catch {
    albumSettings = {};
  }
}

// Save album settings
function saveAlbumSettings() {
  fs.writeFileSync(ALBUM_SETTINGS_FILE, JSON.stringify(albumSettings, null, 2));
}

// Logging
const logBuffer = [];
const MAX_LOG_LINES = 200;
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(line);
  logBuffer.push(line);
  if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
}

// ----------------------
// COLOR HELPERS
// ----------------------

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// Base H601F boost
function boostColorForH601FBase({ r, g, b }) {
  let { h, s, l } = rgbToHsl(r, g, b);

  s = Math.min(1, s * 1.9 + 0.20);
  l = Math.min(1, Math.max(0, l * 0.92));

  if (h < 0.05 || h > 0.95) h = (h + 0.01) % 1;
  else if (h > 0.55 && h < 0.75) h *= 0.97;
  else if (h > 0.25 && h < 0.45) h *= 1.03;

  let boosted = hslToRgb(h, s, l);

  const gamma = 0.85;
  boosted = {
    r: Math.pow(boosted.r / 255, gamma) * 255,
    g: Math.pow(boosted.g / 255, gamma) * 255,
    b: Math.pow(boosted.b / 255, gamma) * 255
  };

  return {
    r: Math.min(255, Math.round(boosted.r)),
    g: Math.min(255, Math.round(boosted.g)),
    b: Math.min(255, Math.round(boosted.b))
  };
}

// Apply album + global tweaks
function applyAlbumAndGlobalTweaks(color, albumId) {
  let boosted = boostColorForH601FBase(color);

  const albumCfg = albumSettings[albumId] || {};
  const effective = {
    saturationBoost: albumCfg.saturationBoost ?? 1.0,
    hueShift: albumCfg.hueShift ?? 0,
    brightnessFactor: albumCfg.brightnessFactor ?? 1.0
  };

  if (GLOBAL_SETTINGS.saturationBoostEnabled || effective.saturationBoost !== 1.0) {
    let { h, s, l } = rgbToHsl(boosted.r, boosted.g, boosted.b);
    s = Math.min(1, s * effective.saturationBoost);
    boosted = hslToRgb(h, s, l);
  }

  if (effective.hueShift !== 0) {
    let { h, s, l } = rgbToHsl(boosted.r, boosted.g, boosted.b);
    h = (h + effective.hueShift / 360) % 1;
    boosted = hslToRgb(h, s, l);
  }

  boosted = {
    r: Math.min(255, Math.round(boosted.r * effective.brightnessFactor)),
    g: Math.min(255, Math.round(boosted.g * effective.brightnessFactor)),
    b: Math.min(255, Math.round(boosted.b * effective.brightnessFactor))
  };

  return boosted;
}

function isColorDifferent(a, b, threshold = COLOR_THRESHOLD) {
  return (
    Math.abs(a.r - b.r) > threshold ||
    Math.abs(a.g - b.g) > threshold ||
    Math.abs(a.b - b.b) > threshold
  );
}

// ----------------------
// GOVEE API HELPERS
// ----------------------

function makeGoveeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "openapi.api.govee.com",
      port: 443,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": GOVEE_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 200) resolve(parsed);
          else reject(new Error(parsed.message || responseData));
        } catch {
          reject(new Error("Invalid JSON from Govee API"));
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function setAllDevicesColor(r, g, b) {
  log(`🎨 Setting ALL lights to RGB(${r}, ${g}, ${b})`);

  const rgbHex = (r << 16) | (g << 8) | b;

  DEVICES.forEach(dev => {
    const payload = {
      requestId: `req_${Date.now()}`,
      payload: {
        sku: dev.sku,
        device: dev.device,
        capability: {
          type: "devices.capabilities.segment_color_setting",
          instance: "segmentedColorRgb",
          value: {
            segment: [0, 1, 2, 3, 4, 5, 6],
            rgb: rgbHex
          }
        }
      }
    };

    makeGoveeRequest("POST", "/router/api/v1/device/control", payload)
      .catch(err => log("Govee API error:", err.message));
  });
}

// ----------------------
// ALBUM ART COLOR EXTRACTION
// ----------------------

async function getDominantColorFromUrl(url) {
  log(`🖼  Fetching album art: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.buffer();
    const [r, g, b] = await ColorThief.getColor(buffer);

    log(`🎯 Dominant color: RGB(${r}, ${g}, ${b})`);
    return { r, g, b };
  } catch (err) {
    log("❌ Error extracting color:", err.message);
    return { r: 120, g: 120, b: 120 };
  }
}

// ----------------------
// WEBSOCKET SERVER (Spotify extension)
// ----------------------

const wss = new WebSocket.Server({ port: WS_PORT });

log("══════════════════════════════════════════════════════════════");
log("🎵 GOVEE SPOTIFY SYNC SERVER — H601F Optimized + Dashboard");
log("══════════════════════════════════════════════════════════════");
log(`WebSocket: ws://localhost:${WS_PORT}`);
log(`HTTP:     http://localhost:${HTTP_PORT}`);
log(`Devices:  ${DEVICES.length}`);
log("");

function broadcastState() {
  const state = {
    type: "state_update",
    track: currentTrack,
    albumArtUrl: currentAlbumArtUrl,
    lastColor,
    globalSettings: GLOBAL_SETTINGS
  };
  const json = JSON.stringify(state);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(json);
  });
}

wss.on("connection", (ws) => {
  log("✅ Spotify connected");

  ws.send(JSON.stringify({ type: "hello", message: "Connected to Govee backend" }));

  ws.on("message", async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      log("❌ Invalid JSON from client");
      return;
    }

    if (data.type !== "color_update") return;

    const { albumArtUrl, track } = data;

    log("📨 Received color_update:", track?.name, "|", albumArtUrl);

    if (!albumArtUrl) return;

    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
      log("⏭️ Skipped (throttled)");
      return;
    }

    currentTrack = track || null;
    currentAlbumArtUrl = albumArtUrl || null;

    let baseColor = await getDominantColorFromUrl(albumArtUrl);

    let albumId = null;
    const match = albumArtUrl.match(/image\/(.+)$/);
    if (match) albumId = match[1];

    let color = applyAlbumAndGlobalTweaks(baseColor, albumId);

    if (!isColorDifferent(color, lastColor)) {
      log("⏭️ Skipped (color too similar)");
      return;
    }

    await setAllDevicesColor(color.r, color.g, color.b);
    lastColor = color;
    lastUpdateTime = now;

    ws.send(JSON.stringify({
      type: "success",
      color,
      baseColor,
      track,
      albumId
    }));

    broadcastState();
  });

  ws.on("close", () => log("❌ Spotify disconnected"));
});

// ----------------------
// HTTP SERVER (Dashboard)
// ----------------------

loadAlbumSettings();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Get current runtime state
app.get("/api/state", (req, res) => {
  res.json({
    track: currentTrack,
    albumArtUrl: currentAlbumArtUrl,
    lastColor,
    globalSettings: GLOBAL_SETTINGS
  });
});

// Get album-specific settings
app.get("/api/album-settings/:albumId", (req, res) => {
  const albumId = req.params.albumId;
  res.json(albumSettings[albumId] || {
    saturationBoost: 1.0,
    hueShift: 0,
    brightnessFactor: 1.0
  });
});

// Update album-specific settings
app.post("/api/album-settings/:albumId", (req, res) => {
  const albumId = req.params.albumId;
  const { saturationBoost, hueShift, brightnessFactor } = req.body || {};

  albumSettings[albumId] = {
    saturationBoost: typeof saturationBoost === "number" ? saturationBoost : 1.0,
    hueShift: typeof hueShift === "number" ? hueShift : 0,
    brightnessFactor: typeof brightnessFactor === "number" ? brightnessFactor : 1.0
  };

  saveAlbumSettings();
  log("Updated album settings for", albumId, ":", JSON.stringify(albumSettings[albumId]));
  res.json({ ok: true });
});

// Update global settings
app.post("/api/settings", (req, res) => {
  const { saturationBoostEnabled, transitionsEnabled, genreModeEnabled } = req.body || {};

  if (typeof saturationBoostEnabled === "boolean") GLOBAL_SETTINGS.saturationBoostEnabled = saturationBoostEnabled;
  if (typeof transitionsEnabled === "boolean") GLOBAL_SETTINGS.transitionsEnabled = transitionsEnabled;
  if (typeof genreModeEnabled === "boolean") GLOBAL_SETTINGS.genreModeEnabled = genreModeEnabled;

  log("Updated global settings:", JSON.stringify(GLOBAL_SETTINGS));
  res.json({ ok: true, globalSettings: GLOBAL_SETTINGS });
});

// Get recent logs
app.get("/api/logs", (req, res) => {
  res.json({ lines: logBuffer });
});

// Restart backend
app.post("/api/restart", (req, res) => {
  log("Restart requested via dashboard");
  res.json({ ok: true });
  setTimeout(() => process.exit(0), 500);
});

// ✅ FIXED: No wildcard route — only serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(HTTP_PORT, () => {
  log(`HTTP dashboard listening at http://localhost:${HTTP_PORT}`);
});