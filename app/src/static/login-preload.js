const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webtoappLogin', {
    submit(username, password) {
        ipcRenderer.send('login-message', [username, password]);
    },
});
