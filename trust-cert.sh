#!/bin/bash
# trust-cert.sh — Install the LC self-signed certificate into the Linux/browser trust store
# Run once per machine so browsers stop showing the "Not Secure" warning.
# Valery Structure

CERT="$(dirname "$0")/certs/cert.pem"

if [ ! -f "$CERT" ]; then
  echo "❌ Certificate not found at $CERT"
  echo "   Run from the project root: ./trust-cert.sh"
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "  Legacy Clinics — Certificate Trust Setup"
echo "═══════════════════════════════════════════"
echo ""

# ── Linux system trust store ────────────────────────────────────────────────
if command -v update-ca-certificates &>/dev/null; then
  echo "📦 Installing into system CA store (Debian/Ubuntu)..."
  sudo cp "$CERT" /usr/local/share/ca-certificates/legacyclinics.crt
  sudo update-ca-certificates
  echo "✅ System store updated"
  echo ""
fi

# ── NSS / Chrome / Chromium / Firefox (certutil) ────────────────────────────
if command -v certutil &>/dev/null; then
  echo "🌐 Installing into NSS databases (Chrome, Chromium, Firefox)..."
  
  # Chrome / Chromium shared NSS
  CHROME_NSS="$HOME/.pki/nssdb"
  if [ -d "$CHROME_NSS" ]; then
    certutil -A -n "LegacyClinicsLocal" -t "CT,," -i "$CERT" -d sql:"$CHROME_NSS" 2>/dev/null
    echo "   ✅ Chrome/Chromium: $CHROME_NSS"
  else
    mkdir -p "$CHROME_NSS"
    certutil -N --empty-password -d sql:"$CHROME_NSS" 2>/dev/null
    certutil -A -n "LegacyClinicsLocal" -t "CT,," -i "$CERT" -d sql:"$CHROME_NSS" 2>/dev/null
    echo "   ✅ Chrome/Chromium NSS created: $CHROME_NSS"
  fi

  # Firefox profiles
  for PROFILE_DIR in "$HOME/.mozilla/firefox/"*.default* "$HOME/.mozilla/firefox/"*.default-release; do
    if [ -d "$PROFILE_DIR" ]; then
      certutil -A -n "LegacyClinicsLocal" -t "CT,," -i "$CERT" -d sql:"$PROFILE_DIR" 2>/dev/null \
      || certutil -A -n "LegacyClinicsLocal" -t "CT,," -i "$CERT" -d "$PROFILE_DIR" 2>/dev/null
      echo "   ✅ Firefox: $(basename $PROFILE_DIR)"
    fi
  done
  echo ""
else
  echo "⚠️  certutil not found — skipping NSS (Chrome/Firefox) install."
  echo "   Install with: sudo apt install libnss3-tools"
  echo ""
fi

echo "═══════════════════════════════════════════"
echo ""
echo "✅ Done! Restart your browser and visit:"
echo "   https://cs.legacyclinics.local:8000/admin"
echo ""
echo "   If Chrome still shows a warning, paste this in the"
echo "   address bar and enable it:"
echo "   chrome://flags/#allow-insecure-localhost"
echo ""
echo "═══════════════════════════════════════════"
