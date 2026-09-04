# Webtoapp Studio

**Package a trusted website as a focused desktop application.** Webtoapp includes:

- a native Electron studio for configuring and exporting a wrapper app;
- a fast CLI for repeatable builds in local development and CI;
- a secure generated application template (context isolation, sandboxing, navigation allow-listing, external links opened in the browser);
- GitHub Actions for tests and tagged cross-platform release artifacts.

> Webtoapp wraps sites you own or are authorized to distribute. It is not a scraper and does not bypass website access controls.

## Quick start

```bash
npm install
npm run gui
# or use the CLI
npm run cli -- init ./my-app --url https://example.com --name "Example"
npm run cli -- validate ./my-app/webtoapp.config.json
npm run cli -- build ./my-app/webtoapp.config.json --output ./my-app/project
# generate and package a runnable no-installer app for your current OS
npm run cli -- package ./my-app/webtoapp.config.json --output ./my-app/portable --portable
```

The generated `desktop/` folder is a self-contained Electron project. Install its dependencies and run it:

```bash
cd my-app/desktop
npm install
npm start
# package an installer for the current platform
npm run package
```

## Install the CLI

After publishing, use the CLI without cloning this repository:

```bash
npx webtoapp@latest --help
# or
npm install --global webtoapp
webtoapp --version
```

See [CLI.md](CLI.md) for command examples and [PUBLISHING.md](PUBLISHING.md) for the maintainer release checklist.

## Build directly from Studio — no npm required

Download and run a portable Webtoapp Studio release, enter your website URL, then click **Build portable app**. Studio clones its own bundled Electron runtime and replaces the app payload with your website configuration. The result is immediately runnable and does **not** require Node.js, npm, an installer, or any developer tools on your machine.

- Windows: a folder containing `<Your App>.exe` and its required `resources` directory
- macOS: a portable `.app` bundle
- Linux: a portable app folder and executable

## Developer portable builds

For source-checkout development, build an app that runs without an installer:

```bash
# Creates an unpacked runnable folder for the current OS in release/
npm run portable

# On Windows, creates one portable .exe in release/
npm run portable:win
```

Source-checkout setup scripts are also included:

```bash
./install.sh             # install dependencies and compile the CLI
./install.sh --global    # also install the webtoapp command globally
./install.sh --portable  # create an unpacked portable desktop app

install.bat --global     # Windows global CLI setup
install.bat --portable   # Windows portable .exe
```

## Release updates

Packaged releases check the GitHub Releases feed automatically after launch. Installable Windows builds use the NSIS update channel to download updates in the background and apply them when the app restarts; macOS and Linux release formats use their supported update metadata. The **Check updates** button is also available in Studio.

The portable Windows `.exe` intentionally has no installer and cannot overwrite its own running file safely. It shows **Get latest version** instead, which opens the latest GitHub Release so you can replace the portable executable yourself. Release builds include both the portable `.exe` and the NSIS update-channel artifact.

## CLI

```text
webtoapp init [directory] [--name NAME] [--url URL] [--id APP_ID]
webtoapp validate [config]
webtoapp inspect [config]
webtoapp build [config] [--output directory] [--force]
webtoapp package [config] [--output directory] [--portable|--full] [--force]
webtoapp doctor [config]
```

`init` writes `webtoapp.config.json`; `build` creates an Electron project, rather than silently downloading or packaging a browser runtime. This makes generated apps auditable and easy to customize.

## Configuration

```json
{
  "$schema": "https://webtoapp.dev/schema/v1",
  "appName": "Acme Portal",
  "appId": "com.acme.portal",
  "website": "https://portal.acme.test",
  "themeColor": "#6D5DFB",
  "window": {
    "width": 1280,
    "height": 820,
    "minWidth": 960,
    "minHeight": 640
  },
  "behavior": {
    "allowNavigation": ["portal.acme.test"],
    "openExternalLinks": true,
    "showMenuBar": false
  }
}
```

Only HTTPS URLs are accepted by default. `http://localhost` and loopback URLs are allowed for local development. The primary website hostname is always automatically allow-listed.

## Development

```bash
npm run typecheck
npm test
npm run build
npm run package
```

The GitHub Actions test workflow automatically runs on Ubuntu, macOS, and Windows (with Node 20 and 22 coverage); it typechecks, tests, and compiles the app. `build.yml` is manual-only and exports portable builds for all three operating systems. The release workflow runs only on version tags (`v*`) and publishes desktop artifacts and a GitHub release.

## Project layout

- `src/core` — validation, config I/O, and deterministic project generator
- `src/cli` — automation-friendly CLI
- `src/gui` — Electron main process and Studio interface
- `src/test` — Node-native tests
- `.github/workflows` — test and release automation

## Security model

Generated wrappers use a sandboxed renderer with `contextIsolation` enabled and `nodeIntegration` disabled. Navigation is restricted to your configured hosts. New windows are prevented; approved links can be handed to the system browser. Review the generated project before distribution, especially when adding preload APIs or changing navigation policy.
