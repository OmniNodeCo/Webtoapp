import 'source-map-support/register';

import { buildWebtoappApp } from './build/buildWebtoappApp';
import { RawOptions } from '../shared/src/options/model';

export { buildWebtoappApp };

/**
 * Only for compatibility with Webtoapp <= 7.7.1 !
 * Use the better, modern async `buildWebtoappApp` instead if you can!
 */
function buildWebtoappAppOldCallbackStyle(
    options: RawOptions, // eslint-disable-line @typescript-eslint/explicit-module-boundary-types
    callback: (err?: Error, result?: string) => void,
): void {
    buildWebtoappApp(options)
        .then((result) => callback(undefined, result))
        .catch((err: Error) => callback(err));
}

export default buildWebtoappAppOldCallbackStyle;
