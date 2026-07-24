![Platform Node-RED](https://img.shields.io/badge/Platform-Node--RED-red.png)
![Contrib OPC UA](http://b.repl.ca/v1/Contrib-OPC--UA-blue.png)
![License](https://img.shields.io/badge/License-MIT-orange.png)
[![NPM version](https://badge.fury.io/js/node-red-contrib-opcua-compact-server.png)](https://www.npmjs.com/package/node-red-contrib-opcua-compact-server)
![NodeJS_Version](https://img.shields.io/badge/NodeJS-14.19.1-green.png)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Repository GitHub](http://b.repl.ca/v1/Repository-GitHub-orange.png)](https://github.com/nathanrossi39/node-red-contrib-opcua-server)

# node-red-contrib-opcua-compact-server

A programmable OPC UA server for Node-RED based on the node-opcua next generation version, with fewer dependencies.

This is a **maintained fork** of [`node-red-contrib-opcua-server`](https://github.com/BiancoRoyal/node-red-contrib-opcua-server) by Klaus Landsdorf / Bianco Royal, which has been marked deprecated and is no longer actively maintained upstream. This fork keeps the same core functionality and configuration format, and focuses on fixing production-stability issues rather than a full rewrite.

## What's different from upstream

- **Fixed a sandboxed timer bug** in address-space scripts: the `setTimeout`/`setInterval` wrappers exposed inside the vm2 sandbox never actually applied their cleanup and error-handling logic, due to the wrapped callback being assigned *after* the real timer was already scheduled. In practice this meant:
  - `setTimeout` calls in user scripts leaked entries into an internal tracking array for the life of the node.
  - Uncaught errors inside `setInterval` callbacks could crash the whole Node-RED process instead of being reported via `node.error()`.
  See `src/core/server-sandbox.js` and its accompanying tests in `test/core/server-sandbox.test.js` for details.
- Ongoing fixes and stability improvements will be tracked in [CHANGELOG.md](./CHANGELOG.md).

## Core

Uses the next generation node-opcua version from [Etienne Rossignon](https://github.com/erossignon/).

## Install

Run the following command in your Node-RED user directory - typically `~/.node-red`

    npm install node-red-contrib-opcua-compact-server

Try these options on npm install to build from source if you have problems installing:

    --unsafe-perm --build-from-source

> If you're migrating from the original `node-red-contrib-opcua-server` package, uninstall that package first, then install this one. The node type (`opcua-compact-server`) and configuration format are unchanged, so existing flows should continue to work without modification.

## Debug

Debugging on remote devices is important to help users. Verbose logging
provides useful information when IDE or console debugging isn't possible.

Start Node-RED in verbose (-v) mode to get verbose logging:

    DEBUG=opcuaCompact* node-red -v 1>Node-RED-OPC-UA-Server.log 2>&1

or on local Node-RED

    DEBUG=opcuaCompact* node red.js -v 1>Node-RED-OPC-UA-Server.log 2>&1

## Code Style

Prettier

## Contribution

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/nathanrossi39/node-red-contrib-opcua-server).

#### Happy coding!

## License

MIT license. Based on the original work by Klaus Landsdorf (Bianco Royal Software Innovations), Copyright (c) 2018-2022, with fork additions Copyright (c) 2026 Nathan Rossi. See [LICENSE](./LICENSE).
