/**
 * FCHAN Arduino Bridge Drawer
 * Injects a full-screen slide-in panel for connecting Arduino sensors.
 * Simplified for non-technical users — no jargon, guided steps.
 * Include this script in any page: <script src="../js/arduino-bridge-drawer.js"></script>
 */

(function () {
  // ── SENSOR LABEL MAP ─────────────────────────────
  const SENSOR_MAP = {
    'temp':'temperature','temperature':'temperature','tmp':'temperature','t':'temperature',
    'hum':'humidity','humidity':'humidity','h':'humidity','rh':'humidity',
    'soil':'soil_moisture','soil_moisture':'soil_moisture','moisture':'soil_moisture',
    'water sensor value':'soil_moisture','water':'soil_moisture','sm':'soil_moisture',
    'ph':'soil_ph','soil_ph':'soil_ph',
    'light':'light','lux':'light','intencity':'light','intensity':'light',
    'light intensity':'light','ldr':'light','brightness':'light',
    'co2':'co2','carbon':'co2',
    'wind':'wind','wind speed':'wind',
    'rain':'rainfall','rainfall':'rainfall',
  };
  const SENSOR_UNITS = {
    temperature:'°C', humidity:'%', soil_moisture:'%', soil_ph:'pH',
    light:'lux', co2:'ppm', wind:'m/s', rainfall:'mm',
  };

  // ── STATE ────────────────────────────────────────
  let usbPort = null, usbReader = null, isConnected = false;
  let btDevice = null, btChar = null, isBtConnected = false;
  let counters = { rx: 0, sent: 0, err: 0 };
  let _pendingMode = null, _pendingApiKey = null;

  // ── INJECT HTML ──────────────────────────────────
  function injectDrawer() {
    if (document.getElementById('arduinoBridgeDrawer')) return;

    const el = document.createElement('div');
    el.id = 'arduinoBridgeDrawer';
    el.innerHTML = `
      <!-- Backdrop -->
      <div id="abBackdrop" onclick="closeArduinoBridge()"
           style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);
                  z-index:450;backdrop-filter:blur(2px);transition:opacity 0.25s;"></div>

      <!-- Drawer panel -->
      <div id="abPanel"
           style="display:none;position:fixed;top:0;right:0;height:100vh;width:100%;
                  max-width:520px;background:var(--surface);z-index:460;
                  overflow-y:auto;box-shadow:-8px 0 40px rgba(0,0,0,0.25);
                  transform:translateX(100%);transition:transform 0.3s cubic-bezier(.4,0,.2,1);">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:20px 24px;border-bottom:1px solid var(--border);
                    background:var(--surface);position:sticky;top:0;z-index:2;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:linear-gradient(135deg,var(--primary),var(--secondary));
                        border-radius:10px;width:36px;height:36px;display:flex;
                        align-items:center;justify-content:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="white" stroke-width="2.5" stroke-linecap="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8M12 3v4"/>
                <circle cx="8" cy="14" r="1.5" fill="white" stroke="none"/>
                <circle cx="16" cy="14" r="1.5" fill="white" stroke="none"/>
              </svg>
            </div>
            <div>
              <div style="font-weight:700;font-size:16px;color:var(--text);">Connect Arduino</div>
              <div style="font-size:11px;color:var(--text-muted);">Send sensor data to FCHAN</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button onclick="window.open('arduino-guide.html','_blank')"
                    style="background:rgba(39,174,96,0.12);border:1px solid rgba(39,174,96,0.3);
                           border-radius:8px;padding:6px 12px;cursor:pointer;
                           color:var(--primary);font-size:12px;font-weight:600;
                           font-family:var(--font-body);white-space:nowrap;"
                    title="Step-by-step guide">
               Full Guide
            </button>
            <button onclick="window.open('arduino-download.html','_blank')"
                    style="background:rgba(91,143,255,0.12);border:1px solid rgba(91,143,255,0.3);
                           border-radius:8px;padding:6px 12px;cursor:pointer;
                           color:#5b8fff;font-size:12px;font-weight:600;
                           font-family:var(--font-body);white-space:nowrap;"
                    title="Download Scripts">
               Download
            </button>
          <button onclick="closeArduinoBridge()"
                  style="background:var(--surface-2);border:1px solid var(--border);
                         border-radius:50%;width:34px;height:34px;cursor:pointer;
                         display:flex;align-items:center;justify-content:center;
                         font-size:18px;color:var(--text-muted);line-height:1;">✕</button>
        </div>

        <div style="padding:24px;">

          <!-- API Key config (collapsed by default, shown when needed) -->
          <div id="abApiSection"
               style="background:var(--surface-2);border:1px solid var(--border);
                      border-radius:12px;padding:16px;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);
                        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
                Your Sensor Connection Key
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input id="abApiKey" type="password"
                     placeholder="Paste key from sensor settings or use auto-detect"
                     style="flex:1;padding:10px 14px;border:1px solid var(--border);
                            border-radius:8px;background:var(--surface);
                            color:var(--text);font-size:13px;font-family:monospace;">
              <button onclick="abToggleKeyVisibility()"
                      style="padding:10px;background:var(--surface);border:1px solid var(--border);
                             border-radius:8px;cursor:pointer;color:var(--text-muted);font-size:14px;"
                      title="Show/hide key" id="abKeyToggle">👁</button>
            </div>
            <div id="abAutoKeyHint" style="font-size:11px;color:var(--primary);
                 margin-top:6px;display:none;">
              ✓ Key loaded automatically from your sensor
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">
              Find this key in your zone page → sensor settings → "WiFi / USB connection key"
            </div>
          </div>

          <!-- Connection method picker -->
          <div style="margin-bottom:20px;">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px;">
              How is your Arduino connected to this device?
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" id="abMethodGrid">

              <button class="ab-method-btn active" data-mode="usb" onclick="abSelectMode('usb')">
                <span style="font-size:22px;"> </span>
                <span style="font-weight:600;font-size:13px;">USB Cable</span>
                <span style="font-size:11px;color:var(--text-muted);">Plugged into this computer</span>
              </button>

              <button class="ab-method-btn" data-mode="bluetooth" onclick="abSelectMode('bluetooth')">
                <span style="font-size:22px;"> </span>
                <span style="font-weight:600;font-size:13px;">Bluetooth</span>
                <span style="font-size:11px;color:var(--text-muted);">Wireless, nearby</span>
              </button>

              <button class="ab-method-btn" data-mode="wifi" onclick="abSelectMode('wifi')">
                <span style="font-size:22px;"> </span>
                <span style="font-weight:600;font-size:13px;">WiFi / Network</span>
                <span style="font-size:11px;color:var(--text-muted);">Arduino has WiFi module</span>
              </button>

              <button class="ab-method-btn" data-mode="manual" onclick="abSelectMode('manual')">
                <span style="font-size:22px;"> </span>
                <span style="font-weight:600;font-size:13px;">Enter Manually</span>
                <span style="font-size:11px;color:var(--text-muted);">Type readings yourself</span>
              </button>

            </div>
          </div>

          <!-- Dynamic content area per mode -->
          <div id="abModeContent"></div>

          <!-- Live reading display -->
          <div id="abLiveSection" style="display:none;margin-top:20px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);
                        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
                Live Readings
            </div>
            <div id="abReadingsGrid"
                 style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;">
            </div>
            <div id="abCounters"
                 style="margin-top:10px;font-size:11px;color:var(--text-muted);
                        display:flex;gap:16px;">
              <span>Received: <strong id="abCntRx">0</strong></span>
              <span>Saved: <strong id="abCntSent">0</strong></span>
              <span>Errors: <strong id="abCntErr">0</strong></span>
            </div>
          </div>

          <!-- Log (collapsed, show only on error) -->
          <details style="margin-top:16px;">
            <summary style="font-size:12px;color:var(--text-muted);cursor:pointer;
                            user-select:none;padding:6px 0;">
                Technical log (for troubleshooting)
            </summary>
            <div id="abLog"
                 style="margin-top:8px;background:#0d1117;border-radius:8px;
                        height:140px;overflow-y:auto;padding:10px;
                        font-family:monospace;font-size:11px;line-height:1.6;"></div>
            <button onclick="document.getElementById('abLog').innerHTML=''"
                    style="margin-top:6px;font-size:11px;color:var(--text-muted);
                           background:none;border:none;cursor:pointer;">
              Clear log
            </button>
          </details>

        </div>
      </div>

      <style>
        .ab-method-btn {
          display:flex;flex-direction:column;align-items:center;gap:4px;
          padding:16px 10px;border:2px solid var(--border);border-radius:12px;
          background:var(--surface-2);cursor:pointer;transition:all 0.15s;
          text-align:center;
        }
        .ab-method-btn:hover { border-color:var(--primary);background:var(--surface); }
        .ab-method-btn.active {
          border-color:var(--primary);background:rgba(39,174,96,0.08);
          box-shadow:0 0 0 3px rgba(39,174,96,0.12);
        }
        .ab-status-bar {
          display:flex;align-items:center;gap:8px;padding:10px 14px;
          border-radius:8px;font-size:13px;font-weight:500;margin-bottom:14px;
        }
        .ab-status-bar.idle     { background:var(--surface-2);color:var(--text-muted);border:1px solid var(--border); }
        .ab-status-bar.ok       { background:rgba(39,174,96,0.1);color:var(--success);border:1px solid rgba(39,174,96,0.3); }
        .ab-status-bar.err      { background:rgba(231,76,60,0.1);color:var(--danger);border:1px solid rgba(231,76,60,0.3); }
        .ab-status-bar.loading  { background:rgba(243,156,18,0.1);color:var(--warning);border:1px solid rgba(243,156,18,0.3); }
        .ab-dot { width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0; }
        .ab-status-bar.ok .ab-dot { animation:abPulse 1.4s infinite; }
        @keyframes abPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.4)} }
        .ab-btn-connect {
          width:100%;padding:13px;background:var(--primary);color:white;
          border:none;border-radius:10px;font-size:14px;font-weight:600;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          gap:8px;transition:all 0.15s;
        }
        .ab-btn-connect:hover { background:var(--primary-dark);transform:translateY(-1px); }
        .ab-btn-connect:disabled { opacity:0.5;cursor:not-allowed;transform:none; }
        .ab-btn-disconnect {
          width:100%;padding:13px;background:transparent;color:var(--danger);
          border:1px solid var(--danger);border-radius:10px;font-size:14px;
          font-weight:600;cursor:pointer;transition:all 0.15s;
        }
        .ab-btn-disconnect:hover { background:rgba(231,76,60,0.06); }
        .ab-reading-chip {
          background:var(--surface-2);border:1px solid var(--border);
          border-radius:10px;padding:10px;text-align:center;
        }
        .ab-log-line { margin:0;white-space:pre-wrap;word-break:break-all; }
        .ab-log-line.rx   { color:#79c0ff; }
        .ab-log-line.ok   { color:#56d364; }
        .ab-log-line.warn { color:#d29922; }
        .ab-log-line.err  { color:#f85149; }
        .ab-log-line.info { color:#8b949e; }
      </style>
    `;
    document.body.appendChild(el);
  }

  // ── OPEN / CLOSE ─────────────────────────────────
  window.openArduinoBridge = function (apiKey, mode) {
    injectDrawer();
    _pendingApiKey = apiKey || null;
    _pendingMode   = mode   || 'usb';

    const backdrop = document.getElementById('abBackdrop');
    const panel    = document.getElementById('abPanel');
    backdrop.style.display = 'block';
    panel.style.display    = 'block';
    setTimeout(() => {
      panel.style.transform = 'translateX(0)';
    }, 10);

    // Pre-fill key if provided
    if (apiKey) {
      document.getElementById('abApiKey').value = apiKey;
      document.getElementById('abAutoKeyHint').style.display = 'block';
    }

    // Detect best available mode if not specified
    let bestMode = mode || 'usb';
    if (!mode) {
      if (!('serial' in navigator) && !('bluetooth' in navigator)) bestMode = 'wifi';
      else if (!('serial' in navigator)) bestMode = 'bluetooth';
    }

    abSelectMode(bestMode);
  };

  window.closeArduinoBridge = function () {
    const panel    = document.getElementById('abPanel');
    const backdrop = document.getElementById('abBackdrop');
    if (!panel) return;
    panel.style.transform = 'translateX(100%)';
    setTimeout(() => {
      panel.style.display    = 'none';
      backdrop.style.display = 'none';
    }, 310);
  };

  // ── MODE SELECTION ────────────────────────────────
  window.abSelectMode = function (mode) {
    document.querySelectorAll('.ab-method-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    _pendingMode = mode;
    renderModeContent(mode);
  };

  function renderModeContent(mode) {
    const area = document.getElementById('abModeContent');
    document.getElementById('abLiveSection').style.display = 'none';

    if (mode === 'usb') {
      const supported = 'serial' in navigator;
      area.innerHTML = `
        <div class="ab-status-bar idle" id="abUsbStatus">
          <span class="ab-dot"></span>
          <span id="abUsbStatusText">Ready to connect</span>
        </div>
        ${!supported ? `
          <div style="background:rgba(243,156,18,0.08);border:1px solid rgba(243,156,18,0.3);
                      border-radius:10px;padding:14px;margin-bottom:14px;font-size:13px;">
            <strong style="color:var(--warning);">⚠ Your browser doesn't support USB connection.</strong><br>
            <span style="color:var(--text-muted);">Please open this page in
            <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on a computer,
            then try again.</span>
          </div>
        ` : `
          <div style="background:var(--surface-2);border-radius:10px;padding:14px;
                      margin-bottom:14px;font-size:13px;color:var(--text-muted);line-height:1.6;">
            <strong style="color:var(--text);">How to connect:</strong><br>
            1. Plug your Arduino into this computer with a USB cable.<br>
            2. Click <strong>Connect Arduino</strong> below.<br>
            3. A popup will ask you to choose a port — select your Arduino.<br>
            4. Data will start flowing automatically.  
          </div>
        `}
        <button class="ab-btn-connect" id="abUsbConnectBtn" onclick="abUsbConnect()"
                ${!supported ? 'disabled' : ''}>
            Connect Arduino via USB
        </button>
        <button class="ab-btn-disconnect" id="abUsbDisconnectBtn"
                style="display:none;margin-top:8px;" onclick="abUsbDisconnect()">
          Disconnect
        </button>
      `;
    }

    else if (mode === 'bluetooth') {
      const supported = 'bluetooth' in navigator;
      area.innerHTML = `
        <div class="ab-status-bar idle" id="abBtStatus">
          <span class="ab-dot"></span>
          <span id="abBtStatusText">Ready to scan</span>
        </div>
        ${!supported ? `
          <div style="background:rgba(243,156,18,0.08);border:1px solid rgba(243,156,18,0.3);
                      border-radius:10px;padding:14px;margin-bottom:14px;font-size:13px;">
            <strong style="color:var(--warning);">⚠ Your browser doesn't support Bluetooth.</strong><br>
            <span style="color:var(--text-muted);">Use <strong>Google Chrome</strong> on Android, Windows, or Mac.
            Bluetooth is not supported on iPhone/Safari or Firefox.</span>
          </div>
        ` : `
          <div style="background:var(--surface-2);border-radius:10px;padding:14px;
                      margin-bottom:14px;font-size:13px;color:var(--text-muted);line-height:1.6;">
            <strong style="color:var(--text);">How to connect:</strong><br>
            1. Make sure your Arduino's Bluetooth module is powered on.<br>
            2. Click <strong>Scan for Arduino</strong> below.<br>
            3. Select your device from the list.<br>
            4. Data will stream automatically.  
          </div>
        `}
        <button class="ab-btn-connect" id="abBtConnectBtn" onclick="abBtConnect()"
                ${!supported ? 'disabled' : ''}>
            Scan &amp; Connect via Bluetooth
        </button>
        <button class="ab-btn-disconnect" id="abBtDisconnectBtn"
                style="display:none;margin-top:8px;" onclick="abBtDisconnect()">
          Disconnect
        </button>
      `;
    }

    else if (mode === 'wifi') {
      const apiUrl = (typeof API_URL !== 'undefined' ? API_URL : 'https://fchan.onrender.com/api');
      const key    = document.getElementById('abApiKey').value.trim() || 'YOUR_API_KEY';
      area.innerHTML = `
        <div style="background:var(--surface-2);border-radius:10px;padding:16px;margin-bottom:14px;">
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px;">
              Copy this code onto your Arduino WiFi sketch:
          </div>
          <div style="background:#0d1117;border-radius:8px;padding:12px;
                      font-family:monospace;font-size:11px;color:#c9d1d9;
                      line-height:1.7;position:relative;overflow-x:auto;white-space:pre;">
<span style="color:#8b949e">// Paste your WiFi credentials and upload to your ESP32/ESP8266</span>
<span style="color:#ff7b72">const char</span>* ssid    = <span style="color:#a5d6ff">"YOUR_WIFI_NAME"</span>;
<span style="color:#ff7b72">const char</span>* password= <span style="color:#a5d6ff">"YOUR_WIFI_PASSWORD"</span>;
<span style="color:#ff7b72">const char</span>* apiUrl  = <span style="color:#a5d6ff">"${apiUrl}/sensors/readings/ingest"</span>;
<span style="color:#ff7b72">const char</span>* apiKey  = <span style="color:#a5d6ff">"${key}"</span>;
          </div>
          <button onclick="abCopySketch()"
                  style="margin-top:10px;padding:8px 16px;background:var(--primary);
                         color:white;border:none;border-radius:8px;font-size:12px;
                         font-weight:600;cursor:pointer;width:100%;">
              Copy Full Sketch
          </button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">
          Once uploaded, your Arduino will automatically send readings every 30 seconds.
          No cables needed.  
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;">
            Test the connection:
          </div>
          <div style="display:flex;gap:8px;">
            <input type="number" id="abTestVal" placeholder="e.g. 28.5"
                   style="flex:1;padding:10px 14px;border:1px solid var(--border);
                          border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;">
            <button onclick="abWifiTest()"
                    style="padding:10px 18px;background:var(--primary);color:white;
                           border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">
              Send Test
            </button>
          </div>
          <div id="abWifiTestStatus" style="margin-top:8px;"></div>
        </div>
      `;
    }

    else if (mode === 'manual') {
      area.innerHTML = `
        <div style="background:var(--surface-2);border-radius:10px;padding:14px;
                    margin-bottom:14px;font-size:13px;color:var(--text-muted);line-height:1.6;">
          Type a reading value below and click <strong>Send</strong> to record it manually.
        </div>
        <div class="form-group">
          <label class="form-label">Reading Value</label>
          <input type="number" id="abManualVal" class="form-control"
                 placeholder="e.g. 28.5" step="0.01">
        </div>
        <button class="ab-btn-connect" onclick="abManualSend()">
            Send Reading
        </button>
        <div id="abManualStatus" style="margin-top:10px;"></div>
      `;
    }
  }

  // ── USB CONNECT ───────────────────────────────────
  window.abUsbConnect = async function () {
    if (!('serial' in navigator)) return;
    try {
      abSetStatus('abUsbStatus', 'loading', 'Asking for permission…');
      usbPort = await navigator.serial.requestPort();
      await usbPort.open({ baudRate: 9600 });
      isConnected = true;
      abSetStatus('abUsbStatus', 'ok', '  Connected — receiving data from Arduino');
      document.getElementById('abUsbConnectBtn').style.display    = 'none';
      document.getElementById('abUsbDisconnectBtn').style.display = 'block';
      document.getElementById('abLiveSection').style.display      = 'block';
      abLog('ok', 'Connected via USB');
      usbPort.addEventListener('disconnect', () => {
        abSetStatus('abUsbStatus', 'err', '⚠ Arduino disconnected');
        abUsbCleanup();
      });
      abUsbReadLoop();
    } catch (e) {
      if (e.name !== 'NotFoundError') {
        abSetStatus('abUsbStatus', 'err', 'Could not connect: ' + e.message);
        abLog('err', e.message);
      } else {
        abSetStatus('abUsbStatus', 'idle', 'No port selected');
      }
    }
  };

  async function abUsbReadLoop() {
    const dec = new TextDecoderStream();
    usbPort.readable.pipeTo(dec.writable);
    const reader = dec.readable
      .pipeThrough(new TransformStream(new ABLineTransformer()))
      .getReader();
    usbReader = reader;
    try {
      while (isConnected) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        counters.rx++;
        abUpdateCounters();
        abLog('rx', value);
        const p = abParseLine(value);
        if (p) {
          const ok = await abSendReading(p.val);
          if (ok) { counters.sent++; abLog('ok', `Saved: ${p.stype} = ${p.val}`); abUpdateReading(p.stype, p.val); }
          else    { counters.err++; abLog('err', 'API error'); }
          abUpdateCounters();
        }
      }
    } catch (e) { if (isConnected) { abSetStatus('abUsbStatus','err','Read error'); abUsbCleanup(); } }
  }

  window.abUsbDisconnect = async function () {
    isConnected = false;
    if (usbReader) { try { await usbReader.cancel(); } catch {} }
    if (usbPort)   { try { await usbPort.close();   } catch {} }
    abUsbCleanup();
  };

  function abUsbCleanup() {
    isConnected = false; usbPort = null; usbReader = null;
    const cb = document.getElementById('abUsbConnectBtn');
    const db = document.getElementById('abUsbDisconnectBtn');
    if (cb) cb.style.display = 'block';
    if (db) db.style.display = 'none';
    abSetStatus('abUsbStatus', 'idle', 'Disconnected');
  }

  // ── BLUETOOTH CONNECT ─────────────────────────────
  const NORDIC_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const NORDIC_CHAR    = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  window.abBtConnect = async function () {
    if (!('bluetooth' in navigator)) return;
    try {
      abSetStatus('abBtStatus', 'loading', 'Scanning for Bluetooth devices…');
      btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NORDIC_SERVICE] }],
        optionalServices: [NORDIC_SERVICE]
      }).catch(() => navigator.bluetooth.requestDevice({ acceptAllDevices: true }));

      abSetStatus('abBtStatus', 'loading', `Connecting to ${btDevice.name || 'device'}…`);
      const server  = await btDevice.gatt.connect();
      const service = await server.getPrimaryService(NORDIC_SERVICE)
        .catch(() => server.getPrimaryService(0xFFE0));
      btChar = await service.getCharacteristic(NORDIC_CHAR)
        .catch(() => service.getCharacteristic(0xFFE1));

      await btChar.startNotifications();
      let buf = '';
      btChar.addEventListener('characteristicvaluechanged', async (ev) => {
        buf += new TextDecoder().decode(ev.target.value);
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          abLog('rx', line.trim());
          const p = abParseLine(line.trim());
          if (p) {
            const ok = await abSendReading(p.val);
            if (ok) { abUpdateReading(p.stype, p.val); abLog('ok', `Saved: ${p.stype} = ${p.val}`); }
            else    { abLog('err', 'API error'); }
          }
        }
      });

      btDevice.addEventListener('gattserverdisconnected', () => {
        abSetStatus('abBtStatus', 'err', '⚠ Device disconnected');
        abBtCleanup();
      });

      isBtConnected = true;
      abSetStatus('abBtStatus', 'ok', `  Connected to ${btDevice.name || 'Arduino'}`);
      document.getElementById('abBtConnectBtn').style.display    = 'none';
      document.getElementById('abBtDisconnectBtn').style.display = 'block';
      document.getElementById('abLiveSection').style.display     = 'block';
    } catch (e) {
      if (e.name !== 'NotFoundError') {
        abSetStatus('abBtStatus', 'err', 'Could not connect: ' + e.message);
        abLog('err', e.message);
      } else {
        abSetStatus('abBtStatus', 'idle', 'No device selected');
      }
    }
  };

  window.abBtDisconnect = function () {
    if (btDevice && btDevice.gatt.connected) { try { btDevice.gatt.disconnect(); } catch {} }
    abBtCleanup();
  };

  function abBtCleanup() {
    isBtConnected = false; btDevice = null; btChar = null;
    const cb = document.getElementById('abBtConnectBtn');
    const db = document.getElementById('abBtDisconnectBtn');
    if (cb) cb.style.display = 'block';
    if (db) db.style.display = 'none';
    abSetStatus('abBtStatus', 'idle', 'Disconnected');
  }

  // ── WIFI TEST ─────────────────────────────────────
  window.abWifiTest = async function () {
    const val = parseFloat(document.getElementById('abTestVal').value);
    const st  = document.getElementById('abWifiTestStatus');
    if (isNaN(val)) { st.innerHTML = `<span style="color:var(--danger);font-size:12px;">Enter a number first.</span>`; return; }
    st.innerHTML = `<span style="color:var(--warning);font-size:12px;">Sending…</span>`;
    const ok = await abSendReading(val);
    st.innerHTML = ok
      ? `<span style="color:var(--success);font-size:12px;">  Test reading sent! Your connection works.</span>`
      : `<span style="color:var(--danger);font-size:12px;">  Failed — check your API key and server address.</span>`;
    if (ok) abUpdateReading('test', val);
  };

  // ── MANUAL SEND ───────────────────────────────────
  window.abManualSend = async function () {
    const val = parseFloat(document.getElementById('abManualVal').value);
    const st  = document.getElementById('abManualStatus');
    if (isNaN(val)) { st.innerHTML = `<span style="color:var(--danger);font-size:12px;">Enter a value first.</span>`; return; }
    st.innerHTML = `<span style="color:var(--warning);font-size:12px;">Saving…</span>`;
    const ok = await abSendReading(val);
    st.innerHTML = ok
      ? `<span style="color:var(--success);font-size:12px;">  Reading saved!</span>`
      : `<span style="color:var(--danger);font-size:12px;">  Error saving — check your API key.</span>`;
    if (ok) abUpdateReading('manual', val);
  };

  // ── COPY SKETCH ───────────────────────────────────
  window.abCopySketch = function () {
    const apiUrl = (typeof API_URL !== 'undefined' ? API_URL : 'https://fchan.onrender.com/api');
    const key    = document.getElementById('abApiKey').value.trim() || 'YOUR_API_KEY';
    const sketch = `// FCHAN WiFi Sensor Sketch — ESP32 / ESP8266
// Install libraries: WiFi (built-in), HTTPClient (built-in), DHT sensor library

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

const char* ssid     = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiUrl   = "${apiUrl}/sensors/readings/ingest";
const char* apiKey   = "${key}";

#define DHT_PIN  4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

void sendReading(float value) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  String body = "{\\"api_key\\":\\"" + String(apiKey) + "\\",\\"value\\":" + String(value) + "}";
  http.POST(body);
  http.end();
}

void setup() {
  Serial.begin(9600);
  dht.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nConnected: " + WiFi.localIP().toString());
}

void loop() {
  float temp = dht.readTemperature();
  if (!isnan(temp)) {
    sendReading(temp);
    Serial.println("TEMP:" + String(temp));
  }
  delay(30000); // every 30 seconds
}`;
    navigator.clipboard.writeText(sketch)
      .then(() => abShowToast('Sketch copied to clipboard!', 'success'))
      .catch(() => abShowToast('Could not copy — select and copy manually', 'warn'));
  };

  // ── KEY VISIBILITY TOGGLE ─────────────────────────
  window.abToggleKeyVisibility = function () {
    const inp = document.getElementById('abApiKey');
    const btn = document.getElementById('abKeyToggle');
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = ' '; }
    else                         { inp.type = 'password'; btn.textContent = ' '; }
  };

  // ── SEND READING ──────────────────────────────────
  async function abSendReading(value) {
    const key    = document.getElementById('abApiKey').value.trim();
    const apiUrl = (typeof API_URL !== 'undefined' ? API_URL : 'https://fchan.onrender.com/api')
                    .replace(/\/$/, '');
    if (!key) {
      abShowToast('Please paste your sensor API key at the top of this panel', 'warn');
      return false;
    }
    try {
      const res  = await fetch(`${apiUrl}/sensors/readings/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key, value: parseFloat(value),
                               recorded_at: new Date().toISOString() })
      });
      const data = await res.json();
      return !!(data && data.success);
    } catch (e) { abLog('err', e.message); return false; }
  }

  // ── PARSER ────────────────────────────────────────
  function abParseLine(line) {
    line = line.trim().replace(/\s*(°C|%|lux|ppm|pH|cm|m\/s|mm)\s*$/i, '');
    if (!line.includes(':')) return null;
    const idx   = line.lastIndexOf(':');
    const label = line.slice(0, idx).trim().toLowerCase();
    const val   = parseFloat(line.slice(idx + 1).trim());
    if (isNaN(val)) return null;
    const stype = SENSOR_MAP[label];
    return stype ? { stype, val } : null;
  }

  // ── UI HELPERS ────────────────────────────────────
  function abSetStatus(id, type, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `ab-status-bar ${type}`;
    el.innerHTML = `<span class="ab-dot"></span><span>${text}</span>`;
  }

  function abUpdateReading(stype, val) {
    const grid = document.getElementById('abReadingsGrid');
    if (!grid) return;
    const id = `abChip_${stype}`;
    let chip = document.getElementById(id);
    if (!chip) {
      chip = document.createElement('div');
      chip.id = id;
      chip.className = 'ab-reading-chip';
      grid.appendChild(chip);
    }
    chip.innerHTML = `
      <div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px;">
        ${stype.replace('_',' ')}
      </div>
      <div style="font-size:22px;font-weight:700;color:var(--primary);line-height:1;">
        ${parseFloat(val).toFixed(1)}
      </div>
      <div style="font-size:10px;color:var(--text-muted);">${SENSOR_UNITS[stype]||''}</div>
    `;
    document.getElementById('abLiveSection').style.display = 'block';
  }

  function abUpdateCounters() {
    const r = document.getElementById('abCntRx');
    const s = document.getElementById('abCntSent');
    const e = document.getElementById('abCntErr');
    if (r) r.textContent = counters.rx;
    if (s) s.textContent = counters.sent;
    if (e) e.textContent = counters.err;
  }

  function abLog(type, text) {
    const box = document.getElementById('abLog');
    if (!box) return;
    const p = document.createElement('p');
    p.className = `ab-log-line ${type}`;
    p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    box.appendChild(p);
    while (box.children.length > 150) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  function abShowToast(msg, type) {
    if (typeof showToast === 'function') { showToast(msg, type); return; }
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', bottom:'24px', right:'24px', zIndex:'9999',
      background: type === 'success' ? '#27ae60' : type === 'warn' ? '#f39c12' : '#e74c3c',
      color:'white', padding:'10px 18px', borderRadius:'10px',
      fontSize:'13px', fontWeight:'600', boxShadow:'0 4px 20px rgba(0,0,0,0.3)'
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // ── WEB SERIAL LINE TRANSFORMER ───────────────────
  class ABLineTransformer {
    constructor() { this.buf = ''; }
    transform(chunk, ctrl) {
      this.buf += chunk;
      const lines = this.buf.split('\n');
      this.buf = lines.pop();
      lines.forEach(l => ctrl.enqueue(l));
    }
    flush(ctrl) { ctrl.enqueue(this.buf); }
  }

})();
