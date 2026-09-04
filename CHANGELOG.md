# Changelog

## 0.1.0 - 2026-09-04

- Replaced the previous native launcher with the Electron-based website-wrapper
  architecture.
- Rebranded the CLI, generated runtime, package identifiers, docs, and app
  configuration to Webtoapp.
- Added URL normalization that accepts bare domains as HTTPS and rejects unsafe
  schemes and embedded credentials.
- Added bounded page-title and icon metadata lookups with safe fallbacks.
- Prevented generated windows from enabling Node integration or replacing the
  runtime preload through browser-window JSON.
- Changed Electron permission handling to deny unneeded capabilities by default.
- Fixed repeated CSS-injection listeners, malformed screen-share markup, login
  IPC validation, deterministic bundle IDs, and missing injection-file errors.
- Added cross-platform package/test workflows for the CLI.

## Upstream history

The older feature history is retained in the Nativefier project from which the
runtime was forked. See [NOTICE.md](NOTICE.md) for attribution and licensing.
