# Webtoapp CLI

The `webtoapp` command creates and validates secure, repeatable desktop-wrapper projects without opening the Studio GUI.

## Install

Use it once with `npx`:

```bash
npx webtoapp@latest --help
```

Or install it globally:

```bash
npm install --global webtoapp
webtoapp --version
```

For a project-local install:

```bash
npm install --save-dev webtoapp
npx webtoapp doctor
```

> The published CLI has no runtime dependency on Electron. Electron is only needed when running the visual Studio or when installing dependencies in a generated desktop project.

## Commands

### Initialize a project

```bash
webtoapp init ./acme-portal \
  --name "Acme Portal" \
  --url https://portal.example.com \
  --id com.acme.portal
```

This creates `./acme-portal/webtoapp.config.json`.

### Validate configuration

```bash
webtoapp validate ./acme-portal/webtoapp.config.json
```

Remote website targets must use HTTPS. HTTP is accepted only for local loopback development URLs such as `http://localhost:5173`.

### Inspect security settings

```bash
webtoapp inspect ./acme-portal/webtoapp.config.json
webtoapp doctor ./acme-portal/webtoapp.config.json
```

### Generate a desktop app project

```bash
webtoapp build ./acme-portal/webtoapp.config.json --output ./acme-portal/desktop
cd ./acme-portal/desktop
npm install
npm start
npm run package
```

`build` refuses to overwrite a non-empty directory. Use `--force` only when you deliberately want to replace a generated output:

```bash
webtoapp build webtoapp.config.json --output ./desktop --force
```

## Generated app security

Generated Electron wrappers use a sandboxed renderer, context isolation, disabled Node integration, navigation host allow-listing, and a restricted external-link handoff. Review generated code before distribution, especially if you customize preload APIs or navigation behavior.
