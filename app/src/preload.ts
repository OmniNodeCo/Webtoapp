/**
 * Preload file that runs before the wrapped page. It exposes a deliberately
 * small bridge; page JavaScript never receives ipcRenderer or Node integration.
 */
import { contextBridge, ipcRenderer } from 'electron';
import { OutputOptions } from '../../shared/src/options/model';

// Do *NOT* add 3rd-party imports here in preload (except for webpack `externals` like electron).
// They will work during development, but break in the prod build :-/ .
// Electron doc isn't explicit about that, so maybe *we*'re doing something wrong.
// At any rate, that's what we have now. If you want an import here, go ahead, but
// verify that apps built with a non-devbuild webtoapp (installed from tarball) work.
// Recipe to monkey around this, assuming you git-cloned webtoapp in /opt/webtoapp/ :
// cd /opt/webtoapp/ && rm -f webtoapp-43.1.0.tgz && npm run build && npm pack && mkdir -p ~/n4310/ && cd ~/n4310/ \
//    && rm -rf ./* && npm i /opt/webtoapp/webtoapp-43.1.0.tgz && ./node_modules/.bin/webtoapp 'google.com'
// See https://github.com/OmniNodeCo/Webtoapp/issues/1175
// and https://www.electronjs.org/docs/api/browser-window#new-browserwindowoptions / preload

const log = console; // since we can't have `loglevel` here in preload

type DesktopSourceInfo = {
    id: string;
    name: string;
    thumbnail: string;
};

/**
 * Keep the renderer-facing API narrow. The main process still validates
 * permissions and owns all Electron calls behind these methods.
 */
contextBridge.exposeInMainWorld('webtoappBridge', {
    requestDesktopSources: async (): Promise<DesktopSourceInfo[]> => {
        const sources = (await ipcRenderer.invoke(
            'desktop-capturer-get-sources',
        )) as Electron.DesktopCapturerSource[];
        return sources.map((source) => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.toDataURL(),
        }));
    },
    notify: (title: string, options: NotificationOptions): void => {
        ipcRenderer.send('notification', title, options);
    },
    notificationClick: (): void => {
        ipcRenderer.send('notification-click');
    },
});

ipcRenderer.on('params', (event, message: string) => {
    log.debug('ipcRenderer.params', { event, message });
    const appArgs: unknown = JSON.parse(message) as OutputOptions;
    log.info('webtoapp.json', appArgs);
});

ipcRenderer.on('debug', (event, message: string) => {
    log.debug('ipcRenderer.debug', { event, message });
});
