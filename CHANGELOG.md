# [1.1.0](https://github.com/nathanrossi39/node-red-contrib-opcua-server) (2026)

### Bug Fixes

* bumped `node-opcua` from a multi-year-old `~2.64.1` to current `~2.175.2`.
  Required to fix certificate generation failing outright on any system with
  OpenSSL 3.5+ (current Raspberry Pi OS, Debian 12+, Ubuntu 24.04+).
* `create_certificates.js` no longer reaches into `node-opcua-pki`'s
  internals via a deep, unexported `require()` path - resolves the package
  properly and runs its CLI as a subprocess instead, robust against future
  `node-opcua-pki` releases restructuring their own internals.
* fixed a genuine pre-existing race condition where sandbox initialization
  and `opcuaServer.initialize()` ran as two independent, unsynchronized
  async chains touching the same mutable reference - could silently hang
  the server forever with no error reported.
* numeric config fields (session/connection/subscription/node limits) left
  blank in the editor now correctly fall back to `node-opcua`'s own
  defaults instead of throwing an uncaught internal error.
* `maxAllowedSubscriptionNumber` was silently ignored by newer `node-opcua`
  (no compatibility shim, unlike `maxAllowedSessionNumber`), always
  defaulting to 10 subscriptions per session regardless of configuration -
  now correctly mapped to `serverCapabilities.maxSubscriptionsPerSession`.
* added a guard against an internal `node-opcua` timing issue where a
  second `OPCUAServer` instance created in the same process (e.g. a
  Node-RED redeploy) could fail with `Cannot find topMostBaseTypeNode
  BaseObjectType` even though its address space already existed.
* added a scoped `unhandledRejection` safety net around server
  initialization - a `node-opcua` internal `.catch().then()` chaining bug
  could otherwise surface as a fully unhandled promise rejection, which
  crashes the entire Node.js process (not just this node) by default in
  modern Node.js.
* `registerServerMethod` (the Discovery tab's registration method
  dropdown) was silently ignored - hardcoded to `HIDDEN` regardless of
  configuration, working around a bug in the underlying lookup function
  that's now fixed. Confirmed a configured LDS endpoint with no LDS
  actually running does not crash the process on the current `node-opcua`
  version before restoring this.
* fixed two operator-precedence bugs in session lifecycle logging that
  silently dropped the log message prefix in the common case.
* replaced `vm2` (deprecated by its own maintainers, multiple critical
  unpatched sandbox-escape CVEs) with Node's built-in `vm` module.

### Features

* added an **External Helper Module** field on the Address Space Script
  tab - point it at a `.js` file path and it's loaded automatically and
  exposed to your script as `addressSpaceHelper`, with no
  `settings.js`/`functionGlobalContext` configuration required.
* added a **Namespace URI** field on the same tab, available to scripts as
  `node.namespaceUri`, so it's configurable per node without editing
  script text.
* added a startup warning (`node.warn()` + debug log) when a server node
  is running with insecure/unbounded defaults: no real certificate
  configured, anonymous access enabled, or unset session/connection/
  subscription limits. Informational only - does not block startup.

### Tests

* added real end-to-end coverage connecting an actual OPC UA client,
  creating a session, and disconnecting - exercising session lifecycle
  handlers that previously had zero test coverage.
* Jest now runs test files serially by default (`maxWorkers: 1`) - this
  suite spins up real `OPCUAServer` instances on real ports, and parallel
  worker contention was making the `node-opcua` internal timing issues
  above noticeably more likely to trigger as test flakiness.

# [1.0.0](https://github.com/nathanrossi39/node-red-contrib-opcua-server) (2026)

Forked and renamed from `node-red-contrib-opcua-server` (deprecated upstream) to
`node-red-contrib-opcua-compact-server`. All history below this point is inherited
from the original project; see the README for details on what's changed.

### Bug Fixes

* sandboxed `setTimeout`/`setInterval` wrappers in address-space scripts never
  actually applied their cleanup and error-handling logic, because the wrapped
  callback was assigned after the real timer was already scheduled. Fixed so
  fired `setTimeout` calls are correctly removed from internal tracking, and
  errors thrown inside `setInterval` callbacks are routed to `node.error()`
  instead of crashing the Node-RED process. See `src/core/server-sandbox.js`.



# [1.1.0](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/compare/v0.4.0...v1.1.0) (2022-07-31)


### Bug Fixes

* prettier style for travis ([38ed92f](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/38ed92f9889a1e5035f73fe58896e6c3ff46472e))
* remove ISA95  ([15eb1e6](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/15eb1e6f65137d07806297b39a49186179478e77))
* set back to HIDDEN default in discovery because of crashing LDS without a running LDS  ([7e7377e](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/7e7377e2c1cc998dc425a8a21214258e94a203d8))
* travis npm ([d67f905](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/d67f9050dc05c46e0901d88029456ab017b04249))
* xml sets moved but more ([a045ee9](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/a045ee926f41902f97c2b3847d390ee3eb316d8a))



# [0.4.0-alpha.0](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/compare/v0.3.1-alpha.0...v0.4.0-alpha.0) (2019-03-05)


### Bug Fixes

* **server:** HTML key inputs to short ([c71061c](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/c71061c77efd83e595c27862c8a884ef9b097498))


### Features

* new product uri access ([56f4617](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/56f4617e8074e26abbe1f205a4f834989b25738c))



## [0.3.1-alpha.0](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/compare/v0.3.0...v0.3.1-alpha.0) (2019-02-28)



# [0.3.0](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/compare/v0.3.0-alpha.2...v0.3.0) (2019-02-28)


### Bug Fixes

* vm2 not ready to use object shorthand for now ([a4dddb7](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/a4dddb7f5c0f263c2e24a39542337ac2ee09e4e7))


### Features

* **server:** use custom config on server and give more config access ([a09ebfe](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/a09ebfee1d62e8962c20327f840ee4f9ce47adf1))



## [0.2.5](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/compare/v0.2.0...v0.2.5) (2019-02-26)


### Bug Fixes

* node-red manage install missing source-map-support ([c3b9c17](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/c3b9c17d18e6f9313c8ce4841879679d5516baa4))
* npm install ([9d19ad9](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/9d19ad9ebcc0b6c62daef45dcb3ea779c95e23d0))
* **server:** html template for address space ([2d3eebb](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/2d3eebb9410136e57b3409332c5a89226cdb414b))



# [0.2.0](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/compare/v0.1.0...v0.2.0) (2019-02-26)


### Features

* **server:** add the wohle server from compact development ([4091b60](https://github.com/BiancoRoyal/node-red-contrib-opcua-server/commit/4091b604e4e34a582864a47b42630861b1742d3b))



