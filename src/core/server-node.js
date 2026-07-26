/** Licensed under MIT - see LICENSE for full copyright notices. **/

module.exports = function (RED) {
  // SOURCE-MAP-REQUIRED
  "use strict";
  function OPCUACompactServerNode(nodeConfig) {
    const coreServer = require("./core/server");
    const coreServerSandbox = require("./core/server-sandbox");

    RED.nodes.createNode(this, nodeConfig);
    this.name = nodeConfig.name;
    this.port = nodeConfig.port;

    const node = this;
    let opcuaServer;
    coreServer.detailLog("create node " + node.id);
    coreServer.choreCompact.listenForErrors(node);
    coreServer.choreCompact.setStatusInit(node);
    coreServer.readConfigOfServerNode(node, nodeConfig);
    coreServer.checkInsecureDefaults(node);

    const initOPCUATimer = setTimeout(() => {
      coreServer.detailLog("pending node " + node.id);
      coreServer.choreCompact.setStatusPending(node);

      const opcuaServerOptions = coreServer.defaultServerOptions(node);
      /* opcuaServerOptions.nodeset_filename = coreServer.loadOPCUANodeSets(
        node,
        __dirname
      );*/
      node.contribOPCUACompact = {};
      node.contribOPCUACompact.initialized = false;

      // function placeholder in case something goes wrong installing the
      // real script below - still calls done() so a failure here reports
      // an error instead of hanging forever.
      /* istanbul ignore next */
      node.contribOPCUACompact.constructAddressSpaceScript = (
        server,
        addressSpace,
        eventObjects,
        done
      ) => {
        coreServerSandbox.debugLog("Init Function Block Compact Server"); // placeholder function for sandbox compile
        done();
      };

      opcuaServer = coreServer.initialize(node, opcuaServerOptions);

      // Optional: load an external JS module and expose it to the
      // address-space script as a sandbox global, without requiring any
      // settings.js/functionGlobalContext configuration. Loaded here in
      // trusted backend code (not inside the vm sandbox), so normal
      // Node.js module resolution applies - the module can itself
      // require() anything it needs normally. Left empty by default;
      // existing address-space scripts that don't reference it are
      // completely unaffected.
      let addressSpaceHelperModule;
      const helperModulePath = (
        nodeConfig.addressSpaceHelperModule || ""
      ).trim();
      if (helperModulePath) {
        try {
          addressSpaceHelperModule = require(helperModulePath);
        } catch (err) {
          node.error(
            "Could not load External Helper Module '" +
              helperModulePath +
              "': " +
              err.message
          );
        }
      }

      // Sandbox initialization must complete - and install the real
      // address-space script - BEFORE opcuaServer.initialize() is called,
      // since its callback (postInitialize) invokes
      // node.contribOPCUACompact.constructAddressSpaceScript immediately.
      // Previously these ran as two independent, unsynchronized async
      // chains that both touched that same property; if
      // opcuaServer.initialize's callback fired before the sandbox chain
      // replaced the placeholder, postInitialize would call a function
      // that never invokes done(), hanging the server forever with no
      // error reported. Sandbox setup is synchronous internally (see
      // core/server-sandbox.js), so doing it first here removes the race
      // entirely rather than relying on incidental timing between the two
      // chains.
      coreServerSandbox.initialize(
        node,
        coreServer,
        (node, vm) => {
          node.contribOPCUACompact.vm = vm;
          vm.run(
            "node.contribOPCUACompact.constructAddressSpaceScript = " +
              nodeConfig.addressSpaceScript
          );
          node.contribOPCUACompact.initialized = true;
          node.emit("server_node_running");
        },
        { addressSpaceHelper: addressSpaceHelperModule }
      );

      // node-opcua's own ServerEngine.initialize() has a .catch().then()
      // chaining bug: the .catch() handler doesn't stop the chain, so a
      // subsequent .then() can throw a brand new, completely unhandled
      // promise rejection (observed as a generic "Internal error") that
      // never reaches opcuaServer.initialize()'s own callback at all -
      // most likely to happen under resource contention from creating
      // several OPCUAServer instances in quick succession within the
      // same process, e.g. rapid Node-RED redeploys. In modern Node.js,
      // an unhandled rejection crashes the entire process by default,
      // which would take down the whole Node-RED instance, not just
      // this node. This narrow, self-removing listener converts that
      // into a normal, catchable server_start_error instead. The window
      // is intentionally as short as possible (removed as soon as our
      // own initialize() settles) to minimize the small risk of
      // capturing an unrelated rejection from elsewhere in the same
      // Node-RED process during that window.
      let initSettled = false;
      const handleUnexpectedInitRejection = (reason) => {
        if (initSettled) {
          return;
        }
        initSettled = true;
        process.removeListener(
          "unhandledRejection",
          handleUnexpectedInitRejection
        );
        coreServer.errorLog(reason);
        /* istanbul ignore next */
        node.warn(reason);
        coreServer.choreCompact.setStatusError(
          node,
          (reason && reason.message) || "internal initialization error"
        );
        node.emit("server_start_error", reason);
      };
      process.on("unhandledRejection", handleUnexpectedInitRejection);

      opcuaServer.initialize(() => {
        if (!initSettled) {
          initSettled = true;
          process.removeListener(
            "unhandledRejection",
            handleUnexpectedInitRejection
          );
        }
        coreServer.postInitialize(node, opcuaServer);
      });

      coreServer
        .run(node, opcuaServer)
        .then(() => {
          coreServer.choreCompact.setStatusActive(node);
        })
        .catch((err) => {
          /* istanbul ignore next */
          node.warn(err);
          /* istanbul ignore next */
          node.emit("server_node_error", err);
        });
    }, node.delayToInit);

    function cleanSandboxTimer(node, done) {
      if (node.outstandingTimers) {
        // only present if we init the sandbox
        while (node.outstandingTimers.length > 0) {
          /* istanbul ignore next */
          clearTimeout(node.outstandingTimers.pop());
        }
        while (node.outstandingIntervals.length > 0) {
          /* istanbul ignore next */
          clearInterval(node.outstandingIntervals.pop());
        }
      }
      coreServer.detailLog("closed node " + node.id);
      done();
    }

    function closeServer(done) {
      if (initOPCUATimer) {
        clearTimeout(initOPCUATimer);
      }

      if (opcuaServer) {
        coreServer.stop(node, opcuaServer, () => {
          setTimeout(() => {
            coreServer.choreCompact.setStatusClosed(node);
            cleanSandboxTimer(node, done);
          }, node.delayToClose);
        });
      } else {
        done();
      }
    }

    node.on("close", (done) => {
      closeServer(done);
    });
  }

  RED.httpAdmin.get(
    "/OPCUA/compact/xmlsets/public",
    RED.auth.needsPermission("opcuaCompact.xmlsets"),
    function (req, res) {
      const xmlset = [];
      const coreChore = require("./core/chore");
      xmlset.push(coreChore.de.bianco.royal.compact.opcua.nodesets.di);
      xmlset.push(coreChore.de.bianco.royal.compact.opcua.nodesets.adi);
      res.json(xmlset);
    }
  );

  RED.nodes.registerType("opcua-compact-server", OPCUACompactServerNode);
  RED.library.register("opcua");
};
