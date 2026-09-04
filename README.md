# Webtoapp

**Turn a trusted website into a lightweight desktop app.** Webtoapp is a rebranded Pake/Tauri-based website wrapper for Windows, macOS, and Linux. It uses each platform's native WebView instead of embedding Chromium, creating substantially smaller desktop applications.

> Only package websites you own or are authorized to distribute. Webtoapp does not bypass access controls, subscriptions, or website security.

## No local setup: build from GitHub Actions

The simplest way to create an app is the manual **Build website app** workflow:

1. Open the repository’s **Actions** tab.
2. Choose **Build website app**.
3. Click **Run workflow**.
4. Enter your HTTPS website URL, app name, and window dimensions.
5. Download the artifact for your operating system.

No Node.js, npm, Rust, or local compiler is needed on your computer. The workflow builds all available platform artifacts:

- **Windows:** direct `.exe` app bundle
- **macOS:** `.app` / DMG output
- **Linux:** AppImage and Debian package output

## CLI

For local developer builds, install dependencies using pnpm and run:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm webtoapp https://portal.example.com --name "Example Portal"
```

Or use it through npm after the package is published:

```bash
npx webtoapp https://portal.example.com --name "Example Portal"
```

Useful options:

```bash
webtoapp https://portal.example.com \
  --name "Example Portal" \
  --width 1280 --height 820 \
  --safe-domain auth.example.com,help.example.com \
  --new-window
```

Run `webtoapp --help` for all options. Use `--json` when automating the CLI.

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run cli:build
pnpm test
pnpm run build
```

## Project layout

- `cli/` — Webtoapp command-line builder
- `src-tauri/` — Tauri/Rust desktop runtime and webview configuration
- `schema/` — CLI configuration schema
- `tests/` — CLI and builder tests
- `.github/workflows/` — automated test, build, and release pipelines

## License and attribution

Webtoapp is a rebranded fork of Pake and is licensed under **GPL-3.0-or-later**. Pake’s output exception is retained in [`LICENSE-EXCEPTION`](LICENSE-EXCEPTION), so standard generated apps can be distributed under terms chosen by the builder. See [`NOTICE.md`](NOTICE.md) and [`TRADEMARK.md`](TRADEMARK.md) for upstream attribution and trademark guidance.
