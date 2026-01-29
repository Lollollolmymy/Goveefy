const state = {
  albumId: null,
  ws: null
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, connected) {
  const el = $("ws-status");
  el.textContent = text;
  el.classList.toggle("connected", !!connected);
}

function updateNowPlaying(data) {
  const track = data.track;
  const art = data.albumArtUrl;
  const color = data.lastColor;

  $("track-name").textContent = track?.name || "No track";
  $("track-artist").textContent = track?.artist || "";
  $("album-art").src = art || "";
  
  let albumId = null;
  if (art) {
    const match = art.match(/image\/(.+)$/);
    if (match) albumId = match[1];
  }
  state.albumId = albumId;
  $("album-id").textContent = albumId ? `Album ID: ${albumId}` : "";

  if (color) {
    const { r, g, b } = color;
    $("color-box").style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    $("color-text").textContent = `RGB(${r}, ${g}, ${b})`;
  } else {
    $("color-box").style.backgroundColor = "transparent";
    $("color-text").textContent = "";
  }

  if (albumId) {
    fetchAlbumSettings(albumId);
  }
}

async function fetchState() {
  try {
    const res = await fetch("/api/state");
    const data = await res.json();
    updateNowPlaying(data);
    updateGlobalControls(data.globalSettings);
  } catch (e) {
    console.error("Failed to fetch state", e);
  }
}

function updateGlobalControls(gs) {
  if (!gs) return;
  $("saturationBoostEnabled").checked = !!gs.saturationBoostEnabled;
  $("transitionsEnabled").checked = !!gs.transitionsEnabled;
  $("genreModeEnabled").checked = !!gs.genreModeEnabled;
}

async function fetchAlbumSettings(albumId) {
  try {
    const res = await fetch(`/api/album-settings/${albumId}`);
    const cfg = await res.json();

    $("saturationBoost").value = cfg.saturationBoost ?? 1.0;
    $("saturationBoostValue").textContent = cfg.saturationBoost?.toFixed(1) ?? "1.0";

    $("hueShift").value = cfg.hueShift ?? 0;
    $("hueShiftValue").textContent = `${cfg.hueShift ?? 0}°`;

    $("brightnessFactor").value = cfg.brightnessFactor ?? 1.0;
    $("brightnessFactorValue").textContent = (cfg.brightnessFactor ?? 1.0).toFixed(2);
  } catch (e) {
    console.error("Failed to fetch album settings", e);
  }
}

async function saveAlbumSettings() {
  if (!state.albumId) return alert("No album detected.");

  const payload = {
    saturationBoost: parseFloat($("saturationBoost").value),
    hueShift: parseFloat($("hueShift").value),
    brightnessFactor: parseFloat($("brightnessFactor").value)
  };

  try {
    await fetch(`/api/album-settings/${state.albumId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    alert("Album settings saved.");
  } catch (e) {
    console.error("Failed to save album settings", e);
  }
}

async function saveGlobalSettings() {
  const payload = {
    saturationBoostEnabled: $("saturationBoostEnabled").checked,
    transitionsEnabled: $("transitionsEnabled").checked,
    genreModeEnabled: $("genreModeEnabled").checked
  };

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    updateGlobalControls(data.globalSettings);
    alert("Global settings saved.");
  } catch (e) {
    console.error("Failed to save global settings", e);
  }
}

async function fetchLogs() {
  try {
    const res = await fetch("/api/logs");
    const data = await res.json();
    const logsEl = $("logs");
    logsEl.innerHTML = "";
    (data.lines || []).forEach(line => {
      const div = document.createElement("div");
      div.className = "log-line";
      if (line.includes("❌")) div.classList.add("error");
      div.textContent = line;
      logsEl.appendChild(div);
    });
    logsEl.scrollTop = logsEl.scrollHeight;
  } catch (e) {
    console.error("Failed to fetch logs", e);
  }
}

async function restartBackend() {
  if (!confirm("Are you sure you want to restart the backend?")) return;
  try {
    await fetch("/api/restart", { method: "POST" });
  } catch (e) {
    console.error("Failed to send restart", e);
  }
}

function setupRangeDisplays() {
  $("saturationBoost").addEventListener("input", () => {
    $("saturationBoostValue").textContent = parseFloat($("saturationBoost").value).toFixed(1);
  });

  $("hueShift").addEventListener("input", () => {
    $("hueShiftValue").textContent = `${$("hueShift").value}°`;
  });

  $("brightnessFactor").addEventListener("input", () => {
    $("brightnessFactorValue").textContent = parseFloat($("brightnessFactor").value).toFixed(2);
  });
}

// WebSocket to backend state
function connectWS() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${proto}://localhost:8080`; // same WS as Spotify, read-only here

  try {
    const ws = new WebSocket(wsUrl);
    state.ws = ws;

    ws.onopen = () => {
      setStatus("WS: Connected", true);
    };

    ws.onclose = () => {
      setStatus("WS: Disconnected", false);
      setTimeout(connectWS, 3000);
    };

    ws.onerror = () => {
      setStatus("WS: Error", false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "state_update") {
          updateNowPlaying({
            track: data.track,
            albumArtUrl: data.albumArtUrl,
            lastColor: data.lastColor,
            globalSettings: data.globalSettings
          });
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };
  } catch (e) {
    console.error("Failed to connect WS", e);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupRangeDisplays();
  fetchState();
  fetchLogs();
  connectWS();

  $("saveAlbumSettings").addEventListener("click", saveAlbumSettings);
  $("saveGlobalSettings").addEventListener("click", saveGlobalSettings);
  $("refreshLogs").addEventListener("click", fetchLogs);
  $("restartBackend").addEventListener("click", restartBackend);
});
