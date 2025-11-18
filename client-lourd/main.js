// main.js
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

    // Quand la fenêtre principale se ferme, on ferme aussi le popup
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

// ----- IPC RELAY ------

// Ouvrir le popup (main window → main process)
ipcMain.on('popup:open', (_event, context) => {
    createPopup(context);
});

// POPUP → MAIN WINDOW : "donne-moi les channels"
ipcMain.on('popup:request-channels', () => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:get-channels');
    }
});

ipcMain.on('popup:request-chat-on-init', (_event, roomId) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:set-chat-on-init', roomId);
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
// MAIN WINDOW → POPUP : "voilà les channels"
ipcMain.on('main:reply-channels', (_event, channels) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:channels', channels);
    }
});

// POPUP → MAIN WINDOW : "envoie ce message au serveur"
ipcMain.on('popup:send-message', (_event, context) => {
    if (appWindow && !appWindow.isDestroyed()) {
        appWindow.webContents.send('main:send-message-from-popup', context);
    }
});

// MAIN WINDOW → POPUP : "nouveau message reçu du serveur"
ipcMain.on('main:new-message', (_event, message) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.webContents.send('popup:new-message', message);
    }
});

// ---- CYCLE APP ----

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
