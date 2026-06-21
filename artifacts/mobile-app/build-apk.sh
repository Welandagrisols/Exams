#!/usr/bin/env bash
# ============================================================
#  EduMetrics — Android APK Build Script
#  Run this from the  artifacts/mobile-app  directory.
#  Requires: Node.js 18+  (https://nodejs.org)
# ============================================================
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${CYAN}▶ $*${NC}"; }
ok()    { echo -e "${GREEN}✔ $*${NC}"; }
die()   { echo -e "${RED}✘ $*${NC}"; exit 1; }

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   EduMetrics  Android APK Builder    ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── 1. Prerequisites ─────────────────────────────────────────
info "Checking prerequisites..."
command -v node >/dev/null 2>&1 || die "Node.js not found. Install from https://nodejs.org"
ok "Node.js $(node -v)"

if ! command -v eas >/dev/null 2>&1; then
  info "Installing EAS CLI..."
  npm install -g eas-cli
fi
ok "EAS CLI $(eas --version 2>/dev/null | head -1)"

# ── 2. EXPO_TOKEN ────────────────────────────────────────────
echo ""
if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "  You need an Expo access token."
  echo "  Get yours at: https://expo.dev/accounts/agrisols2025/settings/access-tokens"
  echo ""
  read -rp "  Paste EXPO_TOKEN: " EXPO_TOKEN
  export EXPO_TOKEN
fi
ok "EXPO_TOKEN set"

# ── 3. Supabase Anon Key ─────────────────────────────────────
echo ""
if [ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "  You need your Supabase anon (public) key."
  echo "  Get it from: https://supabase.com/dashboard → your project → Settings → API"
  echo ""
  read -rp "  Paste SUPABASE_ANON_KEY: " EXPO_PUBLIC_SUPABASE_ANON_KEY
  export EXPO_PUBLIC_SUPABASE_ANON_KEY
fi
ok "Supabase key set"

# ── 4. Push the anon key as an EAS environment variable ──────
echo ""
info "Pushing Supabase anon key to EAS (preview profile)..."

push_env() {
  local name="$1" value="$2" vis="${3:-plaintext}"
  EXPO_TOKEN=$EXPO_TOKEN eas env:create \
    --name "$name" --value "$value" \
    --environment preview --visibility "$vis" \
    --non-interactive 2>/dev/null \
  || EXPO_TOKEN=$EXPO_TOKEN eas env:update \
    --name "$name" --value "$value" \
    --environment preview \
    --non-interactive 2>/dev/null \
  || true   # already exists and unchanged — safe to ignore
}

push_env "EXPO_PUBLIC_SUPABASE_ANON_KEY" "$EXPO_PUBLIC_SUPABASE_ANON_KEY" "sensitive"
ok "EAS env vars ready"

# ── 5. Build ─────────────────────────────────────────────────
echo ""
info "Submitting cloud build (android / preview / APK)..."
echo "  ┌───────────────────────────────────────────────────┐"
echo "  │  This runs on Expo's servers — usually ~10 min.   │"
echo "  │  An email will be sent to your Expo account when  │"
echo "  │  the APK is ready to download.                    │"
echo "  │                                                   │"
echo "  │  Track progress:                                  │"
echo "  │  https://expo.dev/accounts/agrisols2025/          │"
echo "  │         projects/jss-exam-analyser/builds         │"
echo "  └───────────────────────────────────────────────────┘"
echo ""

EXPO_TOKEN=$EXPO_TOKEN eas build \
  --platform android \
  --profile preview \
  --non-interactive

echo ""
ok "Build submitted! Check your email for the download link."
ok "Or visit: https://expo.dev/accounts/agrisols2025/projects/jss-exam-analyser/builds"
