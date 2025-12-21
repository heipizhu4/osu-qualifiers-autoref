const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendToMain: (msg) => ipcRenderer.send('msg-from-renderer', msg),
    getUpdateStatus: () => ipcRenderer.invoke('Update-request-from-renderer'),
    getServerStatus: () => ipcRenderer.invoke('Update-server-request-from-renderer'),
    getMainThreadStatus: () => ipcRenderer.invoke('Update-thread-request-from-renderer'),
    onUserMessage: (callback) => ipcRenderer.on('User-msg-from-main', (event, msg) => callback(msg)),
    onLogMessage: (callback) => ipcRenderer.on('Log-msg-from-main', (event, msg) => callback(msg)),
    onMapData: (callback) => ipcRenderer.on('Map-data-from-main', (event, msg) => callback(msg)),//
    onPlayerData: (callback) => ipcRenderer.on('Player-data-from-main', (event, msg) => callback(msg)),
    onServerStatusChange: (callback) => ipcRenderer.on('Server-status-from-main', (event, msg) => callback(msg)),
    onUpdateStatusChange: (callback) => ipcRenderer.on('Updating-status-from-main', (event, msg) => callback(msg))
});