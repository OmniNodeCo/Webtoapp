import * as path from 'path';

import { BrowserWindow, ipcMain } from 'electron';

import * as log from '../helpers/loggingHelper';
import { nativeTabsSupported } from '../helpers/helpers';

export async function createLoginWindow(
    loginCallback: (username?: string, password?: string) => void,
    parent?: BrowserWindow,
): Promise<BrowserWindow> {
    log.debug('createLoginWindow', {
        loginCallback,
        parent,
    });

    const loginWindow = new BrowserWindow({
        parent: nativeTabsSupported() ? undefined : parent,
        width: 300,
        height: 400,
        frame: false,
        resizable: false,
        webPreferences: {
            // The login form is local HTML. Use a tiny context-isolated
            // bridge instead of granting the form Node integration.
            preload: path.join(__dirname, 'static/login-preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    });

    const onLoginMessage = (
        event: Electron.IpcMainEvent,
        usernameAndPassword: unknown,
    ): void => {
        if (event.sender !== loginWindow.webContents) {
            return;
        }
        if (
            !Array.isArray(usernameAndPassword) ||
            usernameAndPassword.length !== 2 ||
            !usernameAndPassword.every((value) => typeof value === 'string')
        ) {
            log.warn('Ignoring malformed credentials message');
            return;
        }

        const [username, password] = usernameAndPassword as [string, string];
        log.debug('login-message', { username });
        ipcMain.removeListener('login-message', onLoginMessage);
        loginCallback(username, password);
        loginWindow.close();
    };

    ipcMain.on('login-message', onLoginMessage);
    loginWindow.once('closed', () => {
        ipcMain.removeListener('login-message', onLoginMessage);
    });

    await loginWindow.loadURL(
        `file://${path.join(__dirname, 'static/login.html')}`,
    );
    return loginWindow;
}
