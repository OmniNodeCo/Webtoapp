#!/usr/bin/env bash
# Set up Webtoapp from a source checkout. Requires Node.js 20 or newer.
# Usage: ./install.sh [--global|--portable]
set -euo pipefail

ROOT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
MODE="${1:-local}"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Webtoapp requires Node.js 20+ and npm. Install Node from https://nodejs.org/ and try again." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Webtoapp requires Node.js 20 or newer. Found: $(node --version)" >&2
  exit 1
fi

cd "$ROOT_DIR"
echo "Installing Webtoapp dependencies…"
# The CLI and TypeScript build do not need Electron's platform binary yet.
npm ci --ignore-scripts
npm run build

case "$MODE" in
  local)
    echo
    echo "Webtoapp is ready. Try: npm run cli -- --help"
    ;;
  --global)
    npm install --global "$ROOT_DIR"
    echo
    echo "Installed the webtoapp command. Try: webtoapp --help"
    ;;
  --portable)
    npm run portable
    echo
    echo "Created an unpacked, no-installer app folder in: $ROOT_DIR/release"
    ;;
  *)
    echo "Unknown option: $MODE" >&2
    echo "Usage: ./install.sh [--global|--portable]" >&2
    exit 2
    ;;
esac
