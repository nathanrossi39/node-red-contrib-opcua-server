![Platform Node-RED](https://img.shields.io/badge/Platform-Node--RED-red.png)
![Contrib OPC UA](http://b.repl.ca/v1/Contrib-OPC--UA-blue.png)
![License](https://img.shields.io/badge/License-MIT-orange.png)
[![NPM version](https://badge.fury.io/js/node-red-contrib-opcua-compact-server.png)](https://www.npmjs.com/package/node-red-contrib-opcua-compact-server)
![NodeJS_Version](https://img.shields.io/badge/NodeJS->=18-green.png)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Repository GitHub](http://b.repl.ca/v1/Repository-GitHub-orange.png)](https://github.com/nathanrossi39/node-red-contrib-opcua-server)

# node-red-contrib-opcua-compact-server

A production-oriented, programmable **OPC UA server for Node-RED**. Expose
any data flowing through Node-RED - from PLCs, MQTT, Modbus, databases, or
anything else with a Node-RED node - as browsable OPC UA tags that any
standard OPC UA client can read, subscribe to, and write back to.

Because it runs inside Node-RED, you get an OPC UA server that's driven by
flows and a live tag dictionary instead of a fixed vendor configuration -
useful as a lightweight, self-hosted industrial data server or gateway
feeding SCADA systems, MES / manufacturing analytics platforms, historians,
and HMI clients.

## Highlights

- **Programmable address space** - expose whatever tags you want, in
  whatever folder structure you want, defined as plain data.
- **Config-driven Tag Dictionary node** - manage your tags in an editable
  table right in the Node-RED editor (folder, tag name, data type) instead
  of hand-writing code. Includes an "Import from JSON" tool to migrate an
  existing tag dictionary in a single paste.
- **Live data with quality flagging** - tags report proper OPC UA
  quality/status codes. If the underlying data source stops updating,
  tags automatically flip to a *Bad* status (e.g. `BadNoCommunication`)
  so clients can tell live data from stale data, then recover to *Good*
  when data resumes - the same quality-signalling behaviour industrial
  gateways use to indicate a device or connection is down.
- **Configurable limits** - session, connection-per-endpoint, and
  subscription limits are all set per node, so you can size the server
  for real client loads rather than relying on low defaults.
- **No OpenSSL required** - the default self-signed demo certificate is
  generated entirely in JavaScript at install time, with no external
  OpenSSL binary needed. This makes it deployable on locked-down and
  security-hardened Windows servers where installing OpenSSL isn't an
  option.
- **Production-stability focused** - actively maintained, with the
  underlying `node-opcua` kept current and a growing test suite. See
  [What's different](#whats-different-from-upstream) and
  [CHANGELOG.md](./CHANGELOG.md).

## Background

This is a **maintained fork** of
[`node-red-contrib-opcua-server`](https://github.com/BiancoRoyal/node-red-contrib-opcua-server)
by Klaus Landsdorf / Bianco Royal, which has been marked deprecated and is
no longer actively maintained upstream. It continues that project as a new
development line under new maintainership, focused on fixing
production-stability issues and adding practical, deployment-focused
features.

The server node is registered under a new type - `opcua-compact-server-v2`
- so it is distinct from the deprecated original and the two can be
installed side by side. The configuration format is otherwise unchanged;
see [Migrating from the original](#migrating-from-the-original) below.

## What's different from upstream

- **Replaced the deprecated `vm2` sandbox** (which had critical,
  unpatched sandbox-escape vulnerabilities) with Node's built-in `vm`
  module.
- **Fixed a sandboxed timer bug** in address-space scripts where
  `setTimeout`/`setInterval` cleanup and error-handling never actually
  applied - which could leak timers and, for uncaught `setInterval`
  errors, crash the whole Node-RED process.
- **Updated `node-opcua`** to a current release (required for certificate
  generation to work on modern OpenSSL, among other fixes), and resolved
  several issues this surfaced (server-start race conditions, an
  unhandled-rejection crash path, a silently-ignored subscription limit,
  and discovery-registration configuration being ignored).
- **Added new features**: the Tag Dictionary config node, Bad-quality tag
  flagging on stale data, a per-node Namespace URI field, an External
  Helper Module field (load shared address-space logic from a file with
  no `settings.js` changes), startup warnings for insecure/unbounded
  defaults, and OpenSSL-free certificate generation.

Full detail is in [CHANGELOG.md](./CHANGELOG.md).

## Core

Uses the next generation node-opcua version from
[Etienne Rossignon](https://github.com/erossignon/).

## Install

Run the following command in your Node-RED user directory - typically
`~/.node-red`:

    npm install node-red-contrib-opcua-compact-server

Or install it from the Node-RED editor via **Manage palette &rarr;
Install** and search for `node-red-contrib-opcua-compact-server`.

Try these options on npm install to build from source if you have problems
installing:

    --unsafe-perm --build-from-source

## Migrating from the original

Coming from the deprecated `node-red-contrib-opcua-server` package? Install
this package (it can sit alongside the original, since it registers a
distinct node type). Because the server node type changed from
`opcua-compact-server` to `opcua-compact-server-v2`, existing flows do
**not** switch over automatically - Node-RED matches nodes to flows by
type, so the old node will not become this one on its own.

To migrate a flow, drop in a new **Compact-Server v2** node in place of
each old server node and re-enter its configuration. Every configuration
field is unchanged, so the settings map across one-to-one. Once every flow
has been moved over, you can uninstall the original package.

## Getting started

A complete, self-contained example flow is included under `examples/`
(`opcua-blueprint-full-example-flow.json`) - import it from the Node-RED
editor (**menu &rarr; Import**) to see the Tag Dictionary node, live data
simulation, and quality flagging all working together on
`opc.tcp://localhost:4841`, with no external infrastructure needed. See
`examples/opcua-blueprint-setup.md` for a walkthrough.

## Debug

Verbose logging provides useful information when IDE or console debugging
isn't possible. Start Node-RED in verbose (`-v`) mode:

    DEBUG=opcuaCompact* node-red -v 1>Node-RED-OPC-UA-Server.log 2>&1

or on local Node-RED:

    DEBUG=opcuaCompact* node red.js -v 1>Node-RED-OPC-UA-Server.log 2>&1

## Security note

The auto-generated certificate is a self-signed **demo** certificate, and
anonymous access is available for easy first-run setup. The server warns at
startup when it's running with these convenience defaults. For production
use, configure your own certificate and disable anonymous access.

## Code Style

Prettier

## Contribution

Contributions are welcome! Please open an issue or pull request on
[GitHub](https://github.com/nathanrossi39/node-red-contrib-opcua-server).

#### Happy coding!

## License

MIT license. Based on the original work by Klaus Landsdorf (Bianco Royal
Software Innovations), Copyright (c) 2018-2022, with fork additions
Copyright (c) 2026 Nathan Rossi. See [LICENSE](./LICENSE).