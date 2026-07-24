/**
 MIT License
 Copyright (c) 2018-2022 Klaus Landsdorf (http://node-red.plus/)
 Copyright (c) 2019 Sterfive (https://www.sterfive.com/)
 **/
"use strict";

module.exports = {
  nodeOpcuaServer: require("node-opcua-server/dist/opcua_server"),
  choreCompact: require("./chore").de.bianco.royal.compact,
  debugLog: require("./chore").de.bianco.royal.compact.opcuaServerDebug,
  detailLog: require("./chore").de.bianco.royal.compact.opcuaServerDetailsDebug,
  errorLog: require("./chore").de.bianco.royal.compact.opcuaErrorDebug,
  readConfigOfServerNode: (node, config) => {
    node.name = config.name;

    // network
    node.port = config.port;
    node.endpoint = config.endpoint;
    node.productUri = config.productUri;
    node.namespaceUri = config.namespaceUri;
    node.alternateHostname = config.alternateHostname;

    // limits
    node.maxAllowedSessionNumber = config.maxAllowedSessionNumber;
    node.maxConnectionsPerEndpoint = config.maxConnectionsPerEndpoint;
    node.maxAllowedSubscriptionNumber = config.maxAllowedSubscriptionNumber;
    node.maxNodesPerRead = config.maxNodesPerRead;
    node.maxNodesPerWrite = config.maxNodesPerWrite;
    node.maxNodesPerHistoryReadData = config.maxNodesPerHistoryReadData;
    node.maxNodesPerBrowse = config.maxNodesPerBrowse;
    node.maxBrowseContinuationPoints = config.maxBrowseContinuationPoints;
    node.maxHistoryContinuationPoints = config.maxHistoryContinuationPoints;

    node.delayToInit = config.delayToInit;
    node.delayToClose = config.delayToClose;
    node.serverShutdownTimeout = config.serverShutdownTimeout;
    node.showStatusActivities = config.showStatusActivities;
    node.showErrors = config.showErrors;

    // certificates
    node.publicCertificateFile = config.publicCertificateFile;
    node.privateCertificateFile = config.privateCertificateFile;

    // Security
    node.allowAnonymous = config.allowAnonymous;
    // User Management
    node.opcuaUsers = config.users;
    // XML-Set Management
    node.xmlsetsOPCUA = config.xmlsetsOPCUA;
    // Audit
    node.isAuditing = config.isAuditing;

    // discovery
    node.disableDiscovery = !config.serverDiscovery;
    node.registerServerMethod = config.registerServerMethod;
    node.discoveryServerEndpointUrl = config.discoveryServerEndpointUrl;

    /* istanbul ignore next */
    node.capabilitiesForMDNS = config.capabilitiesForMDNS
      ? config.capabilitiesForMDNS.split(",")
      : [config.capabilitiesForMDNS];

    return node;
  },
  initialize: (node, options) => {
    return new module.exports.choreCompact.opcua.OPCUAServer(options);
  },
  // Warns at startup about configuration choices that are fine for testing
  // but risky to leave as-is in a production deployment. This is purely
  // informational - it does not change server behavior or block startup -
  // so a node relying on any of these on purpose is unaffected beyond
  // seeing the warning in the node's status/debug log.
  checkInsecureDefaults: (node) => {
    const warnings = [];

    if (!node.publicCertificateFile || !node.privateCertificateFile) {
      warnings.push(
        "no publicCertificateFile/privateCertificateFile configured - " +
          "the server is using the auto-generated demo certificate, which " +
          "is the same one every install of this package generates by " +
          "default. Configure your own certificate before production use."
      );
    }

    if (node.allowAnonymous) {
      warnings.push(
        "allowAnonymous is enabled - anyone who can reach this endpoint " +
          "can connect and interact with the address space without " +
          "authenticating. Disable this and configure users before " +
          "production use unless anonymous access is genuinely intended."
      );
    }

    const isUnbounded = (value) =>
      value === undefined ||
      value === null ||
      value === "" ||
      Number(value) <= 0;

    if (isUnbounded(node.maxAllowedSessionNumber)) {
      warnings.push(
        "maxAllowedSessionNumber is not set to a positive limit - a " +
          "single client (or many) can open unlimited sessions, which " +
          "can exhaust server resources."
      );
    }

    if (isUnbounded(node.maxConnectionsPerEndpoint)) {
      warnings.push(
        "maxConnectionsPerEndpoint is not set to a positive limit - " +
          "connections to this endpoint are unbounded."
      );
    }

    if (isUnbounded(node.maxAllowedSubscriptionNumber)) {
      warnings.push(
        "maxAllowedSubscriptionNumber is not set to a positive limit - " +
          "subscriptions are unbounded, which can exhaust server resources " +
          "under a misbehaving or malicious client."
      );
    }

    if (warnings.length > 0) {
      module.exports.debugLog(
        "Production readiness warnings for node " +
          node.id +
          ":\n - " +
          warnings.join("\n - ")
      );
      node.warn(
        "This OPC UA server node is running with " +
          warnings.length +
          " insecure/unbounded default(s). See debug log " +
          "(DEBUG=opcuaCompact*) for details. This is a warning only; " +
          "the server will still start."
      );
    }

    return warnings;
  },
  stop: (node, server, done) => {
    server.shutdown(node.serverShutdownTimeout, done);
  },
  getRegisterServerMethod: (id) => {
    const RegisterServerMethod = require("node-opcua").RegisterServerMethod;
    return RegisterServerMethod[id];
  },
  loadOPCUANodeSets: (node, dirname) => {
    const xmlFiles = [
      module.exports.choreCompact.opcuaNodesets.nodesets.standard,
      module.exports.choreCompact.opcuaNodesets.nodesets.di,
    ];

    if (Array.isArray(node.xmlsetsOPCUA)) {
      node.xmlsetsOPCUA.forEach((xmlsetFileName) => {
        if (xmlsetFileName.path) {
          if (xmlsetFileName.path.startsWith("public/vendor/")) {
            xmlFiles.push(
              module.exports.choreCompact.path.join(
                dirname,
                xmlsetFileName.path
              )
            );
          } else {
            /* istanbul ignore next */
            xmlFiles.push(xmlsetFileName.path);
          }
        }
      });
      module.exports.detailLog("appending xmlFiles: " + xmlFiles.toString());
    }

    module.exports.detailLog("node sets:" + xmlFiles.toString());

    return xmlFiles;
  },
  // Coerces a config value that should be a positive integer (session/
  // connection/node limits etc.) into either a valid positive integer or
  // undefined. Node-RED editor fields left blank come through as "", and
  // passing that straight to node-opcua used to be silently tolerated by
  // older versions but throws an uncaught internal error in newer ones.
  // Returning undefined instead lets node-opcua fall back to its own
  // built-in default for that option, rather than us inventing a number.
  toPositiveIntOrUndefined: (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const parsed = typeof value === "string" ? parseInt(value, 10) : value;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  },
  defaultServerOptions: (node) => {
    /* const applicationUri = module.exports.choreCompact.opcua.makeApplicationUrn(
      module.exports.choreCompact.opcua.get_fully_qualified_domain_name(),
      node.productUri || "NodeOPCUA-Server-" + node.port
    );
     */

    const certificateFile =
      node.publicCertificateFile ||
      module.exports.choreCompact.coreSecurity.serverCertificateFile("2048");
    const privateKeyFile =
      node.privateCertificateFile ||
      module.exports.choreCompact.coreSecurity.serverKeyFile("2048");

    // const SecurityPolicy = require("node-opcua").SecurityPolicy;
    const registerServerMethod = 1; /* module.exports.getRegisterServerMethod(
      node.registerServerMethod
    ) || 1; */

    return {
      port: typeof node.port === "string" ? parseInt(node.port) : node.port,
      // TODO: options to activate sets: nodeset_filename: module.exports.choreCompact.opcuaNodesets.nodesets.,
      resourcePath: node.endpoint || "/UA/NodeRED/Compact",
      buildInfo: {
        productName: "Node-RED OPC UA Compact Server",
        buildNumber: "20220731",
        buildDate: new Date(2022, 7, 31),
      },
      serverCapabilities: {
        maxBrowseContinuationPoints: module.exports.toPositiveIntOrUndefined(
          node.maxBrowseContinuationPoints
        ),
        maxHistoryContinuationPoints: module.exports.toPositiveIntOrUndefined(
          node.maxHistoryContinuationPoints
        ),
        // Newer node-opcua versions dropped compatibility support for the
        // top-level maxAllowedSubscriptionNumber option (unlike
        // maxAllowedSessionNumber, which still has a deprecation shim -
        // see the top-level maxAllowedSessionNumber option below). Without
        // this, node-opcua silently falls back to its own hardcoded
        // default of 10 subscriptions per session, regardless of what's
        // configured on the node - which can break real OPC UA clients
        // that legitimately open more than 10 subscriptions.
        maxSubscriptionsPerSession: module.exports.toPositiveIntOrUndefined(
          node.maxAllowedSubscriptionNumber
        ),
        operationLimits: {
          maxNodesPerRead: module.exports.toPositiveIntOrUndefined(
            node.maxNodesPerRead
          ),
          maxNodesPerWrite: module.exports.toPositiveIntOrUndefined(
            node.maxNodesPerWrite
          ),
          maxNodesPerHistoryReadData: module.exports.toPositiveIntOrUndefined(
            node.maxNodesPerHistoryReadData
          ),
          maxNodesPerBrowse: module.exports.toPositiveIntOrUndefined(
            node.maxNodesPerBrowse
          ),
        },
      },
      serverInfo: {
        // applicationUri,
        productUri: node.productUri || "NodeOPCUA-Server-" + node.port,
        applicationName: { text: "NodeRED-Compact", locale: "en" },
        gatewayServerUri: null,
        discoveryProfileUri: null,
        discoveryUrls: [],
      },
      alternateHostname: node.alternateHostname,
      // still supported directly by node-opcua (with a deprecation
      // warning - it auto-maps to serverCapabilities.maxSessions)
      maxAllowedSessionNumber: module.exports.toPositiveIntOrUndefined(
        node.maxAllowedSessionNumber
      ),
      maxConnectionsPerEndpoint: module.exports.toPositiveIntOrUndefined(
        node.maxConnectionsPerEndpoint
      ),
      allowAnonymous: node.allowAnonymous,
      /* securityPolicies: [ TODO: configure SecurityPolicies
        SecurityPolicy.Basic128Rsa15,
        SecurityPolicy.Basic256,
        SecurityPolicy.Basic256Sha256
      ], */
      certificateFile,
      privateKeyFile,
      userManager: {
        isValidUser: module.exports.choreCompact.coreSecurity.checkUserLogon,
      },
      isAuditing: node.isAuditing,
      disableDiscovery: node.disableDiscovery,
      registerServerMethod,
    };
  },
  constructAddressSpaceFromScript: (
    server,
    constructAddressSpaceScript,
    eventObjects
  ) => {
    return new Promise(function (resolve, reject) {
      try {
        constructAddressSpaceScript(
          server,
          server.engine.addressSpace,
          eventObjects,
          resolve
        );
      } catch (err) {
        reject(err);
      }
    });
  },
  // Works around an apparent internal node-opcua timing issue: when a
  // second OPCUAServer instance is created within the same process (e.g.
  // on a Node-RED flow redeploy), opcuaServer.initialize()'s callback can
  // fire before the standard nodeset's base types are fully registered
  // in the new address space, even though addressSpace itself already
  // exists. Calling addObject()/addVariable() at that point fails with
  // "Cannot find topMostBaseTypeNode BaseObjectType" rather than a
  // catchable "not ready yet" signal. This polls for a well-known
  // standard type (BaseObjectType, ns=0;i=58) to actually resolve before
  // letting the user's address-space script run, instead of trusting
  // initialize()'s callback timing blindly.
  waitForStandardTypesReady: (
    addressSpace,
    timeoutMs = 5000,
    intervalMs = 25
  ) => {
    return new Promise((resolve, reject) => {
      if (!addressSpace) {
        reject(new Error("addressSpace is not available"));
        return;
      }
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        let baseObjectType;
        try {
          baseObjectType = addressSpace.findNode("ns=0;i=58"); // BaseObjectType
        } catch (err) {
          baseObjectType = undefined;
        }
        if (baseObjectType) {
          resolve();
          return;
        }
        if (Date.now() >= deadline) {
          reject(
            new Error(
              "Timed out waiting for the standard OPC UA type registry " +
                "(BaseObjectType) to become available in the address space"
            )
          );
          return;
        }
        setTimeout(check, intervalMs);
      };
      check();
    });
  },
  postInitialize: (node, opcuaServer) => {
    node.contribOPCUACompact.eventObjects = {}; // event objects should stay in memory

    const addressSpace = opcuaServer.engine?.addressSpace;
    if (addressSpace) {
      addressSpace.getOwnNamespace();
    }

    module.exports
      .waitForStandardTypesReady(addressSpace)
      .then(() =>
        module.exports.constructAddressSpaceFromScript(
          opcuaServer,
          node.contribOPCUACompact.constructAddressSpaceScript,
          node.contribOPCUACompact.eventObjects
        )
      )
      .then(() => {
        module.exports.choreCompact.setStatusActive(node);
        node.emit("server_running");
      })
      .catch((err) => {
        module.exports.choreCompact.setStatusError(node, err.message);
        node.emit("server_start_error");
      });
  },
  run: (node, server) => {
    return new Promise(function (resolve, reject) {
      server.start(function (err) {
        if (err) {
          reject(err);
        } else {
          if (server.endpoints && server.endpoints.length) {
            server.endpoints.forEach((endpoint) => {
              endpoint.endpointDescriptions().forEach((endpointDescription) => {
                module.exports.debugLog(
                  "Server endpointUrl: " +
                    endpointDescription.endpointUrl +
                    " securityMode: " +
                    endpointDescription.securityMode.toString() +
                    " securityPolicyUri: " +
                    endpointDescription.securityPolicyUri
                    ? endpointDescription.securityPolicyUri.toString()
                    : "None Security Policy Uri"
                );
              });
            });

            const endpointUrl =
              server.endpoints[0].endpointDescriptions()[0].endpointUrl;
            module.exports.debugLog(
              "Primary Server Endpoint URL " + endpointUrl
            );
          }

          /* istanbul ignore next */
          server.on("newChannel", (channel) => {
            module.exports.debugLog(
              "Client connected with address = " +
                channel.remoteAddress +
                " port = " +
                channel.remotePort
            );
          });

          /* istanbul ignore next */
          server.on("closeChannel", function (channel) {
            module.exports.debugLog(
              "Client disconnected with address = " +
                channel.remoteAddress +
                " port = " +
                channel.remotePort
            );
          });

          /* istanbul ignore next */
          server.on("create_session", function (session) {
            module.exports.debugLog(
              "############## SESSION CREATED ##############"
            );
            if (session.clientDescription) {
              module.exports.detailLog(
                "Client application URI:" +
                  session.clientDescription.applicationUri
              );
              module.exports.detailLog(
                "Client product URI:" + session.clientDescription.productUri
              );
              module.exports.detailLog(
                "Client application name:" +
                  session.clientDescription.applicationName
                  ? session.clientDescription.applicationName.toString()
                  : "none application name"
              );
              module.exports.detailLog(
                "Client application type:" +
                  session.clientDescription.applicationType
                  ? session.clientDescription.applicationType.toString()
                  : "none application type"
              );
            }

            module.exports.debugLog(
              "Session name:" + session.sessionName
                ? session.sessionName.toString()
                : "none session name"
            );
            module.exports.debugLog(
              "Session timeout:" + session.sessionTimeout
            );
            module.exports.debugLog("Session id:" + session.sessionId);
          });

          /* istanbul ignore next */
          server.on("session_closed", function (session, reason) {
            module.exports.debugLog(
              "############## SESSION CLOSED ##############"
            );
            module.exports.detailLog("reason:" + reason);
            module.exports.detailLog(
              "Session name:" + session.sessionName
                ? session.sessionName.toString()
                : "none session name"
            );
          });

          module.exports.debugLog("Server Initialized");

          if (server.serverInfo) {
            module.exports.detailLog(
              "Server Info:" + JSON.stringify(server.serverInfo)
            );
          }

          resolve();
        }
      });
    });
  },
};
