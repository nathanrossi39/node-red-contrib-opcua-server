/**
 MIT License
 Copyright (c) 2018-2022 Klaus Landsdorf (http://node-red.plus/)
 **/

jest.setTimeout(10000);

describe("core.server unit testing", function () {
  const coreServer = require("../../src/core/server");

  it("should hold the default state functions for the node", function (done) {
    const contrib = coreServer;
    expect(contrib.initialize).toBeDefined();
    expect(contrib.run).toBeDefined();
    expect(contrib.stop).toBeDefined();
    done();
  });

  it("should initialize debugLog", function (done) {
    const contrib = coreServer;
    expect(contrib.initialize()).toBeDefined();
    expect(contrib.debugLog).toBeDefined();
    done();
  });

  it("should initialize errorLog", function (done) {
    const contrib = coreServer;
    expect(contrib.initialize()).toBeDefined();
    expect(contrib.errorLog).toBeDefined();
    done();
  });

  it("should initialize detailLog", function (done) {
    const contrib = coreServer;
    expect(contrib.initialize()).toBeDefined();
    expect(contrib.detailLog).toBeDefined();
    done();
  });

  describe("checkInsecureDefaults", function () {
    function makeNode(overrides) {
      return Object.assign(
        {
          id: "test-node-id",
          warn: jest.fn(),
          publicCertificateFile: "/path/to/cert.pem",
          privateCertificateFile: "/path/to/key.pem",
          allowAnonymous: false,
          maxAllowedSessionNumber: 10,
          maxConnectionsPerEndpoint: 10,
          maxAllowedSubscriptionNumber: 10,
        },
        overrides
      );
    }

    it("should not warn when certificates, auth, and limits are all configured", function () {
      const node = makeNode();
      const warnings = coreServer.checkInsecureDefaults(node);
      expect(warnings).toHaveLength(0);
      expect(node.warn).not.toHaveBeenCalled();
    });

    it("should warn when no certificate files are configured", function () {
      const node = makeNode({
        publicCertificateFile: "",
        privateCertificateFile: "",
      });
      const warnings = coreServer.checkInsecureDefaults(node);
      expect(warnings.some((w) => w.includes("demo certificate"))).toBe(true);
      expect(node.warn).toHaveBeenCalledTimes(1);
    });

    it("should warn when allowAnonymous is enabled", function () {
      const node = makeNode({ allowAnonymous: true });
      const warnings = coreServer.checkInsecureDefaults(node);
      expect(warnings.some((w) => w.includes("allowAnonymous"))).toBe(true);
    });

    it("should warn when session/connection/subscription limits are unset, empty, or zero", function () {
      const node = makeNode({
        maxAllowedSessionNumber: undefined,
        maxConnectionsPerEndpoint: "",
        maxAllowedSubscriptionNumber: 0,
      });
      const warnings = coreServer.checkInsecureDefaults(node);
      expect(warnings.some((w) => w.includes("maxAllowedSessionNumber"))).toBe(
        true
      );
      expect(
        warnings.some((w) => w.includes("maxConnectionsPerEndpoint"))
      ).toBe(true);
      expect(
        warnings.some((w) => w.includes("maxAllowedSubscriptionNumber"))
      ).toBe(true);
      expect(warnings).toHaveLength(3);
    });

    it("should accumulate multiple warnings and call node.warn only once", function () {
      const node = makeNode({
        publicCertificateFile: "",
        privateCertificateFile: "",
        allowAnonymous: true,
      });
      const warnings = coreServer.checkInsecureDefaults(node);
      expect(warnings.length).toBeGreaterThanOrEqual(2);
      expect(node.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe("waitForStandardTypesReady", function () {
    it("should resolve immediately if BaseObjectType is already available", async function () {
      const addressSpace = {
        findNode: jest.fn().mockReturnValue({ nodeId: "ns=0;i=58" }),
      };
      await expect(
        coreServer.waitForStandardTypesReady(addressSpace, 1000, 10)
      ).resolves.toBeUndefined();
      expect(addressSpace.findNode).toHaveBeenCalledWith("ns=0;i=58");
    });

    it("should poll until BaseObjectType becomes available", async function () {
      let callCount = 0;
      const addressSpace = {
        findNode: jest.fn().mockImplementation(() => {
          callCount += 1;
          return callCount >= 3 ? { nodeId: "ns=0;i=58" } : undefined;
        }),
      };
      await expect(
        coreServer.waitForStandardTypesReady(addressSpace, 1000, 5)
      ).resolves.toBeUndefined();
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it("should reject with a clear error if it times out waiting", async function () {
      const addressSpace = {
        findNode: jest.fn().mockReturnValue(undefined),
      };
      await expect(
        coreServer.waitForStandardTypesReady(addressSpace, 50, 10)
      ).rejects.toThrow(/Timed out waiting/);
    });

    it("should reject immediately if addressSpace itself is missing", async function () {
      await expect(
        coreServer.waitForStandardTypesReady(undefined, 1000, 10)
      ).rejects.toThrow(/addressSpace is not available/);
    });

    it("should treat a findNode exception the same as not-yet-ready and keep polling", async function () {
      let callCount = 0;
      const addressSpace = {
        findNode: jest.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount < 2) {
            throw new Error("not ready internally");
          }
          return { nodeId: "ns=0;i=58" };
        }),
      };
      await expect(
        coreServer.waitForStandardTypesReady(addressSpace, 1000, 5)
      ).resolves.toBeUndefined();
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("defaultServerOptions", function () {
    function makeNode(overrides) {
      return Object.assign(
        {
          port: 4840,
          endpoint: "",
          productUri: "",
          maxAllowedSessionNumber: 25,
          maxConnectionsPerEndpoint: 25,
          maxAllowedSubscriptionNumber: 50,
          maxNodesPerRead: 1000,
          maxNodesPerWrite: 1000,
          maxNodesPerHistoryReadData: 100,
          maxNodesPerBrowse: 3000,
          maxBrowseContinuationPoints: 10,
          maxHistoryContinuationPoints: 10,
          publicCertificateFile: "",
          privateCertificateFile: "",
          allowAnonymous: true,
          isAuditing: false,
          disableDiscovery: true,
        },
        overrides
      );
    }

    it("should map maxAllowedSubscriptionNumber to serverCapabilities.maxSubscriptionsPerSession", function () {
      // Newer node-opcua versions dropped the compatibility shim for the
      // top-level maxAllowedSubscriptionNumber option (unlike
      // maxAllowedSessionNumber, which still auto-maps with a deprecation
      // warning). Without this explicit mapping, node-opcua silently
      // falls back to its own hardcoded default of 10 subscriptions per
      // session regardless of what's configured - which breaks real OPC
      // UA clients that legitimately open more than 10 subscriptions.
      const node = makeNode({ maxAllowedSubscriptionNumber: 200 });
      const options = coreServer.defaultServerOptions(node);
      expect(options.serverCapabilities.maxSubscriptionsPerSession).toBe(200);
    });

    it("should still set the top-level maxAllowedSessionNumber and maxConnectionsPerEndpoint options", function () {
      const node = makeNode({
        maxAllowedSessionNumber: 30,
        maxConnectionsPerEndpoint: 40,
      });
      const options = coreServer.defaultServerOptions(node);
      expect(options.maxAllowedSessionNumber).toBe(30);
      expect(options.maxConnectionsPerEndpoint).toBe(40);
    });

    it("should leave maxSubscriptionsPerSession undefined (node-opcua's own default applies) when unset", function () {
      const node = makeNode({ maxAllowedSubscriptionNumber: "" });
      const options = coreServer.defaultServerOptions(node);
      expect(options.serverCapabilities.maxSubscriptionsPerSession).toBe(
        undefined
      );
    });
  });
});