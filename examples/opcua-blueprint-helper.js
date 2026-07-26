/**
 * opcua-blueprint-helper.js
 *
 * Shared backend logic for building an OPC UA address space from a
 * "blueprint" dictionary published to Node-RED flow/global context.
 *
 * WHY THIS EXISTS
 * ----------------
 * Each opcua-compact-server node's "Address Space Script" runs inside a
 * small sandboxed vm context and is edited as a plain-text field in the
 * Node-RED editor - easy to break by accident, hard to version control,
 * and (if the exact same logic is duplicated across several nodes) easy
 * for the copies to drift apart over time.
 *
 * This file moves that logic into a real, version-controlled, testable
 * JavaScript file instead. Load it once via functionGlobalContext (see
 * setup below), and every server node's own script shrinks down to a
 * couple of lines that just call into this shared function. Adding,
 * removing, or changing tags only ever means editing the blueprint data
 * itself (wherever you build OpcBlueprint/OpcData) - never touching any
 * node's script field again.
 *
 * SETUP
 * -----
 * 1. Save this file somewhere in your Node-RED user directory, e.g.
 *      ~/.node-red/lib/opcua-blueprint-helper.js
 *
 * 2. In your Node-RED settings.js, add it to functionGlobalContext:
 *
 *      functionGlobalContext: {
 *          opcuaBlueprintHelper: require('/home/pi/.node-red/lib/opcua-blueprint-helper.js')
 *      }
 *
 *    (Use an absolute path - settings.js does not resolve relative to
 *    your flow files.)
 *
 * 3. Restart Node-RED so settings.js is re-read.
 *
 * 4. In each opcua-compact-server node's "Address Space Script" field,
 *    replace the whole script with the few-line bootstrap in
 *    opcua-blueprint-node-script.js (in this same examples/ folder).
 *
 * WHAT CHANGED VS THE ORIGINAL INLINE SCRIPT
 * -------------------------------------------
 * - Cleanup now attaches to the real `node` object's "close" event
 *   instead of `this.on(...)`. In the original script, `this` inside
 *   the address-space script function is the sandbox's own global
 *   object, which never had an `.on` method - so
 *   `typeof flexServerInternals.on === "function"` was always false,
 *   and the cleanup block silently never ran. That meant the periodic
 *   data-refresh and status-update intervals were never cleared on
 *   node close/redeploy - a slow interval leak on every redeploy. This
 *   version uses the real Node-RED `node` object (an EventEmitter),
 *   which does have `.on()`, so cleanup actually runs now.
 * - All the previously-hardcoded values (context key names, folder
 *   names, refresh intervals, retry settings) are now function
 *   parameters with the same defaults as before, so behavior is
 *   unchanged out of the box but is now overridable per node without
 *   touching this file.
 */

"use strict";

/**
 * Build an OPC UA address space from a blueprint dictionary.
 *
 * @param {object} server - the OPCUAServer instance (script arg 1)
 * @param {object} addressSpace - the server's address space (script arg 2)
 * @param {object} eventObjects - shared event objects (script arg 3, unused here but passed through)
 * @param {function} done - call this when construction is complete (script arg 4)
 * @param {object} node - the real Node-RED node object (has .send, .warn, .error, .status, .on, .context())
 * @param {object} sandboxFlowContext - the node's sandboxed flow context accessor (has .get/.set)
 * @param {object} opcua - the already-loaded node-opcua module (pass coreServer.choreCompact.opcua
 *   from the sandbox - do NOT pass require('node-opcua') directly here, since this helper file lives
 *   outside the package's own node_modules tree (e.g. ~/.node-red/lib/) and a plain require('node-opcua')
 *   from that location won't resolve to the package's nested copy)
 * @param {object} [options]
 * @param {string} [options.namespaceUri="http://node-red/ua-server"] - OPC UA namespace URI. Keep
 *   this IDENTICAL across all server nodes unless you have a specific reason to change it - most
 *   OPC UA clients (including tag configurations already set up against this server) reference tag
 *   paths by this URI, so changing it per node breaks existing client tag configuration even though
 *   the server itself still works fine.
 * @param {number} [options.startupStaggerMs] - delay, in milliseconds, before this node begins
 *   building its address space. When several server nodes initialize at nearly the same moment
 *   (e.g. at Node-RED startup), calling addressSpace.registerNamespace() with the same URI at
 *   virtually the same instant across multiple OPCUAServer instances in the same process appears to
 *   trigger an internal node-opcua collision, where some nodes hang instead of completing. A small
 *   distinct-per-node delay avoids the collision without needing a different URI per node. Defaults
 *   to a value derived from node.port (see the bootstrap script) so every node gets a different
 *   stagger automatically with no manual configuration required.
 * @param {string} [options.blueprintContextKey="OpcBlueprint"] - flow context key holding the tag dictionary
 * @param {string} [options.blueprintContextStore="memoryOnly"] - flow context store name for the blueprint
 * @param {string} [options.dataContextKey="OpcData"] - flow context key holding live tag values
 * @param {string} [options.dataContextStore="memoryOnly"] - flow context store name for live data
 * @param {string} [options.namespaceUri="http://node-red/ua-server"] - OPC UA namespace URI
 * @param {string} [options.rootFolderName="Simulation Examples"] - top-level folder name
 * @param {string} [options.functionsFolderName="Functions"] - sub-folder name under the root folder
 * @param {number} [options.dataRefreshIntervalMs=200] - how often to re-read live data from context
 * @param {number} [options.statusUpdateIntervalMs=3000] - how often to refresh the node's status text
 * @param {number} [options.maxRetries=30] - how many times to poll for the blueprint before giving up
 * @param {number} [options.retryDelayMs=1000] - delay between blueprint polling attempts
 * @param {string} [options.dataHeartbeatKey="OpcDataLastUpdate"] - flow context key holding a
 *   timestamp (Date.now() milliseconds) of when live data was last actually received. Your ingest
 *   flow needs to update this alongside OpcData (see opcua-blueprint-node-script.js's companion
 *   ingest snippet). If this key is never set, staleness detection is simply skipped and tags always
 *   report Good - so this is safe to leave unconfigured if you don't need quality flagging.
 * @param {number} [options.staleDataThresholdMs=10000] - if no update has been seen within this many
 *   milliseconds (per dataHeartbeatKey), every tag reports a Bad status code instead of Good -
 *   mirroring how Kepware flags tags Bad when the underlying device/connection is down, rather than
 *   silently continuing to show the last known value as if it were current.
 * @param {string} [options.staleDataStatusCode="BadNoCommunication"] - which node-opcua StatusCodes
 *   name to report when stale (e.g. "BadNoCommunication", "BadDeviceFailure", "BadWaitingForInitialData").
 */
function buildBlueprintAddressSpace(
  server,
  addressSpace,
  eventObjects,
  done,
  node,
  sandboxFlowContext,
  opcua,
  options
) {
  const opts = Object.assign(
    {
      blueprintContextKey: "OpcBlueprint",
      blueprintContextStore: "memoryOnly",
      dataContextKey: "OpcData",
      dataContextStore: "memoryOnly",
      namespaceUri: "http://node-red/ua-server",
      rootFolderName: "Simulation Examples",
      functionsFolderName: "Functions",
      dataRefreshIntervalMs: 200,
      statusUpdateIntervalMs: 3000,
      maxRetries: 30,
      retryDelayMs: 1000,
      startupStaggerMs: 0,
      dataHeartbeatKey: "OpcDataLastUpdate",
      staleDataThresholdMs: 10000,
      staleDataStatusCode: "BadNoCommunication",
    },
    options
  );

  const Variant = opcua.Variant;
  const DataType = opcua.DataType;
  const DataValue = opcua.DataValue;
  const StatusCodes = opcua.StatusCodes;
  const staleStatusCode =
    StatusCodes[opts.staleDataStatusCode] || StatusCodes.BadNoCommunication;

  const validTypes = {
    Double: DataType.Double,
    Boolean: DataType.Boolean,
    Int16: DataType.Int16,
    Int32: DataType.Int32,
    String: DataType.String,
  };

  node.status({
    fill: "yellow",
    shape: "ring",
    text: "Waiting for Master Dictionary...",
  });

  let retryCount = 0;

  function waitForBlueprint() {
    const blueprint = sandboxFlowContext.get(
      opts.blueprintContextKey,
      opts.blueprintContextStore
    );

    if (blueprint && Object.keys(blueprint).length > 0) {
      // Stagger specifically here, right before the actual node-opcua
      // collision point (registerNamespace inside buildAddressSpace),
      // rather than delaying the whole blueprint-wait loop above - keeps
      // the stagger minimal and only where it's actually needed.
      setTimeout(() => buildAddressSpace(blueprint), opts.startupStaggerMs);
      return;
    }

    retryCount++;

    if (retryCount > opts.maxRetries) {
      node.error(
        "CRITICAL: " + opts.blueprintContextKey + " never arrived!"
      );
      node.status({
        fill: "red",
        shape: "ring",
        text: "No blueprint received",
      });
      done();
      return;
    }

    node.status({
      fill: "yellow",
      shape: "ring",
      text: "Waiting... (" + retryCount + "s)",
    });
    setTimeout(waitForBlueprint, opts.retryDelayMs);
  }

  waitForBlueprint();

  function buildAddressSpace(blueprint) {
    try {
      const namespace = addressSpace.registerNamespace(opts.namespaceUri);
      const rootFolder = addressSpace.findNode("RootFolder");
      const simFolder = namespace.addFolder(rootFolder.objects, {
        browseName: opts.rootFolderName,
      });
      const funcFolder = namespace.addFolder(simFolder, {
        browseName: opts.functionsFolderName,
      });

      const folderNames = Object.keys(blueprint);
      const totalFolders = folderNames.length;

      // Cached live data, refreshed periodically rather than read from
      // context on every single OPC UA read - keeps reads fast under
      // load from many simultaneous client subscriptions.
      let cachedData = {};
      let isStale = false; // true once no heartbeat update has been seen
      // within staleDataThresholdMs - mirrors Kepware flagging tags Bad
      // when the underlying device/connection is down, rather than
      // silently continuing to report the last known value as current.
      const dataRefreshHandle = setInterval(() => {
        cachedData =
          sandboxFlowContext.get(
            opts.dataContextKey,
            opts.dataContextStore
          ) || {};

        const lastUpdate = sandboxFlowContext.get(
          opts.dataHeartbeatKey,
          opts.dataContextStore
        );
        // If the heartbeat key was never set at all, staleness detection
        // is simply skipped (isStale stays false) - safe default for
        // anyone not using the heartbeat convention.
        if (typeof lastUpdate === "number") {
          isStale = Date.now() - lastUpdate > opts.staleDataThresholdMs;
        }
      }, opts.dataRefreshIntervalMs);

      const statusHandle = setInterval(() => {
        if (server && server.engine) {
          const count = server.engine.currentSessionCount;
          node.status({
            fill: count > 0 ? "green" : "blue",
            shape: "dot",
            text: "Sessions: " + count + " | Folders: " + totalFolders,
          });
        }
      }, opts.statusUpdateIntervalMs);

      // Use the real Node-RED node object for cleanup - it's a genuine
      // EventEmitter with .on(), unlike the sandbox's own global object
      // (see the file header comment for why the original version of
      // this cleanup silently never ran).
      node.on("close", () => {
        clearInterval(statusHandle);
        clearInterval(dataRefreshHandle);
      });

      for (let i = 0; i < totalFolders; i++) {
        const folderName = folderNames[i];
        const tagsInFolder = blueprint[folderName];
        const currentFolder = namespace.addFolder(funcFolder, {
          browseName: folderName,
        });

        const tagNames = Object.keys(tagsInFolder);

        for (let j = 0; j < tagNames.length; j++) {
          const shortTagName = tagNames[j];
          const fullPath =
            opts.rootFolderName +
            "." +
            opts.functionsFolderName +
            "." +
            folderName +
            "." +
            shortTagName;

          const rawType = tagsInFolder[shortTagName];
          const opcDataType = validTypes[rawType] || DataType.Double;

          namespace.addVariable({
            organizedBy: currentFolder,
            browseName: shortTagName,
            nodeId: "s=" + fullPath,
            dataType: opcDataType,
            minimumSamplingInterval: opts.dataRefreshIntervalMs,
            value: {
              timestamped_get: function () {
                const val =
                  cachedData[folderName + "." + shortTagName] ?? 0;

                let variant;
                switch (opcDataType) {
                  case DataType.Boolean:
                    variant = new Variant({
                      dataType: DataType.Boolean,
                      value: !!val,
                    });
                    break;
                  case DataType.Int16:
                  case DataType.Int32:
                    variant = new Variant({
                      dataType: opcDataType,
                      value: Math.round(val),
                    });
                    break;
                  case DataType.String:
                    variant = new Variant({
                      dataType: DataType.String,
                      value: String(val),
                    });
                    break;
                  default:
                    variant = new Variant({
                      dataType: DataType.Double,
                      value: Number(val) || 0,
                    });
                    break;
                }

                return new DataValue({
                  value: variant,
                  statusCode: isStale ? staleStatusCode : StatusCodes.Good,
                  sourceTimestamp: new Date(),
                });
              },
              set: function (variant) {
                node.send({
                  topic: "WriteRequest",
                  tagName: folderName + "." + shortTagName,
                  payload: variant.value,
                });
                return opcua.StatusCodes.Good;
              },
            },
          });
        }
      }

      node.warn("OPC UA Server LIVE: " + totalFolders + " folders loaded.");
      done();
    } catch (e) {
      node.error("Address space error: " + e.message);
      done();
    }
  }
}

module.exports = {
  buildBlueprintAddressSpace: buildBlueprintAddressSpace,
};
