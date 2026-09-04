import { dialog, BrowserWindow } from 'electron';
jest.mock('loglevel');
import { error } from 'loglevel';
import { WindowOptions } from '../../../shared/src/options/model';

jest.mock('./helpers');
import { getCSSToInject, getJSToInject } from './helpers';
jest.mock('./windowEvents');
import {
    clearAppData,
    createNewTab,
    getDefaultWindowOptions,
    injectCSS,
    injectJavaScript,
} from './windowHelpers';

describe('clearAppData', () => {
    let window: BrowserWindow;
    let mockClearCache: jest.SpyInstance;
    let mockClearStorageData: jest.SpyInstance;
    const mockShowDialog: jest.SpyInstance = jest.spyOn(
        dialog,
        'showMessageBox',
    );

    beforeEach(() => {
        window = new BrowserWindow();
        mockClearCache = jest.spyOn(window.webContents.session, 'clearCache');
        mockClearStorageData = jest.spyOn(
            window.webContents.session,
            'clearStorageData',
        );
        mockShowDialog.mockReset().mockResolvedValue(undefined);
    });

    afterAll(() => {
        mockClearCache.mockRestore();
        mockClearStorageData.mockRestore();
        mockShowDialog.mockRestore();
    });

    test('will not clear app data if dialog canceled', async () => {
        mockShowDialog.mockResolvedValue(1);

        await clearAppData(window);

        expect(mockShowDialog).toHaveBeenCalledTimes(1);
        expect(mockClearCache).not.toHaveBeenCalled();
        expect(mockClearStorageData).not.toHaveBeenCalled();
    });

    test('will clear app data if ok is clicked', async () => {
        mockShowDialog.mockResolvedValue(0);

        await clearAppData(window);

        expect(mockShowDialog).toHaveBeenCalledTimes(1);
        expect(mockClearCache).not.toHaveBeenCalledTimes(1);
        expect(mockClearStorageData).not.toHaveBeenCalledTimes(1);
    });
});

describe('createNewTab', () => {
    // const window = new BrowserWindow();
    const options: WindowOptions = {
        autoHideMenuBar: true,
        blockExternalUrls: false,
        insecure: false,
        name: 'Test App',
        targetUrl: 'https://github.com/webtoapp/natifefier',
        zoom: 1.0,
    } as WindowOptions;
    const setupWindow = jest.fn();
    const url = 'https://github.com/OmniNodeCo/Webtoapp';
    const mockAddTabbedWindow: jest.SpyInstance = jest.spyOn(
        BrowserWindow.prototype,
        'addTabbedWindow',
    );
    const mockFocus: jest.SpyInstance = jest.spyOn(
        BrowserWindow.prototype,
        'focus',
    );
    const mockLoadURL: jest.SpyInstance = jest.spyOn(
        BrowserWindow.prototype,
        'loadURL',
    );

    test('creates new foreground tab', () => {
        const foreground = true;

        const tab = createNewTab(options, setupWindow, url, foreground);

        expect(mockAddTabbedWindow).toHaveBeenCalledWith(tab);
        expect(setupWindow).toHaveBeenCalledWith(options, tab);
        expect(mockLoadURL).toHaveBeenCalledWith(url);
        expect(mockFocus).not.toHaveBeenCalled();
    });

    test('creates new background tab', () => {
        const foreground = false;

        const tab = createNewTab(
            options,
            setupWindow,
            url,
            foreground,
            // window
        );

        expect(mockAddTabbedWindow).toHaveBeenCalledWith(tab);
        expect(setupWindow).toHaveBeenCalledWith(options, tab);
        expect(mockLoadURL).toHaveBeenCalledWith(url);
        expect(mockFocus).toHaveBeenCalledTimes(1);
    });
});

describe('injectJavaScript', () => {
    const mockGetJSToInject: jest.Mock = getJSToInject as jest.Mock;

    beforeEach(() => {
        mockGetJSToInject.mockReset().mockReturnValue(['window.injected = true;']);
    });

    test('installs the page bridge before running requested scripts', async () => {
        const window = new BrowserWindow();
        const executeJavaScript = jest.spyOn(
            window.webContents,
            'executeJavaScript',
        );
        injectJavaScript(window);
        window.webContents.emit('did-finish-load');
        await new Promise((resolve) => setImmediate(resolve));

        expect(executeJavaScript).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('webtoappBridge'),
            true,
        );
        expect(executeJavaScript).toHaveBeenNthCalledWith(
            2,
            'window.injected = true;',
            true,
        );
    });
});

describe('getDefaultWindowOptions', () => {
    test('keeps page-provided browser options from weakening isolation', () => {
        const result = getDefaultWindowOptions({
            autoHideMenuBar: false,
            browserwindowOptions: {
                webPreferences: {
                    contextIsolation: false,
                    nodeIntegration: true,
                    nodeIntegrationInSubFrames: true,
                    preload: '/tmp/untrusted-preload.js',
                    sandbox: false,
                    webSecurity: false,
                },
            },
            insecure: false,
            name: 'Test App',
            targetUrl: 'https://example.com',
            zoom: 1,
        } as unknown as WindowOptions);

        expect(result.webPreferences).toMatchObject({
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: false,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
        });
        expect(result.webPreferences?.preload).toContain('preload.js');
    });
});

describe('injectCSS', () => {
    jest.setTimeout(10000);

    const mockGetCSSToInject: jest.SpyInstance = getCSSToInject as jest.Mock;
    const mockLogError: jest.SpyInstance = error as jest.Mock;

    const css = 'body { color: white; }';
    let responseHeaders: Record<string, string[]>;

    beforeEach(() => {
        mockGetCSSToInject.mockReset().mockReturnValue('');
        mockLogError.mockReset();
        responseHeaders = {
            'x-header': ['value'],
            'content-type': ['test/other'],
        };
    });

    afterAll(() => {
        mockGetCSSToInject.mockRestore();
        mockLogError.mockRestore();
    });

    test('will not inject if getCSSToInject is empty', () => {
        const window = new BrowserWindow();
        const mockWebContentsInsertCSS: jest.SpyInstance = jest
            .spyOn(window.webContents, 'insertCSS')
            .mockResolvedValue('');
        jest.spyOn(window.webContents, 'getURL').mockReturnValue(
            'https://example.com',
        );

        injectCSS(window);

        expect(mockGetCSSToInject).toHaveBeenCalled();
        expect(mockWebContentsInsertCSS).not.toHaveBeenCalled();
    });

    test('will inject on did-navigate + onResponseStarted', () => {
        mockGetCSSToInject.mockReturnValue(css);
        const window = new BrowserWindow();
        const mockWebContentsInsertCSS: jest.SpyInstance = jest
            .spyOn(window.webContents, 'insertCSS')
            .mockResolvedValue('');
        jest.spyOn(window.webContents, 'getURL').mockReturnValue(
            'https://example.com',
        );

        injectCSS(window);

        expect(mockGetCSSToInject).toHaveBeenCalled();

        window.webContents.emit('did-navigate');
        // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        window.webContents.session.webRequest.send('onResponseStarted', {
            responseHeaders,
            webContents: window.webContents,
        });

        expect(mockWebContentsInsertCSS).toHaveBeenCalledWith(css);
    });

    test.each<string>(['application/json', 'font/woff2', 'image/png'])(
        'will not inject for content-type %s',
        (contentType: string) => {
            mockGetCSSToInject.mockReturnValue(css);
            const window = new BrowserWindow();
            const mockWebContentsInsertCSS: jest.SpyInstance = jest
                .spyOn(window.webContents, 'insertCSS')
                .mockResolvedValue('');
            jest.spyOn(window.webContents, 'getURL').mockReturnValue(
                'https://example.com',
            );

            responseHeaders['content-type'] = [contentType];

            injectCSS(window);

            expect(mockGetCSSToInject).toHaveBeenCalled();

            expect(window.webContents.emit('did-navigate')).toBe(true);
            mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
            // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            window.webContents.session.webRequest.send('onResponseStarted', {
                responseHeaders,
                webContents: window.webContents,
                url: `test-${contentType}`,
            });
            // insertCSS will still run once for the did-navigate
            expect(mockWebContentsInsertCSS).not.toHaveBeenCalled();
        },
    );

    test.each<string>(['text/html'])(
        'will inject for content-type %s',
        (contentType: string) => {
            mockGetCSSToInject.mockReturnValue(css);
            const window = new BrowserWindow();
            const mockWebContentsInsertCSS: jest.SpyInstance = jest
                .spyOn(window.webContents, 'insertCSS')
                .mockResolvedValue('');
            jest.spyOn(window.webContents, 'getURL').mockReturnValue(
                'https://example.com',
            );

            responseHeaders['content-type'] = [contentType];

            injectCSS(window);

            expect(mockGetCSSToInject).toHaveBeenCalled();

            window.webContents.emit('did-navigate');
            mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
            // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            window.webContents.session.webRequest.send('onResponseStarted', {
                responseHeaders,
                webContents: window.webContents,
                url: `test-${contentType}`,
            });

            expect(mockWebContentsInsertCSS).toHaveBeenCalledTimes(1);
        },
    );

    test.each<string>(['image', 'script', 'stylesheet', 'xhr'])(
        'will not inject for resource type %s',
        (resourceType: string) => {
            mockGetCSSToInject.mockReturnValue(css);
            const window = new BrowserWindow();
            const mockWebContentsInsertCSS: jest.SpyInstance = jest
                .spyOn(window.webContents, 'insertCSS')
                .mockResolvedValue('');
            jest.spyOn(window.webContents, 'getURL').mockReturnValue(
                'https://example.com',
            );

            injectCSS(window);

            expect(mockGetCSSToInject).toHaveBeenCalled();

            window.webContents.emit('did-navigate');
            mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
            // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            window.webContents.session.webRequest.send('onResponseStarted', {
                responseHeaders,
                webContents: window.webContents,
                resourceType,
                url: `test-${resourceType}`,
            });
            // insertCSS will still run once for the did-navigate
            expect(mockWebContentsInsertCSS).not.toHaveBeenCalled();
        },
    );

    test.each<string>(['html', 'other'])(
        'will inject for resource type %s',
        (resourceType: string) => {
            mockGetCSSToInject.mockReturnValue(css);
            const window = new BrowserWindow();
            const mockWebContentsInsertCSS: jest.SpyInstance = jest
                .spyOn(window.webContents, 'insertCSS')
                .mockResolvedValue('');
            jest.spyOn(window.webContents, 'getURL').mockReturnValue(
                'https://example.com',
            );

            injectCSS(window);

            expect(mockGetCSSToInject).toHaveBeenCalled();

            window.webContents.emit('did-navigate');
            mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
            // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            window.webContents.session.webRequest.send('onResponseStarted', {
                responseHeaders,
                webContents: window.webContents,
                resourceType,
                url: `test-${resourceType}`,
            });
            expect(mockWebContentsInsertCSS).toHaveBeenCalledTimes(1);
        },
    );
});
