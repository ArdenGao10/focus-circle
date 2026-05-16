// Preload — bridges the sandboxed renderer to the main process.
// Exposes a minimal API the web app uses to report timer state.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronBall', {
  setActive: (active) => ipcRenderer.send('ball:set-active', Boolean(active)),
})
