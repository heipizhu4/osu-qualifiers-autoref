const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendToMain: (msg) => ipcRenderer.send('msg-from-renderer', msg),
    onMainMessage: (callback) => ipcRenderer.on('msg-from-main', (event, msg) => callback(msg))
});
