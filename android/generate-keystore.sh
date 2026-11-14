#!/usr/bin/env bash
# ==============================================================================
# Crave Android Release Keystore Generator (macOS / Linux)
# Generates a 2048-bit RSA production keystore and prints SHA-256 fingerprint
# ==============================================================================

set -euo pipefail

KEYSTORE_FILE="crave-release-key.keystore"
KEY_ALIAS="crave-key"
VALIDITY_DAYS=10000

echo "========================================================"
echo "  Crave Food & Grocery - Release Keystore Generator"
echo "========================================================"
echo

if [ -f "$KEYSTORE_FILE" ]; then
    echo "[WARNING] Keystore file '$KEYSTORE_FILE' already exists!"
    echo "To avoid overwriting existing signing keys, rename or delete it first."
else
    echo "Generating production keystore: $KEYSTORE_FILE"
    echo "You will be prompted to enter a Keystore Password and Certificate Details."
    echo "[IMPORTANT] Please record this password safely!"
    echo

    keytool -genkey -v \
      -keystore "$KEYSTORE_FILE" \
      -alias "$KEY_ALIAS" \
      -keyalg RSA \
      -keysize 2048 \
      -validity "$VALIDITY_DAYS"

    echo
    echo "[SUCCESS] Keystore generated successfully: $KEYSTORE_FILE"
    echo
fi

echo "========================================================"
echo "  Extracting SHA-256 Fingerprint for Digital Asset Links"
echo "========================================================"
echo "Enter the keystore password when prompted:"
echo

SHA256_FINGERPRINT=$(keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" | grep "SHA256:" | awk '{print $2}')

echo "SHA-256 Fingerprint:"
echo "$SHA256_FINGERPRINT"
echo
echo "--------------------------------------------------------"
echo "Copy the SHA-256 string above and paste it into:"
echo "  client/public/.well-known/assetlinks.json"
echo "--------------------------------------------------------"

