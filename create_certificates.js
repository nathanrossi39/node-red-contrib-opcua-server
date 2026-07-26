#!/usr/bin/env node
"use strict";

// This previously did `require('node-opcua-pki/bin/crypto_create_CA')`,
// reaching directly into an internal file path of node-opcua-pki rather
// than its declared public entry point. That works only as long as
// node-opcua-pki doesn't declare a package.json "exports" map (which
// restricts require()/import resolution to explicitly listed paths).
// Newer releases of many packages, including this one, have started
// adding "exports" maps, which makes deep-path requires like this throw
// ERR_PACKAGE_PATH_NOT_EXPORTED - notably on Node 20+ where "exports"
// enforcement is stricter. That has nothing to do with the Node.js
// version itself; it depends on which node-opcua-pki version npm
// resolves.
//
// Fixed by resolving node-opcua-pki's public main entry (always covered
// by its "exports" map, since that's the "." export every package must
// provide) and then spawning its bin script as a child process instead
// of require()-ing it. Running a file directly via `node <path>` is
// unaffected by the exports map - that only governs module resolution,
// not process execution - so this is robust regardless of whether a
// future node-opcua-pki version tightens its exports further.
//
// node-opcua-pki v6.x also restructured its CLI: the old dedicated
// bin/crypto_create_CA.js demo-certificate generator was replaced with a
// single unified bin/pki.mjs (ESM) CLI that takes an explicit 'demo'
// subcommand - which is why this script is invoked as
// `create_certificates.js demo --dev --silent -r ./certificates` rather
// than the old `create_certificates.js --dev -s -r ./certificates`.
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

function findPackageRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const pkgJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      if (pkgJson.name === "node-opcua-pki") {
        return dir;
      }
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      break;
    }
    dir = parentDir;
  }
  throw new Error("Could not locate node-opcua-pki package root");
}

const pkiMainEntry = require.resolve("node-opcua-pki");
const pkiPackageRoot = findPackageRoot(path.dirname(pkiMainEntry));
const binScript = path.join(pkiPackageRoot, "dist", "bin", "pki.mjs");

// The pki CLI shells out to the system's own 'openssl' binary to
// actually generate certificates. Unlike most Linux distributions
// (which ship OpenSSL by default), Windows does not - so on a fresh
// Windows install this would otherwise fail deep inside node-opcua-pki
// with a cryptic native/spawn error that gives no indication what's
// actually missing or how to fix it. Check up front instead and give
// clear, platform-specific guidance.
const opensslCheck = spawnSync("openssl", ["version"], {
  stdio: "pipe",
  shell: process.platform === "win32",
});

if (opensslCheck.error || opensslCheck.status !== 0) {
  console.error("");
  console.error(
    "ERROR: 'openssl' was not found on your PATH, but it's required to generate certificates."
  );
  console.error("");
  if (process.platform === "win32") {
    console.error("On Windows, install OpenSSL with one of:");
    console.error(
      "  - Git for Windows (bundles a usable openssl.exe): https://gitforwindows.org/"
    );
    console.error(
      "  - Or a dedicated build: https://slproweb.com/products/Win32OpenSSL.html"
    );
    console.error(
      "  - Or via a package manager: choco install openssl  (if you have Chocolatey)"
    );
    console.error(
      "                              winget install ShiningLight.OpenSSL"
    );
    console.error(
      "After installing, make sure openssl.exe's folder is added to your PATH,"
    );
    console.error("then open a new terminal and try again.");
  } else {
    console.error(
      "On Linux, install it via your package manager, e.g.:"
    );
    console.error("  sudo apt-get install openssl   (Debian/Ubuntu/Raspberry Pi OS)");
    console.error("  sudo yum install openssl       (RHEL/CentOS)");
    console.error("On macOS: brew install openssl");
  }
  console.error("");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [binScript, ...process.argv.slice(2)],
  {
    stdio: "inherit",
  }
);

if (result.error) {
  throw result.error;
}
process.exitCode = result.status === null ? 1 : result.status;
