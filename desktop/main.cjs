'use strict';

const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const APP_ID = 'com.aulastudio.f75max';
const VID = 0x0c45;
const PID = 0x800a;
// A fixed origin keeps localStorage and granted WebHID permission stable across
// restarts. The server binds to loopback only and serves only packaged files.
const STUDIO_PORT = 48675;
const STUDIO_HOST = '127.0.0.1';
let mainWindow = null;
let tray = null;
let quitting = false;
let quitInProgress = false;
let localServer = null;
let localOrigin = null;
let lightingActive = false;
let activeEffectName = '';
let stopLightingResolver = null;
let mainLogPath = null;
let reactiveCaptureEnabled = false;
let reactiveHook = null;
let reactiveHookStarted = false;
let reactiveHookListenerInstalled = false;
let reactiveHookKeyNameByCode = null;

app.setAppUserModelId(APP_ID);
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// This keyboard presents a composite HID device. Chromium's default HID
// blocklist can hide the vendor-defined configuration collection on some
// Windows builds. Access remains restricted below to AULA VID/PID 0C45:800A
// and this app's loopback origin.
app.commandLine.appendSwitch('disable-hid-blocklist');

function mainLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try { if (mainLogPath) fs.appendFileSync(mainLogPath, line, 'utf8'); } catch {}
}


const REACTIVE_INPUT_MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reactive-key-map.json'), 'utf8'));

function notifyReactiveInputStatus(active, error = '') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('desktop:reactive-input-status', { active: Boolean(active), error: String(error || '') });
  }
}

function stopReactiveKeyboardCapture() {
  reactiveCaptureEnabled = false;
  if (reactiveHook && reactiveHookStarted) {
    try { reactiveHook.stop(); } catch (error) { mainLog(`Global keyboard hook stop warning: ${error?.message || error}`); }
  }
  reactiveHookStarted = false;
  notifyReactiveInputStatus(false);
}

function startReactiveKeyboardCapture() {
  if (process.platform !== 'win32') {
    notifyReactiveInputStatus(false, 'Global reactive keyboard input is currently supported only by the Windows desktop driver.');
    return;
  }
  try {
    if (!reactiveHook) {
      // Loaded only after the user starts a reactive hardware effect and accepts
      // the warning. No key text is captured or stored; only HID usage IDs that
      // map to this keyboard layout are forwarded to the renderer.
      const hookModule = require('uiohook-napi');
      reactiveHook = hookModule.uIOhook;
      const enumObject = hookModule.UiohookKey || {};
      reactiveHookKeyNameByCode = new Map(Object.entries(enumObject).map(([name, value]) => [Number(value), name]));
      if (!reactiveHook || typeof reactiveHook.on !== 'function' || typeof reactiveHook.start !== 'function') {
        throw new Error('The uiohook-napi native keyboard listener did not expose its expected API. Rebuild the desktop app dependencies.');
      }
      if (!reactiveHookListenerInstalled) {
        reactiveHook.on('keydown', event => {
          if (!reactiveCaptureEnabled) return;
          const name = reactiveHookKeyNameByCode?.get(Number(event?.keycode));
          const hidUsage = REACTIVE_INPUT_MAP.uiohookNameToHidUsage?.[name];
          if (!Number.isInteger(hidUsage)) return;
          if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
          // Send only a layout usage number, never text, modifiers, or a key log.
          mainWindow.webContents.send('desktop:global-keydown', { hidUsage });
        });
        reactiveHookListenerInstalled = true;
      }
    }
    reactiveCaptureEnabled = true;
    if (!reactiveHookStarted) {
      reactiveHook.start();
      reactiveHookStarted = true;
    }
    mainLog('Global reactive key-position capture enabled (no text recording).');
    notifyReactiveInputStatus(true);
  } catch (error) {
    reactiveCaptureEnabled = false;
    reactiveHookStarted = false;
    const message = `${error?.message || error}. Reactive effects will only respond while the Studio window has focus until this native input component is installed correctly.`;
    mainLog(`Global reactive keyboard hook failed: ${message}`);
    notifyReactiveInputStatus(false, message);
  }
}

function makeTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="4" y="8" width="56" height="48" rx="10" fill="#171922" stroke="#8871d9" stroke-width="3"/><g fill="#c9bbff"><rect x="12" y="17" width="8" height="7" rx="2"/><rect x="23" y="17" width="8" height="7" rx="2"/><rect x="34" y="17" width="8" height="7" rx="2"/><rect x="45" y="17" width="8" height="7" rx="2"/><rect x="12" y="28" width="8" height="7" rx="2"/><rect x="23" y="28" width="8" height="7" rx="2"/><rect x="34" y="28" width="8" height="7" rx="2"/><rect x="45" y="28" width="8" height="7" rx="2"/><rect x="17" y="39" width="30" height="7" rx="2"/></g></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function isAulaVidPid(device) {
  return Boolean(device && Number(device.vendorId) === VID && Number(device.productId) === PID);
}

function collectionsOf(device) {
  const stack = [...(Array.isArray(device?.collections) ? device.collections : [])];
  const flat = [];
  while (stack.length) {
    const collection = stack.shift();
    if (!collection) continue;
    flat.push(collection);
    if (Array.isArray(collection.children)) stack.push(...collection.children);
  }
  return flat;
}

function hasAulaCommandCollection(device) {
  return collectionsOf(device).some(collection =>
    Number(collection.usagePage) === 0xff13 && Number(collection.usage) === 0x0001
  );
}

function isStudioOrigin(value) {
  try {
    const origin = new URL(value);
    return origin.protocol === 'http:' && origin.hostname === STUDIO_HOST && origin.port === String(STUDIO_PORT);
  } catch { return false; }
}

function describeHidDevice(device) {
  const collections = collectionsOf(device).map(c =>
    `0x${Number(c.usagePage || 0).toString(16)}:0x${Number(c.usage || 0).toString(16)}`
  );
  return `${device?.productName || 'HID device'} ${Number(device?.vendorId || 0).toString(16)}:${Number(device?.productId || 0).toString(16)} collections=[${collections.join(',') || 'not exposed'}]`;
}

function configureWebHidPermissions(ses) {
  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    if (permission !== 'hid') return false;
    const allowed = isStudioOrigin(requestingOrigin);
    if (!allowed) mainLog(`Denied HID permission check for ${String(requestingOrigin)}.`);
    return allowed;
  });

  // Electron may provide a reduced device descriptor to this callback. Check
  // the USB identity here; the renderer performs the stricter FF13/0001
  // collection validation before opening and sending any report.
  ses.setDevicePermissionHandler(details => {
    const allowed = details?.deviceType === 'hid' && isStudioOrigin(details.origin) && isAulaVidPid(details.device);
    if (details?.deviceType === 'hid') mainLog(`${allowed ? 'Allowed' : 'Denied'} HID device permission: ${describeHidDevice(details.device)} origin=${details.origin || 'unknown'}`);
    return allowed;
  });

  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    const offered = Array.isArray(details.deviceList) ? details.deviceList : [];
    const candidates = offered.filter(isAulaVidPid);
    // Some Electron/Chromium builds pass device descriptors here without their
    // collection tree. Prefer FF13:0001 when present; otherwise pass the AULA
    // VID/PID candidate to the renderer, which performs the strict validation.
    const selected = candidates.find(hasAulaCommandCollection) || candidates[0];
    mainLog(`HID chooser requested; ${offered.length} device(s) offered; AULA candidate(s): ${candidates.length}. ${offered.map(describeHidDevice).join(' || ') || 'Device list empty.'}`);
    if (selected) mainLog(`Selected HID device: ${describeHidDevice(selected)}; exact FF13 match visible to main=${hasAulaCommandCollection(selected)}.`);
    callback(selected?.deviceId);
  });
  ses.on('hid-device-added', (_event, details) => mainLog(`HID device added while chooser open: ${describeHidDevice(details?.device)}.`));
  ses.on('hid-device-removed', (_event, details) => mainLog(`HID device removed while chooser open: ${describeHidDevice(details?.device)}.`));
}

function requestRendererStop(timeoutMs = 3500) {
  if (!lightingActive || !mainWindow || mainWindow.isDestroyed()) return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stopLightingResolver = null;
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    stopLightingResolver = finish;
    mainWindow.webContents.send('desktop:request-stop-lighting');
  });
}

async function quitSafely() {
  if (quitInProgress) return;
  quitInProgress = true;
  await requestRendererStop();
  quitting = true;
  app.quit();
}

function showWindow() {
  if (!mainWindow) createWindow(true);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function updateTrayMenu() {
  if (!tray) return;
  const startup = app.getLoginItemSettings().openAtLogin;
  const statusLabel = lightingActive
    ? `Lighting active · ${activeEffectName || 'Custom effect'}`
    : 'Lighting stopped';
  tray.setToolTip(lightingActive
    ? `AULA F75 Max Studio — ${activeEffectName || 'Custom effect'} running`
    : 'AULA F75 Max Studio — ready');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open AULA F75 Max Studio', click: showWindow },
    { label: 'Hide to tray', click: () => mainWindow && mainWindow.hide(), enabled: !!mainWindow },
    { type: 'separator' },
    { label: statusLabel, enabled: false },
    { label: 'Stop real-time lighting', click: () => requestRendererStop(), enabled: lightingActive },
    { type: 'separator' },
    { label: 'Run at Windows sign-in', type: 'checkbox', checked: startup, click: item => {
      app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true });
      mainLog(`Run at sign-in ${item.checked ? 'enabled' : 'disabled'}.`);
      updateTrayMenu();
    } },
    { type: 'separator' },
    { label: 'Quit and restore keyboard lighting', click: quitSafely }
  ]));
}

function createTray() {
  if (tray) return;
  tray = new Tray(makeTrayIcon());
  tray.setToolTip('AULA F75 Max Studio — ready');
  tray.on('double-click', showWindow);
  tray.on('click', (_event, bounds) => {
    if (process.platform !== 'win32') showWindow();
  });
  updateTrayMenu();
}

function startLocalUiServer() {
  const root = path.resolve(__dirname, '..');
  const mime = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
  };
  localServer = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) { res.writeHead(405).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url || '/', `http://${STUDIO_HOST}:${STUDIO_PORT}`).pathname); }
    catch { res.writeHead(400).end(); return; }
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(); return; }
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
      });
      if (req.method === 'HEAD') res.end(); else res.end(data);
    });
  });
  localServer.keepAliveTimeout = 5000;
  localServer.headersTimeout = 6000;
  return new Promise((resolve, reject) => {
    localServer.once('error', error => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Local Studio port ${STUDIO_PORT} is already in use. Close an older AULA Studio process and try again.`));
      } else reject(error);
    });
    localServer.listen(STUDIO_PORT, STUDIO_HOST, () => {
      localOrigin = `http://${STUDIO_HOST}:${STUDIO_PORT}`;
      resolve(localOrigin);
    });
  });
}

function createWindow(showOnReady = true) {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: '#101117',
    title: 'AULA F75 Max Studio',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  configureWebHidPermissions(mainWindow.webContents.session);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!localOrigin || !url.startsWith(localOrigin + '/') && url !== localOrigin) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => { if (showOnReady && mainWindow && !mainWindow.isDestroyed()) mainWindow.show(); });
  mainWindow.on('close', event => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    mainLog(`Renderer process exited: ${JSON.stringify(details)}. A live effect may have stopped; reopen Studio and reconnect.`);
    stopReactiveKeyboardCapture();
    lightingActive = false;
    activeEffectName = '';
    updateTrayMenu();
  });
  if (!localOrigin) throw new Error('Local Studio server has not started.');
  mainWindow.loadURL(localOrigin);
  createTray();
  return mainWindow;
}

ipcMain.on('desktop:set-reactive-capture', (_event, payload) => {
  const enabled = Boolean(payload?.enabled);
  if (enabled) startReactiveKeyboardCapture();
  else stopReactiveKeyboardCapture();
});

ipcMain.on('desktop:lighting-state', (_event, payload) => {
  lightingActive = Boolean(payload?.active);
  activeEffectName = lightingActive ? String(payload?.effectName || 'Custom effect').slice(0, 80) : '';
  mainLog(lightingActive ? `Real-time lighting started: ${activeEffectName}` : 'Real-time lighting stopped.');
  updateTrayMenu();
});
ipcMain.on('desktop:stop-lighting-complete', () => {
  lightingActive = false;
  activeEffectName = '';
  updateTrayMenu();
  if (stopLightingResolver) stopLightingResolver();
});
ipcMain.handle('desktop:runtime-info', () => ({
  isDesktop: true,
  version: app.getVersion(),
  userDataPath: app.getPath('userData'),
  stableOrigin: localOrigin
}));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.whenReady().then(async () => {
    mainLogPath = path.join(app.getPath('userData'), 'studio.log');
    await startLocalUiServer();
    const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin === true;
    createWindow(!openedAtLogin);
    app.on('activate', showWindow);
    mainLog(`AULA F75 Max Studio ${app.getVersion()} started on ${localOrigin}; launchedAtLogin=${openedAtLogin}.`);
  }).catch(error => {
    mainLog(`Startup failed: ${error.stack || error.message}`);
    const { dialog } = require('electron');
    dialog.showErrorBox('AULA F75 Max Studio could not start', error.message || String(error));
    app.quit();
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => {
    stopReactiveKeyboardCapture();
    if (tray) tray.destroy();
    if (localServer) localServer.close();
  });
  app.on('window-all-closed', () => {});
}