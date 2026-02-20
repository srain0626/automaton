#!/data/data/com.termux/files/usr/bin/sh
# Conway Automaton — Termux Native Installer
# Installs and runs the automaton directly inside Termux on Android.
#
# Usage:
#   curl -fsSL https://conway.tech/install-termux.sh | sh
#
# Requirements: Termux (https://termux.dev) with internet access.
set -e

echo "[automaton] Termux native installer starting..."

# ── 1. Install required system packages ──────────────────────────────────────
echo "[automaton] Installing required Termux packages..."
if ! pkg update -y; then
  echo "[automaton] ERROR: 'pkg update' failed. Check your internet connection and try again." >&2
  exit 1
fi
if ! pkg install -y nodejs-lts git python make clang binutils; then
  echo "[automaton] ERROR: Package installation failed. Ensure Termux has internet access and try again." >&2
  exit 1
fi

# ── 2. Clone (or update) the repository ─────────────────────────────────────
INSTALL_DIR="$HOME/automaton"

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "[automaton] Existing installation found at $INSTALL_DIR — pulling latest..."
  cd "$INSTALL_DIR"
  git pull
else
  echo "[automaton] Cloning automaton to $INSTALL_DIR ..."
  git clone https://github.com/Conway-Research/automaton.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# ── 3. Install Node dependencies and build ───────────────────────────────────
echo "[automaton] Installing dependencies..."
npm install

echo "[automaton] Building..."
npm run build

# ── 4. Launch the automaton ───────────────────────────────────────────────────
echo "[automaton] Starting Conway Automaton..."
node dist/index.js --run
