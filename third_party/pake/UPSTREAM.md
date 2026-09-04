# Pake upstream source

This directory is a curated source import from [tw93/Pake](https://github.com/tw93/Pake), commit `777dd55` (2026-09-04). It is used only by the manual GitHub Actions website-app builder.

Pake is licensed under GPL-3.0-or-later. `LICENSE` and `LICENSE-EXCEPTION` are preserved verbatim. The output exception means applications generated through Pake's standard build process are not themselves required to use GPL-3.0, but modifications to this vendored Pake source remain subject to GPL-3.0-or-later.

## Local adaptations

- `bin/options/index.ts` accepts `--no-bundle` on Windows so a manual Webtoapp build can emit a raw portable `.exe` instead of an MSI installer.
- `bin/builders/WinBuilder.ts` passes Tauri's `--no-bundle` flag for that portable Windows path.

Upstream provides the website-wrapper runtime, configuration merger, icon handling, and Rust/Tauri packaging implementation. Webtoapp's own orchestration remains outside this directory.
