import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const workflow = (name) => fs.readFileSync(path.join(root, '.github', 'workflows', name), 'utf8');

describe('Webtoapp GUI workflows', () => {
  it('builds GUI executables manually for Windows, macOS, and Linux', () => {
    const build = workflow('build.yml');
    expect(build).toContain('workflow_dispatch:');
    expect(build).toContain('name: Windows');
    expect(build).toContain('name: macOS');
    expect(build).toContain('name: Linux');
    expect(build).toContain('pnpm run build');
    expect(build).toContain('src-tauri/target/release/bundle/**');
  });

  it('keeps release builds tag-driven and the test workflow automatic', () => {
    const release = workflow('release.yml');
    const test = workflow('test.yml');
    expect(release).toContain('tags: ["v*"]');
    expect(release).toContain('softprops/action-gh-release@v2');
    expect(test).toContain('push:');
    expect(test).toContain('pull_request:');
  });
});
