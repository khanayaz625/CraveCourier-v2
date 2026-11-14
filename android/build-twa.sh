#!/usr/bin/env bash
# ==============================================================================
# Crave Trusted Web Activity (TWA) Builder (macOS / Linux)
# Uses Google's @bubblewrap/cli to build the signed Android App Bundle (.aab)
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo "  Crave TWA Android App Bundle Builder"
echo "========================================================"
echo

if ! command -v npx &> /dev/null; then
    echo "[ERROR] npx is not installed or not in PATH. Please install Node.js."
    exit 1
fi

if [ ! -f "twa-manifest.json" ]; then
    echo "[ERROR] twa-manifest.json not found in current directory."
    echo "Please make sure you run this script inside the Crave android/ directory."
    exit 1
fi

if [ ! -f "crave-release-key.keystore" ]; then
    echo "[NOTICE] crave-release-key.keystore not found."
    echo "Running ./generate-keystore.sh first..."
    chmod +x generate-keystore.sh
    ./generate-keystore.sh
fi

echo
echo "Running Bubblewrap build..."
echo "If this is your first run, Bubblewrap will download Android SDK / Command Line Tools automatically."
echo

npx @bubblewrap/cli build

echo
echo "========================================================"
echo "[SUCCESS] Android App Bundle (.aab) built successfully!"
echo "Look for: app-release-bundle.aab in the android directory."
echo "You can now upload this file to the Google Play Console!"
echo "========================================================"

