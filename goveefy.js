// ═══════════════════════════════════════════════════════════════════════════════
// GOVEEFY
// ═══════════════════════════════════════════════════════════════════════════════
//
// HOW TO CONFIGURE:
//   Spotify → Profile avatar → Settings → scroll to bottom → "Govee Sync"
//
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // SETTINGS  (persisted in Spicetify.LocalStorage)
    // ═══════════════════════════════════════════════════════════════════════════

    const STORAGE_KEY = "goveefy_v1";

    const DEFAULT_SETTINGS = {
        goveeApiKey:    "",
        segmentCount:   1,
        devices:        [{ name: "", device: "", sku: "", enabled: true }],
        updateThrottle: 800,
        colorThreshold: 25,
    };

    function loadSettings() {
        try {
            const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
            if (raw) {
                const p = JSON.parse(raw);
                return { ...DEFAULT_SETTINGS, ...p, devices: p.devices ?? DEFAULT_SETTINGS.devices };
            }
        } catch (_) {}
        return { ...DEFAULT_SETTINGS, devices: DEFAULT_SETTINGS.devices.map(d => ({ ...d })) };
    }

    function saveSettings(s) {
        Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(s));
    }

    let CFG = loadSettings();

    function getSegments() {
        return Array.from({ length: CFG.segmentCount }, (_, i) => i);
    }

    function getEnabledDevices() {
        return CFG.devices.filter(d => d.enabled && d.device.trim());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SETTINGS PAGE INJECTION
    // ═══════════════════════════════════════════════════════════════════════════

    const SECTION_ID = "goveefy-section";

    const CSS = `
        #${SECTION_ID} {
            padding: 16px 0 40px;
            border-top: 1px solid var(--essential-subdued, #3e3e3e);
            margin-top: 8px;
        }
        #${SECTION_ID} .gs-title {
            font-size: 24px; font-weight: 700;
            color: var(--text-base, #fff);
            margin-bottom: 4px;
            text-align: left;
        }
        #${SECTION_ID} .gs-desc {
            font-size: 14px;
            color: var(--text-subdued, #a7a7a7);
            margin-bottom: 28px;
            text-align: left;
        }
        #${SECTION_ID} .gs-row {
            display: flex; align-items: center;
            justify-content: space-between;
            padding: 14px 0;
            border-bottom: 1px solid var(--essential-subdued, #3e3e3e);
            gap: 16px;
        }
        #${SECTION_ID} .gs-row-label { flex: 1; min-width: 0; }
        #${SECTION_ID} .gs-row-label span {
            font-size: 14px; font-weight: 600;
            color: var(--text-base, #fff); display: block;
        }
        #${SECTION_ID} .gs-row-label small {
            font-size: 12px; color: var(--text-subdued, #a7a7a7);
        }
        #${SECTION_ID} input[type=text],
        #${SECTION_ID} input[type=number] {
            background: var(--background-elevated-base, #282828);
            border: 1px solid var(--essential-subdued, #3e3e3e);
            border-radius: 4px; color: var(--text-base, #fff);
            font-size: 14px; padding: 8px 12px; outline: none;
            transition: border-color .15s; min-width: 0;
        }
        #${SECTION_ID} input[type=text]:focus,
        #${SECTION_ID} input[type=number]:focus {
            border-color: var(--essential-bright-accent, #1db954);
        }
        #${SECTION_ID} input[type=text]   { width: 300px; }
        #${SECTION_ID} input[type=number] { width: 90px; }

        /* Toggle switch */
        #${SECTION_ID} .gs-toggle {
            position: relative; width: 51px; height: 28px;
            flex-shrink: 0; cursor: pointer; display: inline-block;
        }
        #${SECTION_ID} .gs-toggle input { opacity:0; width:0; height:0; position:absolute; }
        #${SECTION_ID} .gs-track {
            position:absolute; top:0; left:0; right:0; bottom:0;
            background: var(--essential-subdued, #535353);
            border-radius: 34px; transition: .25s; pointer-events:none;
        }
        #${SECTION_ID} .gs-thumb {
            position:absolute; height:20px; width:20px;
            left:4px; bottom:4px; background:#fff;
            border-radius:50%; transition: .25s; pointer-events:none;
        }
        #${SECTION_ID} .gs-toggle input:checked ~ .gs-track { background: var(--essential-bright-accent, #1db954); }
        #${SECTION_ID} .gs-toggle input:checked ~ .gs-thumb  { transform: translateX(23px); }

        /* Device cards */
        #${SECTION_ID} .gs-devices { width:100%; margin-top:16px; display:flex; flex-direction:column; gap:10px; }
        #${SECTION_ID} .gs-device-card {
            background: var(--background-elevated-base, #1e1e1e);
            border: 1px solid var(--essential-subdued, #3e3e3e);
            border-radius: 8px; padding: 14px 16px;
            display: grid;
            grid-template-columns: 24px 1fr 1fr 70px 51px auto;
            align-items: center; gap: 10px;
            transition: opacity .2s;
        }
        #${SECTION_ID} .gs-device-card.gs-disabled { opacity: 0.4; }
        #${SECTION_ID} .gs-device-num {
            font-size: 13px; font-weight: 700;
            color: var(--text-subdued, #a7a7a7); text-align:center;
        }
        #${SECTION_ID} .gs-device-card input[type=text] { width:100%; box-sizing:border-box; }
        #${SECTION_ID} .gs-col-headers {
            display: grid;
            grid-template-columns: 24px 1fr 1fr 70px 51px auto;
            gap: 10px; margin-top:12px; margin-bottom:4px; padding: 0 16px;
        }
        #${SECTION_ID} .gs-col-headers span {
            font-size: 11px; font-weight:700; letter-spacing:.5px;
            text-transform:uppercase; color:var(--text-subdued,#a7a7a7);
        }

        /* Buttons */
        #${SECTION_ID} .gs-btn {
            font-size: 13px; font-weight: 700; border: none;
            border-radius: 500px; cursor: pointer; padding: 8px 20px;
            transition: transform .1s, filter .15s; white-space: nowrap;
        }
        #${SECTION_ID} .gs-btn:hover  { filter: brightness(1.12); }
        #${SECTION_ID} .gs-btn:active { transform: scale(.97); }
        #${SECTION_ID} .gs-green  { background:#1db954; color:#000; }
        #${SECTION_ID} .gs-subtle {
            background: var(--background-elevated-base,#282828);
            color: var(--text-base,#fff);
            border: 1px solid var(--essential-subdued,#3e3e3e) !important;
        }
        #${SECTION_ID} .gs-red    { background:#e22134; color:#fff; padding: 6px 14px; border-radius:4px; font-size:12px; }
        #${SECTION_ID} .gs-actions { display:flex; gap:10px; margin-top:24px; align-items:center; }
        #${SECTION_ID} .gs-saved {
            font-size:13px; color:#1db954; font-weight:600;
            opacity:0; transition:opacity .3s;
        }
        #${SECTION_ID} .gs-saved.show { opacity:1; }
    `;

    function injectStyle() {
        if (document.getElementById("goveefy-style")) return;
        const s = document.createElement("style");
        s.id = "goveefy-style";
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function buildSection() {
        // Local draft — only applied to CFG when user clicks Save
        let draft = { ...CFG, devices: CFG.devices.map(d => ({ ...d })) };

        const root = document.createElement("div");
        root.id = SECTION_ID;

        root.innerHTML = `
            <div class="gs-title">Goveefy</div>
            <div class="gs-desc">Sync your Govee lights to Spotify album art colors in real-time.</div>
        `;

        // ── Helper: labeled row ──
        function row(labelText, hint, ctrl) {
            const r = document.createElement("div");
            r.className = "gs-row";
            const lbl = document.createElement("div");
            lbl.className = "gs-row-label";
            lbl.innerHTML = `<span>${labelText}</span>${hint ? `<small>${hint}</small>` : ""}`;
            r.appendChild(lbl);
            r.appendChild(ctrl);
            root.appendChild(r);
        }

        function textInput(val, ph, onChange) {
            const el = document.createElement("input");
            el.type = "text"; el.value = val; el.placeholder = ph || "";
            el.addEventListener("input", () => onChange(el.value));
            return el;
        }

        function numInput(val, min, max, onChange) {
            const el = document.createElement("input");
            el.type = "number"; el.value = val; el.min = min; el.max = max;
            el.addEventListener("input", () => onChange(Number(el.value)));
            return el;
        }

        function makeToggle(checked, onChange) {
            const label = document.createElement("label");
            label.className = "gs-toggle";
            const cb = document.createElement("input");
            cb.type = "checkbox"; cb.checked = checked;
            cb.addEventListener("change", () => onChange(cb.checked));
            const track = document.createElement("span"); track.className = "gs-track";
            const thumb = document.createElement("span"); thumb.className = "gs-thumb";
            label.appendChild(cb); label.appendChild(track); label.appendChild(thumb);
            return label;
        }

        // ── API Key ──
        row("Govee API Key",
            "Get yours from the Govee Developer portal",
            textInput(draft.goveeApiKey, "Paste your API key here", v => draft.goveeApiKey = v.trim())
        );

        // ── Segment Count ──
        row("Light segments",
            "Controls how many segments each light uses",
            numInput(draft.segmentCount, 1, 15, v => draft.segmentCount = Math.max(1, v))
        );

        // ── Devices ──
        const devSection = document.createElement("div");
        devSection.className = "gs-row";
        devSection.style.cssText = "flex-direction:column; align-items:flex-start; padding-bottom:20px;";

        const devLabel = document.createElement("div");
        devLabel.className = "gs-row-label";
        devLabel.innerHTML = `<span>Lights</span><small>Toggle each light on or off, edit its details, or remove it</small>`;
        devSection.appendChild(devLabel);

        const headers = document.createElement("div");
        headers.className = "gs-col-headers";
        headers.innerHTML = `
            <span></span>
            <span>Name</span>
            <span>MAC Address</span>
            <span>SKU</span>
            <span>Status</span>
            <span></span>
        `;
        devSection.appendChild(headers);

        const devList = document.createElement("div");
        devList.className = "gs-devices";
        devSection.appendChild(devList);

        function renderDevices() {
            devList.innerHTML = "";

            draft.devices.forEach((dev, i) => {
                const card = document.createElement("div");
                card.className = `gs-device-card${dev.enabled ? "" : " gs-disabled"}`;

                const num = document.createElement("div");
                num.className = "gs-device-num";
                num.textContent = i + 1;

                const nameInp = document.createElement("input");
                nameInp.type = "text"; nameInp.value = dev.name;
                nameInp.placeholder = "e.g. Desk Light";
                nameInp.addEventListener("input", () => draft.devices[i].name = nameInp.value);

                const macInp = document.createElement("input");
                macInp.type = "text"; macInp.value = dev.device;
                macInp.placeholder = "00:11:22:33:44:55:66:77";
                macInp.addEventListener("input", () => draft.devices[i].device = macInp.value);

                const skuInp = document.createElement("input");
                skuInp.type = "text"; skuInp.value = dev.sku;
                skuInp.placeholder = "e.g. H601F";
                skuInp.addEventListener("input", () => draft.devices[i].sku = skuInp.value);

                const tog = makeToggle(dev.enabled, v => {
                    draft.devices[i].enabled = v;
                    card.classList.toggle("gs-disabled", !v);
                });

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "Remove";
                removeBtn.className = "gs-btn gs-red";
                removeBtn.addEventListener("click", () => {
                    draft.devices.splice(i, 1);
                    renderDevices();
                });

                card.appendChild(num);
                card.appendChild(nameInp);
                card.appendChild(macInp);
                card.appendChild(skuInp);
                card.appendChild(tog);
                card.appendChild(removeBtn);
                devList.appendChild(card);
            });

            const addBtn = document.createElement("button");
            addBtn.textContent = "+ Add light";
            addBtn.className = "gs-btn gs-subtle";
            addBtn.style.marginTop = "6px";
            addBtn.addEventListener("click", () => {
                draft.devices.push({ name: "", device: "", sku: "", enabled: true });
                renderDevices();
            });
            devList.appendChild(addBtn);
        }

        renderDevices();
        root.appendChild(devSection);

        // ── Advanced ──
        row("Update throttle (ms)",
            "Minimum time between API calls when tracks change",
            numInput(draft.updateThrottle, 100, 10000, v => draft.updateThrottle = Math.max(100, v))
        );

        row("Color change threshold",
            "How different (0–255) a new color must be to trigger an update",
            numInput(draft.colorThreshold, 1, 255, v => draft.colorThreshold = Math.min(255, Math.max(1, v)))
        );

        // ── Save ──
        const actions = document.createElement("div");
        actions.className = "gs-actions";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className = "gs-btn gs-green";

        const savedMsg = document.createElement("span");
        savedMsg.className = "gs-saved";
        savedMsg.textContent = "✓ Saved!";

        saveBtn.addEventListener("click", () => {
            Object.assign(CFG, draft);
            CFG.devices = draft.devices.map(d => ({ ...d }));
            saveSettings(CFG);
            savedMsg.classList.add("show");
            setTimeout(() => savedMsg.classList.remove("show"), 2500);
        });

        actions.appendChild(saveBtn);
        actions.appendChild(savedMsg);
        root.appendChild(actions);

        return root;
    }

    function injectIntoSettingsPage() {
        if (document.getElementById(SECTION_ID)) return;
        const container =
            document.querySelector(".x-settings-section")?.parentElement ??
            document.querySelector("[data-testid='settings-page']") ??
            document.querySelector(".main-view-container__scroll-node-child main") ??
            document.querySelector(".main-view-container__scroll-node-child") ??
            document.querySelector(".os-content");
        if (!container) return;
        injectStyle();
        container.appendChild(buildSection());
        console.log("[Goveefy] ✓ Settings injected");
    }

    function watchForSettingsPage() {
        const history = Spicetify?.Platform?.History;
        if (history) {
            history.listen(({ pathname }) => {
                if (pathname === "/preferences") setTimeout(injectIntoSettingsPage, 400);
            });
            if (history.location?.pathname === "/preferences") setTimeout(injectIntoSettingsPage, 400);
        } else {
            let lastHref = location.href;
            new MutationObserver(() => {
                if (location.href !== lastHref) {
                    lastHref = location.href;
                    if (location.href.includes("preferences")) setTimeout(injectIntoSettingsPage, 400);
                }
            }).observe(document.body, { childList: true, subtree: true });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION & DEPENDENCY LOADING
    // ═══════════════════════════════════════════════════════════════════════════

    function waitForSpicetify() {
        return new Promise(resolve => {
            const iv = setInterval(() => {
                if (window.Spicetify && Spicetify.Player && Spicetify.Player.data) {
                    clearInterval(iv); resolve();
                }
            }, 100);
        });
    }

    function loadColorThief() {
        return new Promise((resolve, reject) => {
            if (window.ColorThief) { resolve(); return; }
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js";
            s.onload = resolve;
            s.onerror = () => reject(new Error("ColorThief load failed"));
            document.head.appendChild(s);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COLOR SCIENCE ENGINE
    // ═══════════════════════════════════════════════════════════════════════════

    const COLOR_CONFIG = {
        paletteSize: 6,
        minSaturation: 0.20, minLightness: 0.12, maxLightness: 0.88,
        idealLightness: 0.50, lightnessWeight: 1.8,
        saturationBoost: 2.1, saturationFloor: 0.28,
        lightnessMultiplier: 0.89, gamma: 0.82,
        hueComp: {
            red:    { maxNorm: 0.083, shift: 0.018 },
            redW:   { minNorm: 0.917, shift: 0.018 },
            orange: { minNorm: 0.083, maxNorm: 0.167, m: 1.07 },
            yellow: { minNorm: 0.167, maxNorm: 0.25,  m: 1.04 },
            green:  { minNorm: 0.25,  maxNorm: 0.417, m: 1.05 },
            cyan:   { minNorm: 0.417, maxNorm: 0.583, m: 0.96 },
            blue:   { minNorm: 0.583, maxNorm: 0.75,  m: 0.95 },
            purple: { minNorm: 0.75,  maxNorm: 0.917, m: 0.97 }
        }
    };

    let lastColor = { r:0,g:0,b:0 }, lastUpdateTime = 0, lastUri = null;

    function rgbToHsl(r,g,b) {
        r/=255; g/=255; b/=255;
        const max=Math.max(r,g,b), min=Math.min(r,g,b);
        let h, s, l=(max+min)/2;
        if (max===min) { h=s=0; }
        else {
            const d=max-min;
            s = l>0.5 ? d/(2-max-min) : d/(max+min);
            switch(max) {
                case r: h=(g-b)/d+(g<b?6:0); break;
                case g: h=(b-r)/d+2; break;
                case b: h=(r-g)/d+4; break;
            }
            h/=6;
        }
        return {h,s,l};
    }

    function hslToRgb(h,s,l) {
        if (s===0) { const v=Math.round(l*255); return {r:v,g:v,b:v}; }
        const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
        const hue=(p,q,t)=>{ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<0.5)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
        return { r:Math.round(hue(p,q,h+1/3)*255), g:Math.round(hue(p,q,h)*255), b:Math.round(hue(p,q,h-1/3)*255) };
    }

    function selectBestColor(palette) {
        if (!palette?.length) return {r:120,g:120,b:120};
        const C=COLOR_CONFIG;
        const cands = palette.map(c => {
            const {s,l}=rgbToHsl(c[0],c[1],c[2]);
            if (s<C.minSaturation||l<C.minLightness||l>C.maxLightness) return null;
            return { rgb:{r:c[0],g:c[1],b:c[2]}, score:s*(1-Math.abs(l-C.idealLightness)*C.lightnessWeight) };
        }).filter(Boolean).sort((a,b)=>b.score-a.score);
        return cands[0]?.rgb ?? {r:palette[0][0],g:palette[0][1],b:palette[0][2]};
    }

    function optimizeColor(rgb) {
        let {r,g,b}=rgb, {h,s,l}=rgbToHsl(r,g,b);
        const C=COLOR_CONFIG, cp=C.hueComp;
        s=Math.min(1,s*C.saturationBoost+C.saturationFloor);
        l=Math.min(1,Math.max(0,l*C.lightnessMultiplier));
        if      (h<cp.red.maxNorm)                          h=(h+cp.red.shift)%1;
        else if (h>=cp.redW.minNorm)                        h=(h+cp.redW.shift)%1;
        else if (h>=cp.orange.minNorm&&h<cp.orange.maxNorm) h*=cp.orange.m;
        else if (h>=cp.yellow.minNorm&&h<cp.yellow.maxNorm) h*=cp.yellow.m;
        else if (h>=cp.green.minNorm&&h<cp.green.maxNorm)   h*=cp.green.m;
        else if (h>=cp.cyan.minNorm&&h<cp.cyan.maxNorm)     h*=cp.cyan.m;
        else if (h>=cp.blue.minNorm&&h<cp.blue.maxNorm)     h*=cp.blue.m;
        else if (h>=cp.purple.minNorm&&h<cp.purple.maxNorm) h*=cp.purple.m;
        const o=hslToRgb(h,s,l);
        return {
            r:Math.min(255,Math.round(Math.pow(o.r/255,C.gamma)*255)),
            g:Math.min(255,Math.round(Math.pow(o.g/255,C.gamma)*255)),
            b:Math.min(255,Math.round(Math.pow(o.b/255,C.gamma)*255))
        };
    }

    function colorsDiffer(a,b,t) {
        return Math.abs(a.r-b.r)>t || Math.abs(a.g-b.g)>t || Math.abs(a.b-b.b)>t;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ALBUM ART
    // ═══════════════════════════════════════════════════════════════════════════

    function getAlbumArtUrl(pd) {
        const item=pd?.item; if(!item) return null;
        let u = item.metadata?.image_url || item.metadata?.image_xlarge_url ||
                item.album?.images?.[0]?.url || item.images?.[0]?.url;
        if (!u) return null;
        return u.startsWith("spotify:image:") ? `https://i.scdn.co/image/${u.replace("spotify:image:","")}` : u;
    }

    async function extractColor(url) {
        try {
            const img = await new Promise((res,rej) => {
                const i=new Image(); i.crossOrigin="Anonymous";
                i.onload=()=>res(i); i.onerror=rej; i.src=url;
            });
            return selectBestColor(new ColorThief().getPalette(img, COLOR_CONFIG.paletteSize));
        } catch(e) { return {r:120,g:120,b:120}; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GOVEE API
    // ═══════════════════════════════════════════════════════════════════════════

    async function setLights(r,g,b) {
        const devices = getEnabledDevices();
        if (!devices.length) return;
        const segments=getSegments(), hex=(r<<16)|(g<<8)|b;
        console.log(`[Goveefy] 🎨 RGB(${r},${g},${b}) → ${devices.length} light(s)`);
        await Promise.all(devices.map(dev =>
            fetch("https://openapi.api.govee.com/router/api/v1/device/control", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Govee-API-Key": CFG.goveeApiKey },
                body: JSON.stringify({
                    requestId: `req_${Date.now()}_${Math.random()}`,
                    payload: {
                        sku: dev.sku, device: dev.device,
                        capability: {
                            type: "devices.capabilities.segment_color_setting",
                            instance: "segmentedColorRgb",
                            value: { segment: segments, rgb: hex }
                        }
                    }
                })
            })
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(() => console.log(`[Goveefy] ✅ ${dev.name || dev.device}`))
            .catch(e => console.warn(`[Goveefy] ✗ ${dev.name || dev.device}:`, e))
        ));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN SYNC LOOP
    // ═══════════════════════════════════════════════════════════════════════════

    async function handleTrackChange() {
        const data=Spicetify.Player.data, item=data?.item;
        if (!item?.uri || item.uri===lastUri) return;
        lastUri=item.uri;
        console.log(`[Goveefy] 🎵 ${item.name} — ${item.artists?.[0]?.name}`);

        if (!CFG.goveeApiKey) return;
        if (!getEnabledDevices().length) return;
        if (Date.now()-lastUpdateTime < CFG.updateThrottle) return;

        const artUrl=getAlbumArtUrl(data);
        if (!artUrl) return;

        const color=optimizeColor(await extractColor(artUrl));
        if (!colorsDiffer(color, lastColor, CFG.colorThreshold)) return;

        await setLights(color.r, color.g, color.b);
        lastColor=color; lastUpdateTime=Date.now();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════════════════

    async function init() {
        await waitForSpicetify();
        await loadColorThief();

        watchForSettingsPage();

        setInterval(handleTrackChange, 1000);
        setTimeout(handleTrackChange, 2000);

        if (Spicetify.Player.addEventListener) {
            Spicetify.Player.addEventListener("songchange", handleTrackChange);
        }

        console.log("[Goveefy] 🚀 Running — Spotify → Settings → scroll down to configure");
    }

    init().catch(e => console.error("[Goveefy] ❌", e));

})();
