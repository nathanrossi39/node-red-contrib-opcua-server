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
});
