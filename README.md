# Webtoapp

Webtoapp is a rebranded, maintained Electron-based website wrapper. It turns a trusted URL into a standalone desktop application for macOS, Windows, or Linux, with Chromium bundled in the generated app.

It is intentionally a CLI, like the Nativefier project it is based on:

```bash
webtoapp https://example.com --name "Example"
```

The generated app is independent of the Webtoapp CLI and can be moved or distributed on its own.

## What is included

- Native Electron apps for `darwin`, `win32`, and `linux`
- Automatic title and favicon discovery, with explicit `--name` and `--icon` overrides
- CSS and JavaScript injection with repeated `--inject` flags
- Window controls such as size, position, fullscreen, frameless, maximized, zoom, and always-on-top
- External-link handling, internal URL rules, proxy support, downloads, tray mode, and single-instance mode
- Custom user agents, language, basic authentication, GPU, cache, and certificate options
- `--upgrade` support for updating an existing Webtoapp app without losing its configuration
- A programmatic asynchronous API through `buildWebtoappApp`

Run `webtoapp --help` for every option. The longer option reference is in [DOCS.md](DOCS.md), and site-specific examples are in [HELP.md](HELP.md).

## Installation

Webtoapp requires Node.js 22.14 or newer and npm 11 or newer. From a checkout:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm link --global
```

Or install a packed release with npm once one is published:

```bash
npm install --global webtoapp
```

ImageMagick or GraphicsMagick plus `iconutil` are optional. They are only needed when Webtoapp must convert an icon to a format required by the target platform.

## Examples

```bash
# The output directory defaults to the current directory.
webtoapp https://calendar.google.com --name "Calendar"

# Choose an output directory and target platform/architecture.
webtoapp https://app.example.com ./build --platform linux --arch x64

# Keep an app portable, inject a stylesheet and script, and start maximized.
webtoapp https://portal.example.com \
  --name "Portal" \
  --portable \
  --inject ./compact.css \
  --inject ./shortcuts.js \
  --maximize

# Upgrade an existing app in place.
webtoapp --upgrade "/path/to/Portal.app"
```

Bare domains are normalized to HTTPS. Only `http://` and `https://` targets are accepted; embedded credentials and executable schemes are rejected before a build starts. Use a normal login flow inside the generated app instead of putting a password in a command line or URL.

## Development

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm build
```

`build` compiles the CLI, compiles the Electron runtime, and prepares the runtime assets that Electron Packager copies into each generated application. The generated `lib/`, `shared/lib/`, and `app/lib/` directories are build artifacts and are intentionally ignored by Git.

## Attribution and license

Webtoapp is a modified and rebranded fork of [majick/nativefier](https://github.com/majick/nativefier). Nativefier's MIT/public-domain terms and copyright notices are preserved in [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). Webtoapp is not affiliated with or endorsed by Nativefier, its original author, or its current maintainer.

Webtoapp uses Chromium through Electron. Only package websites that you own or are authorized to wrap, and review any injected code before building an app.
