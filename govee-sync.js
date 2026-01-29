// govee-sync.js — send album art URL to backend

(async function () {
  if (!window.Spicetify || !Spicetify.Player) {
    setTimeout(arguments.callee, 100);
    return;
  }

  console.log("════════════════════════════════════════════════════");
  console.log("🎨 Govee Sync — Album Art URL Mode");
  console.log("════════════════════════════════════════════════════");

  const WS_URL = "ws://localhost:8080";
  let ws = null;
  let isConnected = false;
  let currentTrackUri = null;

  function connectWebSocket() {
    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        isConnected = true;
        Spicetify.showNotification("Govee connected (album art mode)", false, 2000);
      };

      ws.onclose = () => {
        console.log("❌ WebSocket disconnected, reconnecting…");
        isConnected = false;
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.error("❌ WebSocket error:", err);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "success") {
            console.log("✅ Backend updated lights:", data.color);
          } else if (data.type === "error") {
            console.error("❌ Backend error:", data.message);
          } else {
            console.log("ℹ️ Backend message:", data);
          }
        } catch (e) {
          console.error("❌ Failed to parse backend message:", event.data);
        }
      };
    } catch (e) {
      console.error("❌ Failed to create WebSocket:", e);
    }
  }

  function getAlbumArtUrlFromMetadata(item) {
    if (!item) return null;

    let url = null;

    // 1. Try metadata
    if (item.metadata?.image_url) {
        url = item.metadata.image_url;
    }

    // 2. Try album.images
    if (!url && item.album?.images?.[0]?.url) {
        url = item.album.images[0].url;
    }

    // 3. Try DOM
    if (!url) {
        try {
            const img = document.querySelector("img.cover-art-image");
            if (img?.src) url = img.src;
        } catch {}
    }

    // ✅ FIX: Convert spotify:image:xxxx → https://i.scdn.co/image/xxxx
    if (url && url.startsWith("spotify:image:")) {
        const hash = url.replace("spotify:image:", "");
        return `https://i.scdn.co/image/${hash}`;
    }

    return url;
}


  function buildTrackPayload(item) {
    if (!item) return null;

    return {
      name: item.name || "Unknown",
      artist: item.artists?.[0]?.name || "Unknown",
      uri: item.uri || null
    };
  }

  function sendAlbumArtUpdate(playerData) {
    if (!isConnected) {
      console.log("⏭️ Not connected to backend, skipping send");
      return;
    }

    const item = playerData?.item;
    if (!item) {
      console.log("❌ No current track item");
      return;
    }

    const track = buildTrackPayload(item);
    const albumArtUrl = getAlbumArtUrlFromMetadata(item);

    console.log("🎵 Track:", track);
    console.log("🖼  Album art URL:", albumArtUrl);

    if (!albumArtUrl) {
      console.log("❌ No album art URL available, skipping");
      return;
    }

    const msg = {
      type: "color_update",
      albumArtUrl,
      track
    };

    console.log("📤 Sending album art update:", msg);
    ws.send(JSON.stringify(msg));
  }

  function startPolling() {
    console.log("🔄 Starting track change polling (1s)…");

    setInterval(() => {
      const data = Spicetify.Player.data;
      const uri = data?.item?.uri || null;

      if (!uri) return;

      if (uri !== currentTrackUri) {
        console.log("🔍 Detected new track URI:", uri);
        currentTrackUri = uri;
        sendAlbumArtUpdate(data);
      }
    }, 1000);
  }

  console.log("📝 Initializing Govee album art sync…");
  connectWebSocket();
  startPolling();

  // Initial sync after short delay
  setTimeout(() => {
    const data = Spicetify.Player.data;
    if (data?.item?.uri) {
      currentTrackUri = data.item.uri;
      console.log("📀 Initial track:", data.item.name, data.item.uri);
      sendAlbumArtUpdate(data);
    }
  }, 2000);
})();
