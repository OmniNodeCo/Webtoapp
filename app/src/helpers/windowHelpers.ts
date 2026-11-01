import path from 'path';

import {
    dialog,
    BrowserWindow,
    BrowserWindowConstructorOptions,
    Event,
    MessageBoxReturnValue,
    WebPreferences,
    OnResponseStartedListenerDetails,
} from 'electron';

import {
    getCSSToInject,
    getJSToInject,
    isOSX,
    nativeTabsSupported,
} from './helpers';
import * as log from './loggingHelper';
import { TrayValue, WindowOptions } from '../../../shared/src/options/model';
import { randomUUID } from 'crypto';

const ZOOM_INTERVAL = 0.1;

export function adjustWindowZoom(adjustment: number): void {
    withFocusedWindow((focusedWindow: BrowserWindow) => {
        focusedWindow.webContents.zoomFactor =
            focusedWindow.webContents.zoomFactor + adjustment;
    });
}

export function showNavigationBlockedMessage(
    message: string,
): Promise<MessageBoxReturnValue> {
    return new Promise((resolve, reject) => {
        withFocusedWindow((focusedWindow) => {
            dialog
                .showMessageBox(focusedWindow, {
                    message,
                    type: 'error',
                    title: 'Navigation blocked',
                })
                .then((result) => resolve(result))
                .catch((err) => {
                    reject(err);
                });
        });
    });
}

export async function clearAppData(window: BrowserWindow): Promise<void> {
    const response = await dialog.showMessageBox(window, {
        type: 'warning',
        buttons: ['Yes', 'Cancel'],
        defaultId: 1,
        title: 'Clear cache confirmation',
        message:
            'This will clear all data (cookies, local storage etc) from this app. Are you sure you wish to proceed?',
    });

    if (response.response !== 0) {
        return;
    }
    await clearCache(window);
}

export async function clearCache(window: BrowserWindow): Promise<void> {
    const { session } = window.webContents;
    await session.clearStorageData();
    await session.clearCache();
}

export function createAboutBlankWindow(
    options: WindowOptions,
    setupWindow: (options: WindowOptions, window: BrowserWindow) => void,
    parent?: BrowserWindow,
): BrowserWindow {
    const window = createNewWindow(
        { ...options, show: false },
        setupWindow,
        'about:blank',
        nativeTabsSupported() ? undefined : parent,
    );
    window.webContents.once('did-stop-loading', () => {
        if (window.webContents.getURL() === 'about:blank') {
            window.close();
        } else {
            window.show();
        }
    });
    return window;
}

export function createNewTab(
    options: WindowOptions,
    setupWindow: (options: WindowOptions, window: BrowserWindow) => void,
    url: string,
    foreground: boolean,
): BrowserWindow | undefined {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    log.debug('createNewTab', {
        url,
        foreground,
        focusedWindow,
    });
    return withFocusedWindow((focusedWindow) => {
        const newTab = createNewWindow(options, setupWindow, url);
        log.debug('createNewTab.withFocusedWindow', { focusedWindow, newTab });
        focusedWindow.addTabbedWindow(newTab);
        if (!foreground) {
            focusedWindow.focus();
        }
        return newTab;
    });
}

export function createNewWindow(
    options: WindowOptions,
    setupWindow: (options: WindowOptions, window: BrowserWindow) => void,
    url: string,
    parent?: BrowserWindow,
): BrowserWindow {
    log.debug('createNewWindow', {
        url,
        parent,
    });
    const window = new BrowserWindow({
        parent: nativeTabsSupported() ? undefined : parent,
        ...getDefaultWindowOptions(options),
    });
    setupWindow(options, window);
    window.loadURL(url).catch((err) => log.error('window.loadURL ERROR', err));
    return window;
}

export function getCurrentURL(): string {
    return withFocusedWindow((focusedWindow) =>
        focusedWindow.webContents.getURL(),
    ) as unknown as string;
}

export function getDefaultWindowOptions(
    options: WindowOptions,
): BrowserWindowConstructorOptions {
    const browserwindowOptions: BrowserWindowConstructorOptions = {
        ...options.browserwindowOptions,
    };
    // We're going to remove this and merge it separately into DEFAULT_WINDOW_OPTIONS.webPreferences
    // Otherwise the browserwindowOptions.webPreferences object will completely replace the
    // webPreferences specified in the DEFAULT_WINDOW_OPTIONS with itself
    delete browserwindowOptions.webPreferences;

    // BrowserWindow options are intentionally extensible, but page-provided
    // config must not be able to turn on Node integration or replace the
    // preload script. Those settings would make an XSS in the wrapped site a
    // local code-execution primitive.
    const requestedWebPreferences =
        options.browserwindowOptions?.webPreferences ?? {};
    const webPreferences: WebPreferences = {
        ...requestedWebPreferences,
        javascript: true,
        nodeIntegration: false,
        nodeIntegrationInSubFrames: false,
        preload: path.join(__dirname, 'preload.js'),
        plugins: true,
        // The preload only uses Electron's contextBridge/ipcRenderer APIs, so
        // keep it sandboxed as an additional defense in depth layer.
        sandbox: true,
        webSecurity: !options.insecure,
        allowRunningInsecureContent: options.insecure,
        zoomFactor: options.zoom,
        contextIsolation: true,
    };

    const defaultOptions: BrowserWindowConstructorOptions = {
        autoHideMenuBar: options.autoHideMenuBar,
        fullscreenable: true,
        tabbingIdentifier: nativeTabsSupported()
            ? options.tabbingIdentifier ?? randomUUID()
            : undefined,
        title: options.name,
        webPreferences,
        ...browserwindowOptions,
    };

    log.debug('getDefaultWindowOptions', {
        options,
        webPreferences,
        defaultOptions,
    });

    return defaultOptions;
}

export function goBack(): void {
    log.debug('onGoBack');
    withFocusedWindow((focusedWindow) => {
        focusedWindow.webContents.goBack();
    });
}

export function goForward(): void {
    log.debug('onGoForward');
    withFocusedWindow((focusedWindow) => {
        focusedWindow.webContents.goForward();
    });
}

export function goToURL(url: string): Promise<void> | undefined {
    return withFocusedWindow((focusedWindow) => focusedWindow.loadURL(url));
}

export function hideWindow(
    window: BrowserWindow,
    event: Event,
    fastQuit: boolean,
    tray: TrayValue,
): void {
    if (isOSX() && !fastQuit) {
        // this is called when exiting from clicking the cross button on the window
        event.preventDefault();
        window.hide();
    } else if (!fastQuit && tray !== 'false') {
        event.preventDefault();
        window.hide();
    }
    // will close the window on other platforms
}

const PAGE_BRIDGE_SCRIPT = `(() => {
    const bridge = window.webtoappBridge;
    if (!bridge || window.__webtoappBridgeInstalled) {
        return;
    }
    window.__webtoappBridgeInstalled = true;

    // Electron's desktop-capturer API is only available in the preload. Keep
    // getDisplayMedia usable in the page world by passing serializable source
    // information across the narrow bridge and using the page's own
    // getUserMedia implementation for the selected source.
    const mediaDevices = navigator.mediaDevices;
    if (
        mediaDevices &&
        bridge.requestDesktopSources &&
        typeof mediaDevices.getUserMedia === 'function'
    ) {
        const chooseDesktopSource = () =>
            bridge.requestDesktopSources().then((sources) => {
                if (!sources.length) {
                    throw new Error('No desktop capture sources are available');
                }
                if (sources.length === 1) {
                    return sources[0];
                }

                return new Promise((resolve, reject) => {
                    const overlay = document.createElement('div');
                    overlay.setAttribute('role', 'dialog');
                    overlay.setAttribute('aria-label', 'Choose what to share');
                    overlay.style.cssText =
                        'position:fixed;inset:0;z-index:2147483647;' +
                        'background:rgba(0,0,0,.78);color:white;padding:32px;' +
                        'font:16px sans-serif;overflow:auto;';

                    const heading = document.createElement('h2');
                    heading.textContent = 'Choose what to share';
                    overlay.appendChild(heading);

                    const close = document.createElement('button');
                    close.type = 'button';
                    close.textContent = 'Cancel';
                    close.style.cssText = 'float:right;padding:8px 16px;';
                    close.addEventListener('click', () => {
                        overlay.remove();
                        reject(new Error('Screen share was cancelled'));
                    });
                    overlay.appendChild(close);

                    const list = document.createElement('div');
                    list.style.cssText =
                        'display:flex;flex-wrap:wrap;gap:12px;clear:both;';
                    sources.forEach((source) => {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.style.cssText =
                            'display:flex;flex-direction:column;gap:6px;' +
                            'width:180px;padding:8px;background:#333;color:white;' +
                            'border:1px solid #888;border-radius:4px;text-align:left;';
                        const thumbnail = document.createElement('img');
                        thumbnail.alt = source.name;
                        thumbnail.src = source.thumbnail;
                        thumbnail.style.cssText =
                            'width:164px;height:92px;object-fit:cover;';
                        const label = document.createElement('span');
                        label.textContent = source.name;
                        button.append(thumbnail, label);
                        button.addEventListener('click', () => {
                            overlay.remove();
                            resolve(source);
                        });
                        list.appendChild(button);
                    });
                    overlay.appendChild(list);
                    (document.body || document.documentElement).appendChild(overlay);
                });
            });

        const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
        const displayMedia = async () => {
            const source = await chooseDesktopSource();
            return getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                    },
                },
            });
        };
        try {
            Object.defineProperty(mediaDevices, 'getDisplayMedia', {
                configurable: true,
                enumerable: true,
                writable: true,
                value: displayMedia,
            });
        } catch (_) {
            // Older Chromium builds may expose a non-configurable property.
            // Leave their native implementation in place in that case.
        }
    }

    const OriginalNotification = window.Notification;
    if (OriginalNotification) {
        const WebtoappNotification = function (title, options) {
            bridge.notify(title, options || {});
            const notification = new OriginalNotification(title, options);
            notification.addEventListener('click', () => bridge.notificationClick());
            return notification;
        };
        WebtoappNotification.requestPermission =
            OriginalNotification.requestPermission.bind(OriginalNotification);
        Object.defineProperty(WebtoappNotification, 'permission', {
            get: () => OriginalNotification.permission,
        });
        window.Notification = WebtoappNotification;
    }
})();`;

/**
 * Install the page-facing bridge and run requested JavaScript in the page's
 * main world. The preload remains context-isolated, so injected code cannot
 * reach Node or ipcRenderer directly.
 */
export function injectJavaScript(browserWindow: BrowserWindow): void {
    const scripts = getJSToInject() ?? [];
    browserWindow.webContents.on('did-finish-load', () => {
        browserWindow.webContents
            .executeJavaScript(PAGE_BRIDGE_SCRIPT, true)
            .then(async () => {
                for (const script of scripts) {
                    await browserWindow.webContents.executeJavaScript(
                        script,
                        true,
                    );
                }
            })
            .catch((err: unknown) =>
                log.error('webContents.executeJavaScript injection', err),
            );
    });
}

export function injectCSS(browserWindow: BrowserWindow): void {
    const cssToInject = getCSSToInject();

    if (!cssToInject) {
        return;
    }

    browserWindow.webContents.on('did-navigate', () => {
        log.debug(
            'browserWindow.webContents.did-navigate',
            browserWindow.webContents.getURL(),
        );

        browserWindow.webContents
            .insertCSS(cssToInject)
            .catch((err: unknown) =>
                log.error('browserWindow.webContents.insertCSS', err),
            );
    });

    // Register this once, rather than once per navigation. The old placement
    // leaked a listener on every reload and eventually injected the same CSS
    // many times. Restrict the filter to document-like network requests and
    // ensure a window only modifies its own web contents.
    browserWindow.webContents.session.webRequest.onResponseStarted(
        { urls: ['http://*/*', 'https://*/*'] },
        (details: OnResponseStartedListenerDetails): void => {
            if (details.webContents !== browserWindow.webContents) {
                return;
            }
            log.debug('onResponseStarted', {
                resourceType: details.resourceType,
                url: details.url,
            });
            injectCSSIntoResponse(details, cssToInject).catch(
                (err: unknown) => {
                    log.error('injectCSSIntoResponse ERROR', err);
                },
            );
        },
    );
}

function injectCSSIntoResponse(
    details: OnResponseStartedListenerDetails,
    cssToInject: string,
): Promise<string | undefined> {
    const contentType =
        details.responseHeaders && 'content-type' in details.responseHeaders
            ? details.responseHeaders['content-type'][0]
            : undefined;

    log.debug('injectCSSIntoResponse', { details, cssToInject, contentType });

    // We go with a denylist rather than a whitelist (e.g. only text/html)
    // to avoid "whoops I didn't think this should have been CSS-injected" cases
    const nonInjectableContentTypes = [
        /application\/.*/,
        /font\/.*/,
        /image\/.*/,
    ];
    const nonInjectableResourceTypes = ['image', 'script', 'stylesheet', 'xhr'];

    if (
        (contentType &&
            nonInjectableContentTypes.filter((x) => {
                const matches = x.exec(contentType);
                return matches && matches?.length > 0;
            })?.length > 0) ||
        nonInjectableResourceTypes.includes(details.resourceType) ||
        !details.webContents
    ) {
        log.debug(
            `Skipping CSS injection for:\n${details.url}\nwith resourceType ${
                details.resourceType
            } and content-type ${contentType as string}`,
        );
        return Promise.resolve(undefined);
    }

    log.debug(
        `Injecting CSS for:\n${details.url}\nwith resourceType ${
            details.resourceType
        } and content-type ${contentType as string}`,
    );
    return details.webContents.insertCSS(cssToInject);
}

export function sendParamsOnDidFinishLoad(
    options: WindowOptions,
    window: BrowserWindow,
): void {
    window.webContents.on('did-finish-load', () => {
        log.debug(
            'sendParamsOnDidFinishLoad.window.webContents.did-finish-load',
            window.webContents.getURL(),
        );
        // In children windows too: Restore pinch-to-zoom, disabled by default in recent Electron.
        // See https://github.com/OmniNodeCo/Webtoapp/issues/379#issuecomment-598612128
        // and https://github.com/electron/electron/pull/12679
        window.webContents
            .setVisualZoomLevelLimits(1, 3)
            .catch((err) =>
                log.error('webContents.setVisualZoomLevelLimits', err),
            );

        window.webContents.send('params', JSON.stringify(options));
    });
}

export function setProxyRules(
    window: BrowserWindow,
    proxyRules?: string,
): void {
    window.webContents.session
        .setProxy({
            proxyRules,
            pacScript: '',
            proxyBypassRules: '',
        })
        .catch((err) => log.error('session.setProxy ERROR', err));
}

export function withFocusedWindow<T>(
    block: (window: BrowserWindow) => T,
): T | undefined {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        return block(focusedWindow);
    }

    return undefined;
}

export function zoomOut(): void {
    log.debug('zoomOut');
    adjustWindowZoom(-ZOOM_INTERVAL);
}

export function zoomReset(options: { zoom?: number }): void {
    log.debug('zoomReset');
    withFocusedWindow((focusedWindow) => {
        focusedWindow.webContents.zoomFactor = options.zoom ?? 1.0;
    });
}

export function zoomIn(): void {
    log.debug('zoomIn');
    adjustWindowZoom(ZOOM_INTERVAL);
}
