# Changelog

All notable changes to Webtoapp Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A standalone npm-ready CLI distribution with `npx webtoapp@latest` and global-install support.
- CLI version reporting with `webtoapp --version`.
- CLI installation and npm publishing guides.
- A manual Windows executable build workflow that produces an NSIS `.exe` installer when explicitly started from GitHub Actions.

## [0.1.0] - 2026-08-11

### Added

- Webtoapp Studio, an Electron GUI for configuring website desktop wrappers.
- `webtoapp` CLI with `init`, `validate`, `inspect`, `build`, and `doctor` commands.
- Deterministic Electron project generator with macOS, Linux, and Windows packaging configuration.
- Secure wrapper defaults: sandboxed renderers, context isolation, disabled Node integration, navigation allow-listing, and controlled external links.
- Validation, generator, and CLI tests using Node’s native test runner.
- GitHub Actions workflows for automated tests, manual installer builds, and tag-based releases.
