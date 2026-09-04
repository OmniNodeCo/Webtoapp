# Webtoapp development guide

Webtoapp is a TypeScript CLI and a small Electron runtime. The CLI prepares a
runtime copy with `webtoapp.json`, then Electron Packager produces the native
application for the requested platform.

## Setup

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

The build has three parts:

1. `tsc --build shared src app` compiles the CLI, shared option model, and
   runtime declarations.
2. Webpack bundles `app/src/main.ts` and its preload/runtime code.
3. The static login assets and preload source map are copied into `app/lib`.

Use the local CLI with:

```bash
node lib/cli.js https://example.com --name Example --out ./out
```

## Tests and checks

```bash
corepack pnpm test
corepack pnpm run lint:format
```

The unit suite runs against compiled output, matching what users receive from
an npm install. Full Electron packaging is intentionally not part of the unit
suite because it downloads a platform-specific Electron archive.

## Design rules

- Keep the `webtoapp` command and public API names stable. Backwards-compatible
  aliases are preferable to silently changing an existing flag.
- Treat target URLs, injected files, and browser-window JSON as untrusted input.
  Validate at the CLI boundary and keep Node integration disabled in generated
  windows.
- Metadata lookups are optional conveniences. They must have bounded timeouts
  and fall back to a safe default when a site is offline or malformed.
- Generated app configuration belongs in `webtoapp.json`; do not put secrets in
  it or in generated filenames.
- Keep the runtime small and avoid adding a dependency when a focused helper is
  easier to audit.

## Release checklist

1. Update `package.json` and `app/package.json` versions together.
2. Run `corepack pnpm install --lockfile-only` and commit the lockfile.
3. Run `corepack pnpm test` and `corepack pnpm build`.
4. Smoke-test `node lib/cli.js --help` and a local HTTP fixture.
5. Review the generated package with `pnpm pack --dry-run` before publishing.
