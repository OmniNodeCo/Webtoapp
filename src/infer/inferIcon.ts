import * as path from 'path';
import { writeFile } from 'fs';
import { promisify } from 'util';

import gitCloud = require('gitcloud');
import pageIcon from 'page-icon';

import {
    downloadFile,
    DownloadResult,
    getAllowedIconFormats,
    getTempDir,
} from '../helpers/helpers';
import * as log from 'loglevel';

const writeFileAsync = promisify(writeFile);

const GITCLOUD_SPACE_DELIMITER = '-';
const GITCLOUD_URL = 'https://nativefier.github.io/nativefier-icons/';
const ICON_LOOKUP_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`${label} timed out`)),
            ICON_LOOKUP_TIMEOUT_MS,
        );
    });

    return Promise.race([promise, timeout]).finally(() => {
        if (timer) {
            clearTimeout(timer);
        }
    });
}

type GitCloudIcon = {
    ext?: string;
    name?: string;
    score?: number;
    url?: string;
};

function getMaxMatchScore(iconWithScores: GitCloudIcon[]): number {
    const score = iconWithScores.reduce((maxScore, currentIcon) => {
        const currentScore = currentIcon.score;
        if (currentScore && currentScore > maxScore) {
            return currentScore;
        }
        return maxScore;
    }, 0);
    log.debug('Max icon match score:', score);
    return score;
}

function getMatchingIcons(
    iconsWithScores: GitCloudIcon[],
    maxScore: number,
): GitCloudIcon[] {
    return iconsWithScores.filter((item) => item.score === maxScore);
}

function mapIconWithMatchScore(
    cloudIcons: { name: string; url: string }[],
    targetUrl: string,
): GitCloudIcon[] {
    const normalisedTargetUrl = targetUrl.toLowerCase();
    return cloudIcons.map((item) => {
        const itemWords = item.name.split(GITCLOUD_SPACE_DELIMITER);
        const score: number = itemWords.reduce(
            (currentScore: number, word: string) => {
                if (normalisedTargetUrl.includes(word)) {
                    return currentScore + 1;
                }
                return currentScore;
            },
            0,
        );

        return { ...item, ext: path.extname(item.url), score };
    });
}

async function inferIconFromStore(
    targetUrl: string,
    platform: string,
): Promise<DownloadResult | undefined> {
    log.debug(`Inferring icon from store for ${targetUrl} on ${platform}`);
    const allowedFormats = new Set<string | undefined>(
        getAllowedIconFormats(platform),
    );

    const cloudIcons = await withTimeout(
        gitCloud(GITCLOUD_URL),
        'icon catalog lookup',
    );
    log.debug(`Got ${cloudIcons.length} icons from gitcloud`);
    const iconWithScores = mapIconWithMatchScore(cloudIcons, targetUrl);
    const maxScore = getMaxMatchScore(iconWithScores);

    if (maxScore === 0) {
        log.debug('No relevant icon in store.');
        return undefined;
    }

    const iconsMatchingScore = getMatchingIcons(iconWithScores, maxScore);
    const iconsMatchingExt = iconsMatchingScore.filter((icon) =>
        allowedFormats.has(icon.ext ?? path.extname(icon.url as string)),
    );
    const matchingIcon = iconsMatchingExt[0];
    const iconUrl = matchingIcon && matchingIcon.url;

    if (!iconUrl) {
        log.debug('Could not infer icon from store');
        return undefined;
    }
    return downloadFile(iconUrl);
}

export async function inferIcon(
    targetUrl: string,
    platform: string,
): Promise<string | undefined> {
    log.debug(`Inferring icon for ${targetUrl} on ${platform}`);
    const tmpDirPath = getTempDir('iconinfer');

    let icon: { ext: string; data: Buffer } | undefined =
        await inferIconFromStore(targetUrl, platform);
    if (!icon) {
        const ext = platform === 'win32' ? '.ico' : '.png';
        log.debug(`Trying to extract a ${ext} icon from the page.`);
        icon = await withTimeout(
            pageIcon(targetUrl, { ext }),
            'page icon lookup',
        );
    }
    if (!icon) {
        return undefined;
    }
    log.debug(`Got an icon from the page.`);

    const iconPath = path.join(tmpDirPath, `/icon${icon.ext}`);
    log.debug(
        `Writing ${(icon.data.length / 1024).toFixed(
            1,
        )} kb icon to ${iconPath}`,
    );
    await writeFileAsync(iconPath, icon.data);
    return iconPath;
}
