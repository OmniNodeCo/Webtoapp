import axios from 'axios';
import * as log from 'loglevel';

import { DEFAULT_APP_NAME } from '../constants';

const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15';
const TITLE_MAX_LENGTH = 200;
const HTML_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Extract a useful title without evaluating page HTML. This deliberately keeps
 * the parser small: metadata is only a convenience used for the default app
 * name, and a malformed page must never make a build fail.
 */
export function extractTitle(html: string): string | undefined {
    const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
    if (!titleMatch?.[1]) {
        return undefined;
    }

    const title = decodeHtmlEntities(
        titleMatch[1]
            .replace(/<[^>]*>/g, ' ')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
    );

    return title ? title.slice(0, TITLE_MAX_LENGTH) : undefined;
}

function decodeHtmlEntities(value: string): string {
    const namedEntities: Record<string, string> = {
        amp: '&',
        apos: "'",
        gt: '>',
        lt: '<',
        nbsp: ' ',
        quot: '"',
    };

    return value.replace(
        /&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi,
        (entity, body: string) => {
            const lowerBody = body.toLowerCase();
            if (lowerBody in namedEntities) {
                return namedEntities[lowerBody];
            }
            if (lowerBody.startsWith('#x')) {
                const codePoint = Number.parseInt(lowerBody.slice(2), 16);
                return Number.isNaN(codePoint)
                    ? entity
                    : String.fromCodePoint(Math.min(codePoint, 0x10ffff));
            }
            if (lowerBody.startsWith('#')) {
                const codePoint = Number.parseInt(lowerBody.slice(1), 10);
                return Number.isNaN(codePoint)
                    ? entity
                    : String.fromCodePoint(Math.min(codePoint, 0x10ffff));
            }
            return entity;
        },
    );
}

export async function inferTitle(url: string): Promise<string> {
    const { data } = await axios.get<string>(url, {
        headers: {
            // Some web apps return a useful title only to a browser-like agent.
            'User-Agent': USER_AGENT,
        },
        // Do not let a slow/offline site hold the whole build indefinitely.
        timeout: 10_000,
        maxContentLength: HTML_MAX_BYTES,
        maxBodyLength: HTML_MAX_BYTES,
        responseType: 'text',
    });
    const html = typeof data === 'string' ? data : String(data ?? '');
    log.debug(`Fetched ${(html.length / 1024).toFixed(1)} kb page at`, url);
    const inferredTitle = extractTitle(html) ?? DEFAULT_APP_NAME;
    log.debug('Inferred title:', inferredTitle);
    return inferredTitle;
}
