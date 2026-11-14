'use strict';

const { contextBridge, ipcRenderer } = require('electron');

let stopLightingHandler = null;
ipcRenderer.on('desktop:request-stop-lighting', async () => {
  if (typeof stopLightingHandler === 'function') {
    try { await stopLightingHandler(); }
    finally { ipcRenderer.send('desktop:stop-lighting-complete'); }
  } else {
    ipcRenderer.send('desktop:stop-lighting-complete');
  }
});

contextBridge.exposeInMainWorld('aulaDesktop', Object.freeze({
  isDesktop: true,
  setLightingState(active, effectName = '') {
    ipcRenderer.send('desktop:lighting-state', {
      active: Boolean(active),
      effectName: String(effectName).slice(0, 80)
    });
  },
  onStopLighting(handler) {
    stopLightingHandler = typeof handler === 'function' ? handler : null;
  },
  completeStopLighting() {
    ipcRenderer.send('desktop:stop-lighting-complete');
  },
  getRuntimeInfo() {
    return ipcRenderer.invoke('desktop:runtime-info');
  },
  onWindowFocus(callback) {
    const listener = (_event, payload) => {
      if (typeof callback === 'function') callback(Boolean(payload?.focused));
    };
    ipcRenderer.on('desktop:window-focus', listener);
    return () => ipcRenderer.removeListener('desktop:window-focus', listener);
  },
  setReactiveCapture(enabled) {
    ipcRenderer.send('desktop:set-reactive-capture', { enabled: Boolean(enabled) });
  },
  onGlobalKeydown(callback) {
    const listener = (_event, payload) => {
      if (typeof callback === 'function') callback(Number(payload?.hidUsage));
    };
    ipcRenderer.on('desktop:global-keydown', listener);
    return () => ipcRenderer.removeListener('desktop:global-keydown', listener);
  },
  onReactiveInputStatus(callback) {
    const listener = (_event, payload) => {
      if (typeof callback === 'function') callback({ active: Boolean(payload?.active), error: String(payload?.error || '') });
    };
    ipcRenderer.on('desktop:reactive-input-status', listener);
    return () => ipcRenderer.removeListener('desktop:reactive-input-status', listener);
  }
}));