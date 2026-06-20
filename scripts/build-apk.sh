#!/bin/bash
# Trigger EAS APK build for EduMetrics
# Run from workspace root: bash scripts/build-apk.sh

set -e

if [ -z "$EXPO_TOKEN" ]; then
  echo "ERROR: EXPO_TOKEN secret is not set."
  echo "Add it in the Secrets tab, then retry."
  exit 1
fi

echo "=== EduMetrics APK Build ==="
echo "Owner:   agrisols2025"
echo "Profile: preview (APK)"
echo ""

cd artifacts/mobile-app

EXPO_TOKEN=$EXPO_TOKEN npx eas-cli@16 build \
  --platform android \
  --profile preview \
  --non-interactive

echo ""
echo "Build submitted! Track progress at:"
echo "https://expo.dev/accounts/agrisols2025/projects/jss-exam-analyser/builds"
