// goveefy.js
// Goveefy — sync Govee lights to Spotify album art.
// Revamped: auto-save settings, Govee Platform API discovery, verified integer RGB payloads.

(function goveefy() {
    "use strict";

    const STORAGE_KEY = "goveefy:v2";
    const OLD_STORAGE_KEY = "goveefy_v1";

    const GOVEE_API = {
        DEVICES: "https://openapi.api.govee.com/router/api/v1/user/devices",
        CONTROL: "https://openapi.api.govee.com/router/api/v1/device/control",
    };

    const DEFAULT_SETTINGS = {
        goveeApiKey: "",
        enabled: true,
        autoSync: true,
        updateThrottle: 800,
        colorThreshold: 25,
        minBrightness: 35,
        boostSaturation: true,
        devices: [],
    };

    const DEFAULT_DEVICE = {
        name: "",
        device: "",
        sku: "",
        enabled: true,
        useSegments: false,
        segmentCount: 1,
        supportsSegments: false,
        capabilities: [],
    };

    let CFG = loadSettings();
    let lastUri = null;
    let lastColor = { r: -1, g: -1, b: -1 };
    let lastUpdateTime = 0;
    let saveTimer = null;
    let sectionMounted = false;

    function waitForSpicetify() {
        return new Promise(resolve => {
            const tick = () => {
                if (window.Spicetify?.Player && window.Spicetify?.LocalStorage) resolve();
                else setTimeout(tick, 250);
            };
            tick();
        });
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function normalizeDevice(device) {
        const d = { ...DEFAULT_DEVICE, ...(device || {}) };
        d.name = String(d.name || "");
        d.device = String(d.device || "").trim();
        d.sku = String(d.sku || "").trim();
        d.enabled = d.enabled !== false;
        d.useSegments = Boolean(d.useSegments);
        d.supportsSegments = Boolean(d.supportsSegments);
        d.segmentCount = Math.max(1, Math.min(64, Number(d.segmentCount || 1)));
        d.capabilities = Array.isArray(d.capabilities) ? d.capabilities : [];
        return d;
    }

    function migrateOldSettings() {
        try {
            const raw = Spicetify.LocalStorage.get(OLD_STORAGE_KEY);
            if (!raw) return null;

            const old = JSON.parse(raw);
            const segmentCount = Math.max(1, Number(old.segmentCount || 1));
            const useSegments = Boolean(old.enableSegments);

            return {
                ...DEFAULT_SETTINGS,
                goveeApiKey: old.goveeApiKey || "",
                updateThrottle: Number(old.updateThrottle || DEFAULT_SETTINGS.updateThrottle),
                colorThreshold: Number(old.colorThreshold || DEFAULT_SETTINGS.colorThreshold),
                devices: (old.devices || []).map(d => normalizeDevice({
                    name: d.name,
                    device: d.device,
                    sku: d.sku,
                    enabled: d.enabled,
                    useSegments,
                    segmentCount,
                    supportsSegments: useSegments,
                })),
            };
        } catch (e) {
            console.warn("[Goveefy] Could not migrate old settings:", e);
            return null;
        }
    }

    function loadSettings() {
        try {
            const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    devices: (parsed.devices || []).map(normalizeDevice),
                };
            }
        } catch (e) {
            console.warn("[Goveefy] Could not load settings:", e);
        }

        const migrated = migrateOldSettings();
        if (migrated) {
            Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(migrated));
            return migrated;
        }

        return clone(DEFAULT_SETTINGS);
    }

    function saveSettingsNow() {
        try {
            CFG.devices = CFG.devices.map(normalizeDevice);
            Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(CFG));
            setStatus("Saved", "ok");
        } catch (e) {
            console.error("[Goveefy] Save failed:", e);
            setStatus("Save failed — see DevTools", "error");
        }
    }

    function scheduleSave() {
        clearTimeout(saveTimer);
        setStatus("Saving…", "muted");
        saveTimer = setTimeout(saveSettingsNow, 250);
    }

    function updateSetting(key, value) {
        CFG[key] = value;
        scheduleSave();
    }

    function updateDevice(index, patch) {
        CFG.devices[index] = normalizeDevice({ ...CFG.devices[index], ...patch });
        scheduleSave();
        renderDeviceList();
    }

    function getEnabledDevices() {
        return CFG.devices.filter(d => d.enabled && d.device && d.sku);
    }

    function getSegments(device) {
        const count = Math.max(1, Math.min(64, Number(device.segmentCount || 1)));
        return Array.from({ length: count }, (_, i) => i);
    }

    function rgbToInt(r, g, b) {
        return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
    }

    function intToHex(value) {
        return `#${Number(value).toString(16).padStart(6, "0")}`;
    }

    function hasCapability(device, type, instance) {
        return (device.capabilities || []).some(c => c.type === type && c.instance === instance);
    }

    function supportsSegmentsFromCapabilities(capabilities) {
        return (capabilities || []).some(c =>
            c.type === "devices.capabilities.segment_color_setting" &&
            c.instance === "segmentedColorRgb"
        );
    }

    function segmentCountFromCapabilities(capabilities) {
        const cap = (capabilities || []).find(c =>
            c.type === "devices.capabilities.segment_color_setting" &&
            c.instance === "segmentedColorRgb"
        );

        const segmentField = cap?.parameters?.fields?.find(f => f.fieldName === "segment");
        const maxIndex = Number(segmentField?.elementRange?.max);
        if (Number.isFinite(maxIndex)) return maxIndex + 1;

        const maxSize = Number(segmentField?.size?.max);
        if (Number.isFinite(maxSize)) return maxSize;

        return 1;
    }

    async function goveeFetch(url, options = {}) {
        if (!CFG.goveeApiKey) {
            throw new Error("Missing Govee API key");
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "Govee-API-Key": CFG.goveeApiKey,
                ...(options.headers || {}),
            },
        });

        let json = null;
        try {
            json = await response.json();
        } catch (_) {}

        if (!response.ok || (json && json.code && json.code !== 200)) {
            const msg = json?.msg || json?.message || json?.capability?.state?.errorMsg ||
                `HTTP ${response.status}`;
            throw new Error(msg);
        }

        return json;
    }

    async function loadDevicesFromGovee() {
        setStatus("Loading devices from Govee…", "muted");

        try {
            const json = await goveeFetch(GOVEE_API.DEVICES);
            const existingById = new Map(CFG.devices.map(d => [d.device, d]));

            const discovered = (json.data || [])
                .filter(d => d.type === "devices.types.light")
                .filter(d => (d.capabilities || []).some(c =>
                    c.type === "devices.capabilities.color_setting" ||
                    c.type === "devices.capabilities.segment_color_setting" ||
                    c.type === "devices.capabilities.on_off"
                ))
                .map(d => {
                    const old = existingById.get(d.device) || {};
                    const supportsSegments = supportsSegmentsFromCapabilities(d.capabilities);
                    const segmentCount = segmentCountFromCapabilities(d.capabilities);

                    return normalizeDevice({
                        ...old,
                        name: old.name || d.deviceName || d.sku || d.device,
                        device: d.device,
                        sku: d.sku,
                        enabled: old.enabled !== undefined ? old.enabled : true,
                        supportsSegments,
                        useSegments: old.useSegments !== undefined ? old.useSegments : supportsSegments,
                        segmentCount: old.segmentCount || segmentCount,
                        capabilities: d.capabilities || [],
                    });
                });

            CFG.devices = discovered;
            saveSettingsNow();
            renderDeviceList();

            setStatus(`Loaded ${discovered.length} light${discovered.length === 1 ? "" : "s"}`, "ok");
            Spicetify.showNotification?.(`Goveefy loaded ${discovered.length} Govee light${discovered.length === 1 ? "" : "s"}`);
        } catch (e) {
            console.error("[Goveefy] Device discovery failed:", e);
            setStatus(`Device discovery failed: ${e.message}`, "error");
            Spicetify.showNotification?.(`Goveefy: ${e.message}`, true);
        }
    }

    async function sendCapability(device, capability, requestId = "goveefy") {
        return goveeFetch(GOVEE_API.CONTROL, {
            method: "POST",
            body: JSON.stringify({
                requestId: `${requestId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                payload: {
                    sku: device.sku,
                    device: device.device,
                    capability,
                },
            }),
        });
    }

    async function setDeviceColor(device, r, g, b) {
        const rgb = rgbToInt(r, g, b);

        const capability = device.useSegments && device.supportsSegments
            ? {
                type: "devices.capabilities.segment_color_setting",
                instance: "segmentedColorRgb",
                value: {
                    segment: getSegments(device),
                    rgb,
                },
            }
            : {
                type: "devices.capabilities.color_setting",
                instance: "colorRgb",
                value: rgb,
            };

        return sendCapability(device, capability, "color");
    }

    async function setLights(r, g, b) {
        const devices = getEnabledDevices();
        if (!devices.length) return;

        const rgb = rgbToInt(r, g, b);
        console.log(`[Goveefy] RGB(${r}, ${g}, ${b}) ${intToHex(rgb)} → ${devices.length} device(s)`);

        const results = await Promise.allSettled(devices.map(d => setDeviceColor(d, r, g, b)));
        const failures = results.filter(r => r.status === "rejected");

        if (failures.length) {
            failures.forEach(f => console.warn("[Goveefy] Light update failed:", f.reason));
            setStatus(`${failures.length}/${devices.length} updates failed`, "error");
        } else {
            setStatus(`Synced ${devices.length} light${devices.length === 1 ? "" : "s"} to ${intToHex(rgb)}`, "ok");
        }
    }

    async function turnDevice(device, on) {
        return sendCapability(device, {
            type: "devices.capabilities.on_off",
            instance: "powerSwitch",
            value: on ? 1 : 0,
        }, on ? "on" : "off");
    }

    async function setDeviceBrightness(device, brightness) {
        return sendCapability(device, {
            type: "devices.capabilities.range",
            instance: "brightness",
            value: Math.max(1, Math.min(100, Number(brightness || 50))),
        }, "brightness");
    }

    async function testLights() {
        const devices = getEnabledDevices();
        if (!devices.length) {
            setStatus("No enabled lights to test", "error");
            return;
        }

        setStatus("Testing enabled lights…", "muted");
        try {
            await Promise.all(devices.map(async d => {
                await turnDevice(d, true);
                await setDeviceBrightness(d, Math.max(1, CFG.minBrightness));
                await setDeviceColor(d, 0, 255, 0);
            }));
            setStatus(`Tested ${devices.length} light${devices.length === 1 ? "" : "s"} successfully`, "ok");
        } catch (e) {
            console.error("[Goveefy] Test failed:", e);
            setStatus(`Test failed: ${e.message}`, "error");
        }
    }

    function getAlbumArtUrl(playerData) {
        const item = playerData?.item;
        if (!item) return null;

        const url =
            item.metadata?.image_url ||
            item.metadata?.image_xlarge_url ||
            item.album?.images?.[0]?.url ||
            item.images?.[0]?.url;

        if (!url) return null;
        return url.startsWith("spotify:image:")
            ? `https://i.scdn.co/image/${url.replace("spotify:image:", "")}`
            : url;
    }

    function quantize(v, step) {
        return Math.round(v / step) * step;
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (d !== 0) {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
                case g: h = ((b - r) / d + 2); break;
                case b: h = ((r - g) / d + 4); break;
            }
            h /= 6;
        }

        return { h, s, v };
    }

    function hsvToRgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            default: r = v; g = p; b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
        };
    }

    function optimizeColor(color) {
        let { r, g, b } = color;
        let hsv = rgbToHsv(r, g, b);

        if (CFG.boostSaturation) {
            hsv.s = Math.min(1, hsv.s * 1.2 + 0.08);
        }

        const minV = Math.max(0.05, Math.min(1, Number(CFG.minBrightness || 35) / 100));
        hsv.v = Math.max(hsv.v, minV);

        return hsvToRgb(hsv.h, hsv.s, hsv.v);
    }

    function colorsDiffer(a, b, threshold) {
        return (
            Math.abs(a.r - b.r) > threshold ||
            Math.abs(a.g - b.g) > threshold ||
            Math.abs(a.b - b.b) > threshold
        );
    }

    async function extractColor(url) {
        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image();
                i.crossOrigin = "anonymous";
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = url;
            });

            const canvas = document.createElement("canvas");
            const size = 64;
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, size, size);

            const data = ctx.getImageData(0, 0, size, size).data;
            const buckets = new Map();

            for (let i = 0; i < data.length; i += 4 * 3) {
                const a = data[i + 3];
                if (a < 180) continue;

                const r = data[i], g = data[i + 1], b = data[i + 2];
                const hsv = rgbToHsv(r, g, b);

                // Ignore near-white, near-black, and very low saturation pixels.
                if (hsv.v < 0.12 || hsv.v > 0.97 || hsv.s < 0.18) continue;

                const key = `${quantize(r, 24)},${quantize(g, 24)},${quantize(b, 24)}`;
                const entry = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0, score: 0 };
                entry.r += r;
                entry.g += g;
                entry.b += b;
                entry.count += 1;
                entry.score += (hsv.s * 1.7 + hsv.v * 0.7) * 100;
                buckets.set(key, entry);
            }

            if (!buckets.size) return { r: 120, g: 120, b: 120 };

            const best = [...buckets.values()].sort((a, b) =>
                (b.score * Math.log2(b.count + 1)) - (a.score * Math.log2(a.count + 1))
            )[0];

            return {
                r: Math.round(best.r / best.count),
                g: Math.round(best.g / best.count),
                b: Math.round(best.b / best.count),
            };
        } catch (e) {
            console.warn("[Goveefy] Could not extract album color:", e);
            return { r: 120, g: 120, b: 120 };
        }
    }

    async function handleTrackChange(force = false) {
        if (!CFG.enabled || !CFG.autoSync) return;
        if (!CFG.goveeApiKey || !getEnabledDevices().length) return;

        const data = Spicetify.Player.data;
        const item = data?.item;
        if (!item?.uri) return;

        if (!force && item.uri === lastUri) return;
        lastUri = item.uri;

        if (!force && Date.now() - lastUpdateTime < Number(CFG.updateThrottle || 800)) return;

        const artUrl = getAlbumArtUrl(data);
        if (!artUrl) return;

        const color = optimizeColor(await extractColor(artUrl));
        if (!force && !colorsDiffer(color, lastColor, Number(CFG.colorThreshold || 25))) return;

        await setLights(color.r, color.g, color.b);
        lastColor = color;
        lastUpdateTime = Date.now();
    }

    const SECTION_ID = "goveefy-section";
    const HOST_ID = "goveefy-settings-host";
    const STATUS_ID = "goveefy-status";

    const CSS = `
        #${HOST_ID} {
            display: block;
            position: static;
            width: 100%;
            max-width: none;
            min-height: 0;
            margin: 32px 0 48px;
            padding: 0;
            clear: both;
        }
        #${SECTION_ID} {
            margin-top: 24px;
            padding: 24px;
            border-radius: 16px;
            background: linear-gradient(180deg, rgba(40,40,40,.92), rgba(24,24,24,.92));
            border: 1px solid var(--essential-subdued, #3e3e3e);
            box-shadow: 0 18px 50px rgba(0,0,0,.25);
            color: var(--text-base, #fff);
        }
        #${SECTION_ID} * { box-sizing: border-box; }
        #${SECTION_ID} .gf-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px; }
        #${SECTION_ID} .gf-title { font-size:28px; font-weight:800; letter-spacing:-.03em; margin:0; }
        #${SECTION_ID} .gf-subtitle { color:var(--text-subdued,#a7a7a7); font-size:14px; margin-top:6px; line-height:1.45; max-width:760px; }
        #${SECTION_ID} .gf-pill { display:inline-flex; align-items:center; gap:8px; padding:7px 11px; border-radius:999px; background:#1db95422; color:#1ed760; border:1px solid #1db95455; font-size:12px; font-weight:700; white-space:nowrap; }
        #${SECTION_ID} .gf-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:14px; }
        #${SECTION_ID} .gf-card { background:rgba(0,0,0,.18); border:1px solid var(--essential-subdued,#3e3e3e); border-radius:12px; padding:16px; }
        #${SECTION_ID} .gf-card.full { grid-column:1 / -1; }
        #${SECTION_ID} .gf-card-title { font-size:15px; font-weight:800; margin-bottom:12px; }
        #${SECTION_ID} .gf-row { display:grid; grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.2fr); gap:16px; align-items:center; padding:12px 0; border-top:1px solid rgba(255,255,255,.07); }
        #${SECTION_ID} .gf-row:first-of-type { border-top:none; }
        #${SECTION_ID} .gf-label span { display:block; font-size:13px; font-weight:700; }
        #${SECTION_ID} .gf-label small { display:block; margin-top:3px; font-size:12px; color:var(--text-subdued,#a7a7a7); line-height:1.35; }
        #${SECTION_ID} input[type=text],
        #${SECTION_ID} input[type=password],
        #${SECTION_ID} input[type=number],
        #${SECTION_ID} select {
            width:100%;
            min-height:38px;
            border-radius:8px;
            border:1px solid var(--essential-subdued,#3e3e3e);
            background:var(--background-elevated-base,#282828);
            color:var(--text-base,#fff);
            padding:8px 10px;
            outline:none;
            font-size:13px;
        }
        #${SECTION_ID} input:focus,
        #${SECTION_ID} select:focus { border-color:#1db954; box-shadow:0 0 0 3px #1db95422; }
        #${SECTION_ID} .gf-actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-top:12px; }
        #${SECTION_ID} .gf-btn {
            border:0;
            border-radius:999px;
            padding:9px 16px;
            font-weight:800;
            font-size:13px;
            cursor:pointer;
            transition: transform .1s ease, filter .15s ease, opacity .15s ease;
        }
        #${SECTION_ID} .gf-btn:hover { filter:brightness(1.1); }
        #${SECTION_ID} .gf-btn:active { transform:scale(.97); }
        #${SECTION_ID} .gf-btn.primary { background:#1db954; color:#000; }
        #${SECTION_ID} .gf-btn.secondary { background:var(--background-elevated-base,#282828); color:var(--text-base,#fff); border:1px solid var(--essential-subdued,#3e3e3e); }
        #${SECTION_ID} .gf-btn.danger { background:#e22134; color:#fff; }
        #${SECTION_ID} .gf-btn:disabled { opacity:.45; cursor:not-allowed; }
        #${SECTION_ID} .gf-toggle { display:flex; justify-content:flex-end; }
        #${SECTION_ID} .gf-switch { position:relative; width:48px; height:28px; display:inline-block; }
        #${SECTION_ID} .gf-switch input { opacity:0; width:0; height:0; position:absolute; }
        #${SECTION_ID} .gf-slider { position:absolute; inset:0; background:#535353; border-radius:999px; transition:.2s; cursor:pointer; }
        #${SECTION_ID} .gf-slider:before { content:""; position:absolute; width:20px; height:20px; left:4px; top:4px; background:#fff; border-radius:50%; transition:.2s; }
        #${SECTION_ID} .gf-switch input:checked + .gf-slider { background:#1db954; }
        #${SECTION_ID} .gf-switch input:checked + .gf-slider:before { transform:translateX(20px); }
        #${SECTION_ID} .gf-status { min-height:20px; font-size:13px; color:var(--text-subdued,#a7a7a7); margin-top:10px; }
        #${SECTION_ID} .gf-status.ok { color:#1ed760; }
        #${SECTION_ID} .gf-status.error { color:#ff6b6b; }
        #${SECTION_ID} .gf-device-list { display:flex; flex-direction:column; gap:10px; }
        #${SECTION_ID} .gf-device {
            display:grid;
            grid-template-columns: 42px minmax(150px, 1fr) minmax(190px, 1.2fr) 86px 92px 96px 52px 80px;
            gap:10px;
            align-items:center;
            padding:12px;
            border-radius:12px;
            background:rgba(255,255,255,.035);
            border:1px solid rgba(255,255,255,.08);
        }
        #${SECTION_ID} .gf-device.off { opacity:.48; }
        #${SECTION_ID} .gf-device-head {
            display:grid;
            grid-template-columns: 42px minmax(150px, 1fr) minmax(190px, 1.2fr) 86px 92px 96px 52px 80px;
            gap:10px;
            padding:0 12px 6px;
            color:var(--text-subdued,#a7a7a7);
            font-size:11px;
            font-weight:800;
            text-transform:uppercase;
            letter-spacing:.04em;
        }
        #${SECTION_ID} .gf-num { color:var(--text-subdued,#a7a7a7); font-weight:800; text-align:center; }
        #${SECTION_ID} .gf-empty { color:var(--text-subdued,#a7a7a7); font-size:13px; padding:18px; border:1px dashed var(--essential-subdued,#3e3e3e); border-radius:12px; text-align:center; }
        @media (max-width: 1100px) {
            #${SECTION_ID} .gf-grid { grid-template-columns: 1fr; }
            #${SECTION_ID} .gf-row { grid-template-columns: 1fr; gap:8px; }
            #${SECTION_ID} .gf-device,
            #${SECTION_ID} .gf-device-head { grid-template-columns: 1fr; }
            #${SECTION_ID} .gf-device-head { display:none; }
        }
    `;

    function injectStyle() {
        if (document.getElementById("goveefy-style")) return;
        const style = document.createElement("style");
        style.id = "goveefy-style";
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function makeEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function makeToggle(checked, onChange) {
        const wrap = makeEl("label", "gf-switch");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;
        const slider = makeEl("span", "gf-slider");
        input.addEventListener("change", () => onChange(input.checked));
        wrap.append(input, slider);
        return wrap;
    }

    function makeInput({ type = "text", value = "", placeholder = "", min, max, onInput }) {
        const input = document.createElement("input");
        input.type = type;
        input.value = value ?? "";
        input.placeholder = placeholder;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        input.addEventListener("input", () => {
            const value = type === "number" ? Number(input.value) : input.value;
            onInput(value);
        });
        return input;
    }

    function makeRow(label, hint, control) {
        const row = makeEl("div", "gf-row");
        const labelEl = makeEl("div", "gf-label");
        labelEl.innerHTML = `<span>${escapeHtml(label)}</span>${hint ? `<small>${escapeHtml(hint)}</small>` : ""}`;
        row.append(labelEl, control);
        return row;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function setStatus(message, kind = "muted") {
        const el = document.getElementById(STATUS_ID);
        if (!el) return;
        el.textContent = message || "";
        el.className = `gf-status ${kind === "ok" ? "ok" : kind === "error" ? "error" : ""}`;
    }

    function renderDeviceList() {
        const list = document.getElementById("goveefy-device-list");
        if (!list) return;

        list.innerHTML = "";

        if (!CFG.devices.length) {
            const empty = makeEl("div", "gf-empty", "No lights yet. Paste your API key, then click “Load Govee lights”.");
            list.appendChild(empty);
            return;
        }

        const head = makeEl("div", "gf-device-head");
        ["#", "Name", "Device ID", "SKU", "Segments", "Segment Count", "On", ""].forEach(t => head.appendChild(makeEl("span", "", t)));
        list.appendChild(head);

        CFG.devices.forEach((device, index) => {
            const card = makeEl("div", `gf-device ${device.enabled ? "" : "off"}`);

            const num = makeEl("div", "gf-num", String(index + 1));

            const name = makeInput({
                value: device.name,
                placeholder: "Room light",
                onInput: value => {
                    CFG.devices[index].name = value;
                    scheduleSave();
                },
            });

            const id = makeInput({
                value: device.device,
                placeholder: "Device ID",
                onInput: value => {
                    CFG.devices[index].device = value.trim();
                    scheduleSave();
                },
            });

            const sku = makeInput({
                value: device.sku,
                placeholder: "H601F",
                onInput: value => {
                    CFG.devices[index].sku = value.trim().toUpperCase();
                    scheduleSave();
                },
            });

            const segToggle = makeToggle(device.useSegments, value => updateDevice(index, { useSegments: value }));
            if (!device.supportsSegments) {
                segToggle.querySelector("input").disabled = true;
                segToggle.title = "This device was not reported as segment-capable by Govee.";
            }

            const count = makeInput({
                type: "number",
                value: device.segmentCount,
                min: 1,
                max: 64,
                onInput: value => updateDevice(index, { segmentCount: value }),
            });

            const enabled = makeToggle(device.enabled, value => updateDevice(index, { enabled: value }));

            const remove = makeEl("button", "gf-btn danger", "Remove");
            remove.addEventListener("click", () => {
                CFG.devices.splice(index, 1);
                scheduleSave();
                renderDeviceList();
            });

            card.append(num, name, id, sku, segToggle, count, enabled, remove);
            list.appendChild(card);
        });
    }

    function buildSettingsSection() {
        injectStyle();

        const existing = document.getElementById(SECTION_ID);
        if (existing) existing.remove();

        const root = makeEl("section");
        root.id = SECTION_ID;

        const header = makeEl("div", "gf-header");
        const titleWrap = makeEl("div");
        titleWrap.innerHTML = `
            <h2 class="gf-title">Goveefy</h2>
            <div class="gf-subtitle">
                Sync Govee lights to Spotify album art. Settings auto-save while you type.
                Use “Load Govee lights” to pull device IDs, SKUs, segment support, and names from the current Govee Platform API.
            </div>
        `;
        const pill = makeEl("div", "gf-pill", "Auto-save enabled");
        header.append(titleWrap, pill);
        root.appendChild(header);

        const grid = makeEl("div", "gf-grid");

        const account = makeEl("div", "gf-card");
        account.innerHTML = `<div class="gf-card-title">Account</div>`;
        account.appendChild(makeRow(
            "Govee API key",
            "Stored locally by Spicetify. The field is hidden so it is not exposed on-screen.",
            makeInput({
                type: "password",
                value: CFG.goveeApiKey,
                placeholder: "Paste Govee API key",
                onInput: value => updateSetting("goveeApiKey", String(value).trim()),
            })
        ));

        const accountActions = makeEl("div", "gf-actions");
        const loadBtn = makeEl("button", "gf-btn primary", "Load Govee lights");
        loadBtn.addEventListener("click", loadDevicesFromGovee);

        const testBtn = makeEl("button", "gf-btn secondary", "Test enabled lights");
        testBtn.addEventListener("click", testLights);

        accountActions.append(loadBtn, testBtn);
        account.appendChild(accountActions);

        const sync = makeEl("div", "gf-card");
        sync.innerHTML = `<div class="gf-card-title">Sync behavior</div>`;
        sync.appendChild(makeRow(
            "Extension enabled",
            "Master switch for all Goveefy light updates.",
            makeEl("div", "gf-toggle")
        ));
        sync.lastChild.lastChild.appendChild(makeToggle(CFG.enabled, value => updateSetting("enabled", value)));

        sync.appendChild(makeRow(
            "Album-art syncing",
            "When enabled, every track change updates the lights.",
            makeEl("div", "gf-toggle")
        ));
        sync.lastChild.lastChild.appendChild(makeToggle(CFG.autoSync, value => updateSetting("autoSync", value)));

        sync.appendChild(makeRow(
            "Update throttle",
            "Minimum milliseconds between Govee API updates.",
            makeInput({
                type: "number",
                min: 250,
                max: 10000,
                value: CFG.updateThrottle,
                onInput: value => updateSetting("updateThrottle", Math.max(250, Number(value || 800))),
            })
        ));

        sync.appendChild(makeRow(
            "Color threshold",
            "Higher values reduce tiny color-change updates.",
            makeInput({
                type: "number",
                min: 0,
                max: 255,
                value: CFG.colorThreshold,
                onInput: value => updateSetting("colorThreshold", Math.max(0, Math.min(255, Number(value || 0)))),
            })
        ));

        sync.appendChild(makeRow(
            "Minimum brightness",
            "Boosts very dark album colors so lights stay visible.",
            makeInput({
                type: "number",
                min: 1,
                max: 100,
                value: CFG.minBrightness,
                onInput: value => updateSetting("minBrightness", Math.max(1, Math.min(100, Number(value || 35)))),
            })
        ));

        sync.appendChild(makeRow(
            "Boost saturation",
            "Makes album-art colors look better on RGB lights.",
            makeEl("div", "gf-toggle")
        ));
        sync.lastChild.lastChild.appendChild(makeToggle(CFG.boostSaturation, value => updateSetting("boostSaturation", value)));

        const devices = makeEl("div", "gf-card full");
        devices.innerHTML = `<div class="gf-card-title">Lights</div>`;
        const list = makeEl("div", "gf-device-list");
        list.id = "goveefy-device-list";
        devices.appendChild(list);

        const deviceActions = makeEl("div", "gf-actions");
        const addBtn = makeEl("button", "gf-btn secondary", "Add manual light");
        addBtn.addEventListener("click", () => {
            CFG.devices.push(normalizeDevice({ name: "New light", enabled: true }));
            scheduleSave();
            renderDeviceList();
        });

        const syncNowBtn = makeEl("button", "gf-btn secondary", "Sync current track now");
        syncNowBtn.addEventListener("click", () => handleTrackChange(true));

        deviceActions.append(addBtn, syncNowBtn);
        devices.appendChild(deviceActions);

        grid.append(account, sync, devices);
        root.appendChild(grid);

        const status = makeEl("div", "gf-status", "");
        status.id = STATUS_ID;
        root.appendChild(status);

        return root;
    }

    function isPreferencesRoute() {
        return Spicetify?.Platform?.History?.location?.pathname === "/preferences";
    }

    async function mountSettingsSection() {
        if (!isPreferencesRoute()) {
            document.getElementById(HOST_ID)?.remove();
            sectionMounted = false;
            return false;
        }

        // This is the same readiness marker used by the established
        // spcr-settings plugin. History events can fire before Spotify finishes
        // rendering the Settings DOM, so wait for a native setting first.
        while (!document.getElementById("desktop.settings.selectLanguage")) {
            if (!isPreferencesRoute()) return false;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // spcr-settings appends its plugin container to this exact element.
        // Appending here makes Goveefy a direct final child of the complete
        // native settings list instead of a sibling of Spotify's route layout.
        const allSettingsContainer = document.querySelector(
            ".main-view-container__scroll-node-child main div"
        );

        if (!allSettingsContainer) {
            console.error("[Goveefy] Spotify settings container not found");
            return false;
        }

        let host = Array.from(allSettingsContainer.children)
            .find(child => child.id === HOST_ID);

        if (!host) {
            host = document.createElement("div");
            host.id = HOST_ID;
        }

        // Re-appending an existing element moves it to the end. This also keeps
        // Goveefy below settings Spotify inserts asynchronously after page load.
        if (allSettingsContainer.lastElementChild !== host) {
            allSettingsContainer.appendChild(host);
        }

        if (!host.querySelector(`#${SECTION_ID}`)) {
            host.replaceChildren(buildSettingsSection());
            renderDeviceList();
            setStatus("Ready", "ok");
        }

        sectionMounted = true;
        return true;
    }

    function watchForSettingsPage() {
        let queued = false;
        let stopHistoryListener = null;

        const scheduleMount = () => {
            if (queued) return;
            queued = true;

            requestAnimationFrame(async () => {
                queued = false;
                await mountSettingsSection();
            });
        };

        const start = async () => {
            while (!Spicetify?.Platform?.History?.listen) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            stopHistoryListener?.();
            stopHistoryListener = Spicetify.Platform.History.listen(location => {
                if (location.pathname === "/preferences") {
                    scheduleMount();
                } else {
                    document.getElementById(HOST_ID)?.remove();
                    sectionMounted = false;
                }
            });

            if (isPreferencesRoute()) scheduleMount();
        };

        start();

        // Spotify can add or replace native settings after the route has loaded.
        // Keep our direct child last, but only while the preferences route is open.
        const observer = new MutationObserver(() => {
            if (isPreferencesRoute()) scheduleMount();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }


    async function init() {
        await waitForSpicetify();

        watchForSettingsPage();

        if (Spicetify.Player.addEventListener) {
            Spicetify.Player.addEventListener("songchange", () => handleTrackChange(false));
        }

        setInterval(() => handleTrackChange(false), 1500);
        setTimeout(() => handleTrackChange(true), 2500);

        console.log("[Goveefy] Loaded. Open Spotify Settings and scroll to the Goveefy section.");
    }

    init().catch(e => console.error("[Goveefy] Init failed:", e));
})();
