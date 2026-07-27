#!/bin/bash
# deploy.sh
#
# One-shot deploy script for node-red-contrib-opcua-compact-server on
# this Pi. Pulls the latest from GitHub, rebuilds, reinstalls into
# Node-RED, copies the blueprint helper into place, and restarts
# Node-RED - all in one command. Safe to re-run any time there's a new
# update on GitHub; nothing here needs manual file editing.
#
# The ONE thing this script cannot safely automate is the one-time
# settings.js functionGlobalContext setup (see the check below) -
# settings.js is a live JS config file, not plain data, so blindly
# rewriting it risks corrupting anything already in there. That edit
# only needs to happen once, ever; this script detects whether it's
# already done and tells you clearly if not.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh

set -e  # stop immediately on any error, rather than continuing on a broken state

REPO_DIR="$HOME/node-red-contrib-opcua-server"
NODE_RED_DIR="$HOME/.node-red"
LIB_DIR="$NODE_RED_DIR/lib"
BRANCH="rebrand/node-red-contrib-opcua-compact-server"

echo "=== 1/7: Pulling latest from GitHub ==="
cd "$REPO_DIR"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "=== 2/7: Installing dependencies ==="
rm -rf node_modules package-lock.json certificates
npm install --unsafe-perm --build-from-source

echo "=== 3/7: Running test suite ==="
# This suite has a known, intermittent node-opcua internal timing flake
# (see jest.config.js's maxWorkers comment) - mitigated but not 100%
# eliminated. Since set -e treats any failure as fatal, a single flaky
# run would otherwise silently block every later step (build, install)
# with no clear indication why. Retry once before giving up for real.
if ! npm test; then
  echo ""
  echo "First test run failed - retrying once (this suite has a known,"
  echo "intermittent timing-related flake, not necessarily a real failure)..."
  echo ""
  npm test
fi

echo "=== 4/7: Building package ==="
npm run build

echo "=== 5/7: Copying blueprint helper into place ==="
mkdir -p "$LIB_DIR"
cp "$REPO_DIR/examples/opcua-blueprint-helper.js" "$LIB_DIR/opcua-blueprint-helper.js"
echo "Copied to $LIB_DIR/opcua-blueprint-helper.js"
echo ""
echo "Use this exact path in each node's 'External Helper Module' field:"
echo "  $LIB_DIR/opcua-blueprint-helper.js"
echo ""

echo "=== 6/7: Checking settings.js is wired up ==="
if grep -q "opcuaBlueprintHelper" "$NODE_RED_DIR/settings.js"; then
  echo "settings.js already references opcuaBlueprintHelper - good, nothing to do."
else
  echo ""
  echo "############################################################"
  echo "# ONE-TIME MANUAL STEP REQUIRED (only needed once, ever)   #"
  echo "############################################################"
  echo ""
  echo "settings.js does not yet load the blueprint helper. This is"
  echo "the one edit that can't be automated safely. Run:"
  echo ""
  echo "  nano $NODE_RED_DIR/settings.js"
  echo ""
  echo "Find the functionGlobalContext block and add:"
  echo ""
  echo "  functionGlobalContext: {"
  echo "      opcuaBlueprintHelper: require('$LIB_DIR/opcua-blueprint-helper.js')"
  echo "  },"
  echo ""
  echo "Then re-run this script - it will detect the change and skip"
  echo "this message next time."
  echo ""
fi

echo "=== 7/7: Reinstalling into Node-RED and restarting ==="
cd "$NODE_RED_DIR"
npm uninstall node-red-contrib-opcua-compact-server 2>/dev/null || true
npm install "$REPO_DIR" --unsafe-perm --build-from-source

node-red-stop || true
sleep 2
echo ""
echo "=== Deploy complete. Starting Node-RED with verbose logging. ==="
echo "=== Press Ctrl+C once you've confirmed it started cleanly,   ==="
echo "=== then start it normally (node-red-start or your usual     ==="
echo "=== method) for it to keep running in the background.        ==="
echo ""
node-red -v