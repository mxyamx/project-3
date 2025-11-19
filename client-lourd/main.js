const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let appWindow;
let popupWindow;
let isQuitting = false;
let lastPopupContext = null;

function initWindow() {
    appWindow = new BrowserWindow({
        height: 800,
        width: 1000,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    const mainPath = `file://${__dirname}/dist/client/index.html`;
    appWindow.loadURL(mainPath);

    appWindow.setMenuBarVisibility(false);

    appWindow.on('close', () => {
        isQuitting = true;
        if (popupWindow && !popupWindow.isDestroyed()) {
            popupWindow.close();
        }
    });

    appWindow.on('closed', () => {
        appWindow = null;
    });
}

function createPopup(context) {
    lastPopupContext = context;

    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.focus();
        if (lastPopupContext) {
            popupWindow.webContents.send('popup:init-context', lastPopupContext);
        }
        return;
    }

    popupWindow = new BrowserWindow({
        width: 450,
        height: 600,
        parent: appWindow,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    const popupPath = `file://${__dirname}/dist/client/index.html#popup`;
    popupWindow.loadURL(popupPath);

    popupWindow.setMenuBarVisibility(false);

    popupWindow.on('close', () => {
        if (!isQuitting && appWindow && !appWindow.isDestroyed()) {
            appWindow.webContents.send('popup:closed');
        }
    });

    popupWindow.on('closed', () => {
        popupWindow = null;
        lastPopupContext = null;
    });

    popupWindow.webContents.once('did-finish-load', () => {
        if (lastPopupContext) {
            popupWindow.webContents.send('popup:init-context', lastPopupContext);
        }
    });
}

ipcMain.on('popup:open', (_event, context) => {
    createPopup(context);
});

ipcMain.on('popup:request-channels', () => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:get-channels');
    }
});

ipcMain.on('popup:request-search-channels', (_event, input) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:get-search-channels', input);
    }
});

ipcMain.on('popup:request-delete-channel', (_event, id) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:delete-channel', id);
    }
});

ipcMain.on('popup:request-leave-channel', (_event, id) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:leave-channel', id);
    }
});
ipcMain.on('popup:request-join-channel', (_event, id) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:join-channel', id);
    }
});

ipcMain.on('popup:request-chat-on-init', (_event, roomId) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:set-chat-on-init', roomId);
    }
});

ipcMain.on('popup:request-chat-on-destroy', (_event, roomId) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:set-chat-on-destroy', roomId);
    }
});

ipcMain.on('main:send-chat-on-init-done', (_event, context) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:chat-on-init-context', context);
    }
});

ipcMain.on('main:send-chat-history', (_event, messages) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:chat-history', messages);
    }
});

ipcMain.on('main:reply-channels', (_event, channels) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:channels', channels);
    }
});

ipcMain.on('main:reply-search-channels', (_event, channels) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:search-channels', channels);
    }
});

ipcMain.on('main:server-error', (_event, data) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:popup:server-error', data);
    }
});

ipcMain.on('popup:send-message', (_event, context) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:send-message-from-popup', context);
    }
});

ipcMain.on('main:new-message', (_event, message) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:new-message', message);
    }
});

app.on('ready', initWindow);

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (appWindow === null) {
        initWindow();
    }
});
