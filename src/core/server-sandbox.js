/** Licensed under MIT - see LICENSE for full copyright notices. **/
"use strict";

// NOTE ON ISOLATION:
// This previously used vm2, which has been deprecated by its own maintainers
// due to multiple critical, unpatched sandbox-escape vulnerabilities (e.g.
// CVE-2026-22709, CVE-2026-26956) and is unsafe to run in production.
//
// vm2 was never providing a hard security boundary for this specific use
// case anyway: address-space scripts are handed live references to the
// actual node-opcua `server` and `addressSpace` objects so they can build
// out the OPC UA namespace, which is fundamentally incompatible with a
// true isolate-based sandbox (e.g. isolated-vm) that only allows plain
// data or hand-wrapped references across its boundary. Anyone able to
// edit a Node-RED flow already has full code-execution privileges in
// Node-RED itself (via core Function/exec nodes), so this was always a
// scoped-context convenience rather than a defense against a hostile
// script author.
//
// This now uses Node's own built-in `vm` module instead: no extra
// dependency, actively maintained by Node core, and it makes the same
// non-guarantee explicit — Node's docs state plainly that `vm` "is not a
// security mechanism. Do not use it to run untrusted code." That has
// always been true here; this change just stops pretending otherwise
// while keeping the same crash-containment and scoped-globals behavior
// address-space scripts rely on.
const vm = require("vm");

module.exports = {
  choreCompact: require("./chore").de.bianco.royal.compact,
  debugLog: require("./chore").de.bianco.royal.compact.opcuaSandboxDebug,
  errorLog: require("./chore").de.bianco.royal.compact.opcuaErrorDebug,
  initialize: (node, coreServer, done, extraGlobals) => {
    node.outstandingTimers = [];
    node.outstandingIntervals = [];

    // Only 'fs' needs to be exposed via require() - Math/Date/JSON etc.
    // are already standard globals available in any V8 context. console
    // is injected explicitly below since node:vm contexts don't include
    // it by default.
    const allowedRequires = ["fs"];

    /* istanbul ignore next */
    const sandbox = Object.assign(
      {
        node,
        coreServer,
        console,
        require: (moduleName) => {
          if (!allowedRequires.includes(moduleName)) {
            throw new Error(
              "require('" +
                moduleName +
                "') is not permitted inside an address space script. Allowed built-ins: " +
                allowedRequires.join(", ")
            );
          }
          return require(moduleName);
        },
      },
      extraGlobals
    );
    Object.assign(sandbox, {
      sandboxNodeContext: {
        set: function () {
          node.context().set.apply(node, arguments);
        },
        get: function () {
          return node.context().get.apply(node, arguments);
        },
        keys: function () {
          return node.context().keys.apply(node, arguments);
        },
        get global() {
          return node.context().global;
        },
        get flow() {
          return node.context().flow;
        },
      },
      sandboxFlowContext: {
        set: function () {
          node.context().flow.set.apply(node, arguments);
        },
        get: function () {
          return node.context().flow.get.apply(node, arguments);
        },
        keys: function () {
          return node.context().flow.keys.apply(node, arguments);
        },
      },
      sandboxGlobalContext: {
        set: function () {
          node.context().global.set.apply(node, arguments);
        },
        get: function () {
          return node.context().global.get.apply(node, arguments);
        },
        keys: function () {
          return node.context().global.keys.apply(node, arguments);
        },
      },
      sandboxEnv: {
        get: function (envVar) {
          const flow = node._flow;
          return flow.getSetting(envVar);
        },
      },
      setTimeout: function () {
        const args = Array.prototype.slice.call(arguments);
        const func = args[0];
        const extraArgs = args.slice(2);
        let timerId;
        args[0] = function () {
          sandbox.clearTimeout(timerId);
          try {
            func.apply(this, extraArgs);
          } catch (err) {
            node.error(err, {});
          }
        };
        timerId = setTimeout.apply(this, args);
        node.outstandingTimers.push(timerId);
        return timerId;
      },
      clearTimeout: function (id) {
        clearTimeout(id);
        const index = node.outstandingTimers.indexOf(id);
        if (index > -1) {
          node.outstandingTimers.splice(index, 1);
        }
      },
      setInterval: function () {
        const args = Array.prototype.slice.call(arguments);
        const func = args[0];
        const extraArgs = args.slice(2);
        args[0] = function () {
          try {
            func.apply(this, extraArgs);
          } catch (err) {
            node.error(err, {});
          }
        };
        const timerId = setInterval.apply(this, args);
        node.outstandingIntervals.push(timerId);
        return timerId;
      },
      clearInterval: function (id) {
        clearInterval(id);
        const index = node.outstandingIntervals.indexOf(id);
        if (index > -1) {
          node.outstandingIntervals.splice(index, 1);
        }
      },
    });

    const context = vm.createContext(sandbox);

    // Preserve the same external .run(code) interface that vm2's VM
    // instance exposed, so server-node.js and existing callers don't
    // need to change.
    const vmHandle = {
      run: (code) => {
        return vm.runInContext(code, context, {
          filename: "opcua-compact-server-address-space-script.js",
        });
      },
    };

    done(node, vmHandle);
  },
};
