import * as fs from 'fs';
import * as path from 'path';

import {
    desktopCapturer,
    ipcMain,
    BrowserWindow,
    Event,
    HandlerDetails,
} from 'electron';
import windowStateKeeper from 'electron-window-state';

import { initContextMenu } from './contextMenu';
import { createMenu } from './menu';
import {
    getAppIcon,
    getCounterValue,
    isOSX,
    nativeTabsSupported,
} from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import { IS_PLAYWRIGHT } from '../helpers/playwrightHelpers';
import { onNewWindow, setupWebtoappWindow } from '../helpers/windowEvents';
import {
    clearCache,
    createNewTab,
    getDefaultWindowOptions,
    hideWindow,
} from '../helpers/windowHelpers';
import {
    OutputOptions,
    outputOptionsToWindowOptions,
} from '../../../shared/src/options/model';

export const APP_ARGS_FILE_PATH = path.join(__dirname, '..', 'webtoapp.json');

/**
 * @param {{}} webtoappOptions AppArgs from webtoapp.json
 * @param {function} setDockBadge
 */
export async function createMainWindow(
    webtoappOptions: OutputOptions,
    setDockBadge: (value: number | string, bounce?: boolean) => void,
): Promise<BrowserWindow> {
    const options = { ...webtoappOptions };

    const mainWindowState = windowStateKeeper({
        defaultWidth: options.width || 1280,
        defaultHeight: options.height || 800,
    });

    const mainWindow = new BrowserWindow({
        frame: !options.hideWindowFrame,
        width: mainWindowState.width,
        height: mainWindowState.height,
        minWidth: options.minWidth,
        minHeight: options.minHeight,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        x: options.x,
        y: options.y,
        autoHideMenuBar: !options.showMenuBar,
        icon: getAppIcon(),
        fullscreen: options.fullScreen,
        // Whether the window should always stay on top of other windows. Default is false.
        alwaysOnTop: options.alwaysOnTop,
        titleBarStyle: options.titleBarStyle ?? 'default',
        // Maximize window visual glitch on Windows fix
        // We want a consistent behavior on all OSes, but Windows needs help to not glitch.
        // So, we manually mainWindow.show() later, see a few lines below
        show: options.tray !== 'start-in-tray' && process.platform !== 'win32',
        backgroundColor: options.backgroundColor,
        ...getDefaultWindowOptions(
            outputOptionsToWindowOptions(options, nativeTabsSupported()),
        ),
    });

    // Just load about:blank to start, gives playwright something to latch onto initially for testing.
    if (IS_PLAYWRIGHT) {
        await mainWindow.loadURL('about:blank');
    }

    mainWindowState.manage(mainWindow);

    // after first run, no longer force maximize to be true
    if (options.maximize) {
        mainWindow.maximize();
        options.maximize = undefined;
        saveAppArgs(options);
    }

    if (options.tray === 'start-in-tray') {
        mainWindow.hide();
    } else if (process.platform === 'win32') {
        // See other "Maximize window visual glitch on Windows fix" comment above.
        mainWindow.show();
    }

    const windowOptions = outputOptionsToWindowOptions(
        options,
        nativeTabsSupported(),
    );
    createMenu(options, mainWindow);
    createContextMenu(options, mainWindow);
    setupWebtoappWindow(windowOptions, mainWindow);

    // Note it is important to add these handlers only to the *main* window,
    // else we run into weird behavior like opening tabs twice
    mainWindow.webContents.setWindowOpenHandler((details: HandlerDetails) => {
        return onNewWindow(
            windowOptions,
            setupWebtoappWindow,
            details,
            mainWindow,
        );
    });
    mainWindow.on('new-window-for-tab', (event?: Event<{ url?: string }>) => {
        log.debug('mainWindow.new-window-for-tab', { event });
        createNewTab(
            windowOptions,
            setupWebtoappWindow,
            event?.url ?? options.targetUrl,
            true,
            // mainWindow,
        );
    });

    if (options.counter) {
        setupCounter(options, mainWindow, setDockBadge);
    } else {
        setupNotificationBadge(options, mainWindow, setDockBadge);
    }

    ipcMain.on('notification-click', () => {
        log.debug('ipcMain.notification-click');
        mainWindow.show();
    });

    setupSessionPermissionHandler(mainWindow);

    if (options.clearCache) {
        await clearCache(mainWindow);
    }

    setupCloseEvent(options, mainWindow);

    return mainWindow;
}

function createContextMenu(
    options: OutputOptions,
    window: BrowserWindow,
): void {
    if (!options.disableContextMenu) {
        initContextMenu(options, window);
    }
}

export function saveAppArgs(newAppArgs: OutputOptions): void {
    try {
        fs.writeFileSync(
            APP_ARGS_FILE_PATH,
            JSON.stringify(newAppArgs, null, 2),
        );
    } catch (err: unknown) {
        log.warn(
            `WARNING: Ignored webtoapp.json rewrital (${
                (err as Error).message
            })`,
        );
    }
}

function setupCloseEvent(options: OutputOptions, window: BrowserWindow): void {
    window.on('close', (event: Event) => {
        log.debug('mainWindow.close', event);
        if (window.isFullScreen()) {
            if (nativeTabsSupported()) {
                window.moveTabToNewWindow();
            }
            window.setFullScreen(false);
            window.once('will-resize', (event: Event) =>
                hideWindow(
                    window,
                    event,
                    options.fastQuit ?? false,
                    options.tray ?? 'false',
                ),
            );
        }
        hideWindow(
            window,
            event,
            options.fastQuit ?? false,
            options.tray ?? 'false',
        );

        if (options.clearCache) {
            clearCache(window).catch((err) =>
                log.error('clearCache ERROR', err),
            );
        }
    });
}

function setupCounter(
    options: OutputOptions,
    window: BrowserWindow,
    setDockBadge: (value: number | string, bounce?: boolean) => void,
): void {
    window.on('page-title-updated', (event, title) => {
        log.debug('mainWindow.page-title-updated', { event, title });
        const counterValue = getCounterValue(title);
        if (counterValue) {
            setDockBadge(counterValue, options.bounce);
        } else {
            setDockBadge('');
        }
    });
}

function setupSessionPermissionHandler(window: BrowserWindow): void {
    // Never grant every Chromium permission to arbitrary page JavaScript. The
    // previous implementation did so, which allowed a wrapped site to obtain
    // capabilities that were unrelated to the app. Keep the small set needed
    // for desktop UX and deny everything else by default.
    const allowedPermissions = new Set([
        'notifications',
        'fullscreen',
        'clipboard-sanitized-write',
    ]);
    const isAllowed = (permission: string): boolean =>
        allowedPermissions.has(permission);

    window.webContents.session.setPermissionCheckHandler(
        (_webContents, permission) => isAllowed(permission),
    );
    window.webContents.session.setPermissionRequestHandler(
        (_webContents, permission, callback) => {
            callback(isAllowed(permission));
        },
    );
    ipcMain.handle('desktop-capturer-get-sources', () => {
        return desktopCapturer.getSources({
            types: ['screen', 'window'],
        });
    });
}

function setupNotificationBadge(
    options: OutputOptions,
    window: BrowserWindow,
    setDockBadge: (value: number | string, bounce?: boolean) => void,
): void {
    ipcMain.on('notification', () => {
        log.debug('ipcMain.notification');
        if (!isOSX() || window.isFocused()) {
            return;
        }
        setDockBadge('•', options.bounce);
    });
    window.on('focus', () => {
        log.debug('mainWindow.focus');
        setDockBadge('');
    });
}
