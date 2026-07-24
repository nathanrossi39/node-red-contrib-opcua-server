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
