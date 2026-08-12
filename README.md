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
npm run cli -- build ./my-app/webtoapp.config.json --output ./my-app/desktop
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

## CLI

```text
webtoapp init [directory] [--name NAME] [--url URL] [--id APP_ID]
webtoapp validate [config]
webtoapp inspect [config]
webtoapp build [config] [--output directory] [--force]
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

The GitHub Actions test workflow checks supported Node versions, typechecks, and runs the unit/integration tests. The release workflow runs only on version tags (`v*`) and publishes desktop artifacts and a GitHub release.

## Project layout

- `src/core` — validation, config I/O, and deterministic project generator
- `src/cli` — automation-friendly CLI
- `src/gui` — Electron main process and Studio interface
- `src/test` — Node-native tests
- `.github/workflows` — test and release automation

## Security model

Generated wrappers use a sandboxed renderer with `contextIsolation` enabled and `nodeIntegration` disabled. Navigation is restricted to your configured hosts. New windows are prevented; approved links can be handed to the system browser. Review the generated project before distribution, especially when adding preload APIs or changing navigation policy.
