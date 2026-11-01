import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

import * as log from 'loglevel';

import { generateRandomSuffix } from '../helpers/helpers';
import {
    AppOptions,
    OutputOptions,
    PackageJSON,
} from '../../shared/src/options/model';
import { parseJson } from '../utils/parseUtils';
import { DEFAULT_APP_NAME } from '../constants';

/**
 * Only picks certain app args to pass to webtoapp.json
 */
function pickElectronAppArgs(options: AppOptions): OutputOptions {
    return {
        accessibilityPrompt: options.webtoapp.accessibilityPrompt,
        alwaysOnTop: options.webtoapp.alwaysOnTop,
        appBundleId: options.packager.appBundleId,
        appCategoryType: options.packager.appCategoryType,
        appCopyright: options.packager.appCopyright,
        appVersion: options.packager.appVersion,
        arch: options.packager.arch,
        asar: options.packager.asar,
        backgroundColor: options.webtoapp.backgroundColor,
        basicAuthPassword: options.webtoapp.basicAuthPassword,
        basicAuthUsername: options.webtoapp.basicAuthUsername,
        blockExternalUrls: options.webtoapp.blockExternalUrls,
        bounce: options.webtoapp.bounce,
        browserwindowOptions: options.webtoapp.browserwindowOptions,
        buildDate: new Date().getTime(),
        buildVersion: options.packager.buildVersion,
        clearCache: options.webtoapp.clearCache,
        counter: options.webtoapp.counter,
        crashReporter: options.webtoapp.crashReporter,
        darwinDarkModeSupport: options.packager.darwinDarkModeSupport,
        derefSymlinks: options.packager.derefSymlinks,
        disableContextMenu: options.webtoapp.disableContextMenu,
        disableDevTools: options.webtoapp.disableDevTools,
        disableGpu: options.webtoapp.disableGpu,
        disableOldBuildWarning: options.webtoapp.disableOldBuildWarning,
        diskCacheSize: options.webtoapp.diskCacheSize,
        download: options.packager.download,
        electronVersionUsed: options.packager.electronVersion,
        enableEs3Apis: options.webtoapp.enableEs3Apis,
        executableName: options.packager.executableName,
        fastQuit: options.webtoapp.fastQuit,
        fileDownloadOptions: options.webtoapp.fileDownloadOptions,
        flashPluginDir: options.webtoapp.flashPluginDir,
        fullScreen: options.webtoapp.fullScreen,
        globalShortcuts: options.webtoapp.globalShortcuts,
        height: options.webtoapp.height,
        helperBundleId: options.packager.helperBundleId,
        hideWindowFrame: options.webtoapp.hideWindowFrame,
        ignoreCertificate: options.webtoapp.ignoreCertificate,
        ignoreGpuBlacklist: options.webtoapp.ignoreGpuBlacklist,
        insecure: options.webtoapp.insecure,
        internalUrls: options.webtoapp.internalUrls,
        isUpgrade: options.packager.upgrade,
        junk: options.packager.junk,
        lang: options.webtoapp.lang,
        maximize: options.webtoapp.maximize,
        maxHeight: options.webtoapp.maxHeight,
        maxWidth: options.webtoapp.maxWidth,
        minHeight: options.webtoapp.minHeight,
        minWidth: options.webtoapp.minWidth,
        name: options.packager.name ?? DEFAULT_APP_NAME,
        webtoappVersion: options.webtoapp.webtoappVersion,
        osxNotarize: options.packager.osxNotarize,
        osxSign: options.packager.osxSign,
        portable: options.packager.portable,
        processEnvs: options.webtoapp.processEnvs,
        protocols: options.packager.protocols,
        proxyRules: options.webtoapp.proxyRules,
        prune: options.packager.prune,
        quiet: options.packager.quiet,
        showMenuBar: options.webtoapp.showMenuBar,
        singleInstance: options.webtoapp.singleInstance,
        strictInternalUrls: options.webtoapp.strictInternalUrls,
        targetUrl: options.packager.targetUrl,
        titleBarStyle: options.webtoapp.titleBarStyle,
        tray: options.webtoapp.tray,
        usageDescription: options.packager.usageDescription,
        userAgent: options.webtoapp.userAgent,
        userAgentHonest: options.webtoapp.userAgentHonest,
        versionString: options.webtoapp.versionString,
        width: options.webtoapp.width,
        widevine: options.webtoapp.widevine,
        win32metadata: options.packager.win32metadata,
        x: options.webtoapp.x,
        y: options.webtoapp.y,
        zoom: options.webtoapp.zoom,
        // OLD_BUILD_WARNING_TEXT is an undocumented env. var to let *packagers*
        // tweak the message shown on warning about an old build, to something
        // more tailored to their audience (who might not even know Webtoapp).
        // See https://github.com/kelyvin/Google-Messages-For-Desktop/issues/34#issuecomment-812731144
        // and https://github.com/OmniNodeCo/Webtoapp/issues/1131#issuecomment-812646988
        oldBuildWarningText: process.env.OLD_BUILD_WARNING_TEXT || '',
    };
}

async function maybeCopyScripts(
    srcs: string[] | undefined,
    dest: string,
): Promise<void> {
    if (!srcs || srcs.length === 0) {
        log.debug('No files to inject, skipping copy.');
        return;
    }

    const supportedInjectionExtensions = ['.css', '.js'];

    log.debug(`Copying ${srcs.length} files to inject in app.`);
    for (const src of srcs) {
        if (!fs.existsSync(src)) {
            throw new Error(
                `File ${src} not found. Note that Webtoapp expects *local* files, not URLs.`,
            );
        }

        if (supportedInjectionExtensions.indexOf(path.extname(src)) < 0) {
            log.warn('Skipping unsupported injection file', src);
            continue;
        }

        const postFixHash = generateRandomSuffix();
        const destFileName = `inject-${postFixHash}${path.extname(src)}`;
        const destPath = path.join(dest, 'inject', destFileName);
        log.debug(`Copying injection file "${src}" to "${destPath}"`);
        await fs.copy(src, destPath);
    }
}

/**
 * Use a basic 6-character hash to prevent collisions. The hash is deterministic url & name,
 * so that an upgrade (same URL) of an app keeps using the same appData folder.
 * Warning! Changing this normalizing & hashing will change the way appNames are generated,
 *          changing appData folder, and users will get logged out of their apps after an upgrade.
 */
export function normalizeAppName(appName: string, url: string): string {
    const hash = crypto.createHash('md5');
    hash.update(url);
    const postFixHash = hash.digest('hex').substring(0, 6);
    const normalized = appName
        .toLowerCase()
        .replace(/[,:.]/g, '')
        .replace(/[\s_]/g, '-');
    return `${normalized}-webtoapp-${postFixHash}`;
}

function changeAppPackageJsonName(
    appPath: string,
    name: string,
    url: string,
): string {
    const packageJsonPath = path.join(appPath, 'package.json');
    const packageJson = parseJson<PackageJSON>(
        fs.readFileSync(packageJsonPath).toString(),
    );
    if (!packageJson) {
        throw new Error(`Could not load package.json from ${packageJsonPath}`);
    }
    const normalizedAppName = normalizeAppName(name, url);
    packageJson.name = normalizedAppName;
    log.debug(
        `Updating ${packageJsonPath} 'name' field to ${normalizedAppName}`,
    );

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    return normalizedAppName;
}

/**
 * Creates a temporary directory, copies the './app folder' inside,
 * and adds a text file with the app configuration.
 */
export async function prepareElectronApp(
    src: string,
    dest: string,
    options: AppOptions,
): Promise<void> {
    log.debug(`Copying electron app from ${src} to ${dest}`);
    try {
        await fs.copy(src, dest);
    } catch (err: unknown) {
        throw new Error(
            `Error copying electron app from ${src} to temp dir ${dest}. Error: ${
                err instanceof Error ? err.message : String(err)
            }`,
        );
    }

    const appJsonPath = path.join(dest, 'webtoapp.json');
    const pickedOptions = pickElectronAppArgs(options);
    log.debug(`Writing app config to ${appJsonPath}`, pickedOptions);
    await fs.writeFile(appJsonPath, JSON.stringify(pickedOptions));

    if (options.webtoapp.bookmarksMenu) {
        const bookmarksJsonPath = path.join(dest, 'bookmarks.json');
        try {
            await fs.copy(options.webtoapp.bookmarksMenu, bookmarksJsonPath);
        } catch (err: unknown) {
            log.error('Error copying bookmarks menu config file.', err);
        }
    }

    try {
        await maybeCopyScripts(options.webtoapp.inject, dest);
    } catch (err: unknown) {
        // A requested injection is part of the app's behavior. Silently
        // dropping it produces a successful but incorrect build, so fail with
        // the actionable path error instead.
        throw new Error(
            `Error copying injection files: ${
                err instanceof Error ? err.message : String(err)
            }`,
        );
    }
    const normalizedAppName = changeAppPackageJsonName(
        dest,
        options.packager.name as string,
        options.packager.targetUrl,
    );
    const bundleName = normalizedAppName
        .replace(/[^a-zA-Z0-9.-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'app';
    options.packager.appBundleId = `com.electron.webtoapp.${bundleName}`;
}
