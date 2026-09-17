#!/usr/bin/env node
"use strict";

/**
 * Generates the self-signed demo certificate and private key this
 * package uses by default, entirely in pure JavaScript - no OpenSSL
 * installation required anywhere, on any platform.
 *
 * This replaces the previous approach of shelling out to node-opcua-pki's
 * CLI (which itself shelled out to a system 'openssl' binary), which
 * caused real, repeated friction deploying to Windows machines and
 * locked-down/security-hardened servers where OpenSSL either wasn't
 * present or couldn't be installed at all.
 *
 * node-opcua-pki (a dependency we already have) includes a genuine,
 * documented pure-JS certificate generation path (its own source calls
 * this the "without_openssl" toolbox) via CertificateManager's "native"
 * backend, using node-opcua-crypto directly instead of shelling out to
 * any external binary. This has been verified end-to-end against a real
 * OPCUAServer and a real connecting OPCUAClient, with the openssl binary
 * completely removed from the test system to confirm zero dependency on
 * it - not just checked in isolation.
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const { CertificateManager } = require("node-opcua-pki");
const { makeApplicationUrn } = require("node-opcua-common");

const CERT_DIR = path.join(__dirname, "certificates");
const KEY_SIZE = 2048;
const CERT_FILE = path.join(
  CERT_DIR,
  "server_selfsigned_cert_" + KEY_SIZE + ".pem"
);
const KEY_FILE = path.join(CERT_DIR, "server_key_" + KEY_SIZE + ".pem");

// Collect every hostname and IP address this server may be reached by, so
// they all go into the certificate's Subject Alternative Name (SAN).
// node-opcua advertises the machine's fully-qualified domain name (FQDN) in
// its endpoints; if the cert's SAN doesn't list it, strict OPC UA clients
// reject the connection and node-opcua logs
// "NODE-OPCUA-W26 Certificate SAN is missing ...". Including the FQDN
// (resolved exactly the way node-opcua resolves it), the short hostname,
// localhost, and all local IPs makes the cert match however a client
// addresses the server - by name or by IP.
async function collectSubjectAltNames(hostname) {
  const dnsNames = new Set([hostname, "localhost"]);
  try {
    const {
      extractFullyQualifiedDomainName,
    } = require("node-opcua-hostname");
    const fqdn = await extractFullyQualifiedDomainName();
    if (fqdn) {
      dnsNames.add(fqdn);
    }
  } catch (err) {
    // node-opcua-hostname unavailable or the FQDN could not be resolved -
    // the short hostname (added above) still covers the common case.
  }

  const ipAddresses = new Set(["127.0.0.1", "::1"]);
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface && !iface.internal && iface.address) {
        // strip any IPv6 zone index, e.g. "fe80::1%eth0"
        ipAddresses.add(iface.address.split("%")[0]);
      }
    }
  }

  return {
    dns: Array.from(dnsNames).filter(Boolean),
    ip: Array.from(ipAddresses),
  };
}

async function generateServerCertificate() {
  fs.mkdirSync(CERT_DIR, { recursive: true });

  const hostname = os.hostname();
  // Matches node-opcua-server's own default applicationUri exactly
  // (base_server.js: makeApplicationUrn(os.hostname(), "NodeOPCUA-Server"))
  // so a server using this certificate with its own default
  // applicationUri (i.e. not overriding it) won't get an applicationUri
  // mismatch warning.
  const applicationUri = makeApplicationUrn(hostname, "NodeOPCUA-Server");

  const { dns: dnsNames, ip: ipAddresses } =
    await collectSubjectAltNames(hostname);

  // Scratch working directory for CertificateManager's own private-key
  // bookkeeping. The actual output files this package uses are written
  // to CERT_FILE/KEY_FILE below, copied out of this scratch area - so
  // this location is an implementation detail, not something anything
  // else in this package should ever read from directly.
  const pkiScratchDir = path.join(CERT_DIR, ".pki");

  const certManager = new CertificateManager({
    location: pkiScratchDir,
    keySize: KEY_SIZE,
  });
  await certManager.initialize();

  await certManager.createSelfSignedCertificate({
    applicationUri: applicationUri,
    dns: dnsNames,
    ip: ipAddresses,
    subject: "CN=" + hostname,
    startDate: new Date(),
    validity: 365 * 5, // 5 years
    outputFile: CERT_FILE,
  });

  fs.copyFileSync(certManager.privateKey, KEY_FILE);

  return { dns: dnsNames, ip: ipAddresses };
}

async function main() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    console.log(
      "Certificate and private key already exist - skipping generation."
    );
    console.log("  Certificate:", CERT_FILE);
    console.log("  Private key:", KEY_FILE);
    console.log(
      "Delete these files (or the whole certificates/ folder) to force regeneration."
    );
    return;
  }

  console.log(
    "Generating self-signed demo certificate (pure JavaScript, no OpenSSL required)..."
  );
  const san = await generateServerCertificate();
  console.log("Done.");
  console.log("  Certificate:", CERT_FILE);
  console.log("  Private key:", KEY_FILE);
  console.log("  SAN DNS names:", san.dns.join(", "));
  console.log("  SAN IP addresses:", san.ip.join(", "));
}

main().catch((err) => {
  console.error("ERROR generating certificate:", err.message);
  console.error(err.stack);
  process.exit(1);
});