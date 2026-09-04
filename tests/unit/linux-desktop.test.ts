import { describe, expect, it } from 'vitest';

import { buildLinuxDesktopContent } from '../../cli/helpers/merge';

describe('buildLinuxDesktopContent', () => {
  it('uses the Tauri main binary name for freedesktop icon lookup', () => {
    const desktopContent = buildLinuxDesktopContent(
      'Example App',
      undefined,
      'webtoapp-example-app',
    );

    expect(desktopContent).toContain('Exec=webtoapp-example-app');
    expect(desktopContent).toContain('Icon=webtoapp-example-app');
    expect(desktopContent).not.toContain('Icon=example-app_512');
  });

  it('keeps the localized Chinese name when title contains Chinese text', () => {
    const desktopContent = buildLinuxDesktopContent(
      'MiaoYan',
      '妙言',
      'webtoapp-miaoyan',
    );

    expect(desktopContent).toContain('Name=MiaoYan');
    expect(desktopContent).toContain('Name[zh_CN]=妙言');
  });
});
