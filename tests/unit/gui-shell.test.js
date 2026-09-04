import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const ui = fs.readFileSync(path.join(root, 'ui', 'index.html'), 'utf8');
const frontend = fs.readFileSync(path.join(root, 'ui', 'app.js'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'src-tauri', 'src', 'lib.rs'), 'utf8');

describe('Webtoapp GUI shell', () => {
  it('ships a native builder form with the supported launch fields', () => {
    expect(ui).toContain('id="app-form"');
    expect(ui).toContain('id="name"');
    expect(ui).toContain('id="url"');
    expect(ui).toContain('id="width"');
    expect(ui).toContain('id="height"');
  });

  it('uses a narrow Tauri command to open website app windows', () => {
    expect(frontend).toContain("invoke('open_website_app', { request })");
    expect(backend).toContain('fn open_website_app');
    expect(backend).toContain('WebviewUrl::External(url)');
    expect(backend).toContain('url.scheme() != "https"');
  });
});
