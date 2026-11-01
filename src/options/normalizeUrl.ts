import * as log from 'loglevel';

/**
 * Turn a bare host into an HTTPS URL and reject schemes Electron should not
 * navigate to when creating an app. The old implementation delegated all
 * schemes to URL(), which meant values such as `javascript:` and `file:` could
 * be written into the generated app configuration.
 */
export function normalizeUrl(input: string): string {
    if (typeof input !== 'string') {
        throw new Error('Your url is invalid');
    }

    const original = input;
    const trimmed = input.trim();
    if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) {
        throw new Error(`Your url "${original}" is invalid`);
    }

    // URL('www.example.com') throws, so add the least surprising protocol
    // before parsing. Explicit http remains supported for local/dev targets and
    // for a familiar website-wrapper command-line experience.
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(candidate);
    } catch {
        throw new Error(`Your url "${candidate}" is invalid`);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
        throw new Error(
            `Your url "${candidate}" is invalid: only http:// and https:// URLs are supported`,
        );
    }

    // Credentials in a target URL would be persisted in the packaged app and
    // can leak through logs, desktop metadata, or an upgrade. Ask callers to
    // use the website's login flow instead.
    if (parsedUrl.username || parsedUrl.password) {
        throw new Error(
            `Your url "${candidate}" is invalid: embedded credentials are not supported`,
        );
    }

    const normalizedUrl = parsedUrl.toString();
    log.debug(`Normalized URL ${original} to:`, normalizedUrl);
    return normalizedUrl;
}
