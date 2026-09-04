# Webtoapp

**Webtoapp is a native desktop GUI for opening trusted websites as focused app windows.** Enter a name and HTTPS URL, then launch it in the operating system’s native WebView—separate from browser tabs and without a local website build process.

> Webtoapp opens sites you own or are authorized to use. It does not download a website’s source, bypass access controls, or remove subscription requirements.

## What it does

- Native GUI for Windows, macOS, and Linux
- Launches websites in their own resizable desktop windows
- Remembers recently opened website apps locally
- HTTPS-first URL validation; local HTTP is allowed only for loopback development
- Supports multiple independently named website windows
- Uses the operating system WebView instead of bundling a large Chromium runtime

## Download a GUI executable

A Webtoapp GUI release is built for all supported platforms. From the repository:

1. Open **Actions** → **Build Webtoapp GUI**.
2. Click **Run workflow**.
3. Download the artifact for your operating system after it completes.

No URL form is required in GitHub Actions. The native Webtoapp GUI contains the website-name, URL, and window-size form.

### Artifacts

- **Windows:** NSIS `.exe` installer
- **macOS:** `.dmg` containing the Webtoapp app
- **Linux:** `.AppImage` and `.deb`

## Use the GUI

1. Launch Webtoapp.
2. Enter an app name—for example, `YouTube`.
3. Enter the target URL—for example, `https://www.youtube.com`.
4. Choose the initial window width and height.
5. Click **Open website app**.

Webtoapp opens the site in a new native app window and saves it in **Quick launch** for later reuse.

## Development

The executable is built with Tauri/Rust. These tools are only needed by people building Webtoapp itself, not by normal GUI users.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

## Automation

- `.github/workflows/test.yml` runs the test suite automatically.
- `.github/workflows/build.yml` manually creates GUI artifacts for Windows, macOS, and Linux.
- `.github/workflows/release.yml` builds and publishes GitHub Release assets on `v*` tags.

## Attribution and license

Webtoapp is a rebranded, modified fork of [Pake](https://github.com/tw93/Pake). It is licensed under **GPL-3.0-or-later**. Pake’s output exception is retained in [`LICENSE-EXCEPTION`](LICENSE-EXCEPTION), and upstream attribution is recorded in [`NOTICE.md`](NOTICE.md) and [`TRADEMARK.md`](TRADEMARK.md).
