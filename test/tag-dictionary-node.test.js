/** Licensed under MIT - see LICENSE for full copyright notices. **/
const EventEmitter = require("events");

// Tracks every node created via loadNodeWithFakeRED() across all tests,
// so a single afterEach can close them all - each node schedules a real
// 2000ms fallback timer (see tag-dictionary-node.js), and leaving those
// dangling past their own test can inject stray timing noise into
// unrelated later tests (this was confirmed to happen and contributed to
// flakiness in this project's OPC UA server tests, which are already
// known to be sensitive to timing - see jest.config.js's maxWorkers
// comment).
const allCreatedNodes = [];

// node-red-node-test-helper does not automatically initialize Node-RED's
// context system (node.context().flow/.global) the way a real running
// instance does - this is a known, documented limitation:
// https://github.com/node-red/node-red-node-test-helper/issues/55
// Rather than fight that (the underlying Node-RED context API itself is
// standard, well-established functionality, not something this project
// controls), this tests the node's actual constructor/logic through a
// lightweight fake RED harness - the same proven approach already used
// successfully in test/core/server-sandbox.test.js. This still exercises
// the real node constructor and RED.nodes.registerType call, just with a
// working in-memory context.flow implementation and a fake events emitter
// standing in for Node-RED's runtime 'flows:started' event.
function loadNodeWithFakeRED() {
  let registeredType;
  let registeredConstructor;
  const fakeEvents = new EventEmitter();

  const RED = {
    nodes: {
      createNode: function (node, config) {
        EventEmitter.call(node);
        Object.setPrototypeOf(node, EventEmitter.prototype);
        Object.assign(node, config);
        node.status = jest.fn();
        node.warn = jest.fn();
        node.error = jest.fn();

        const flowStores = {};
        node.context = function () {
          return {
            flow: {
              get: function (key, store) {
                store = store || "default";
                return flowStores[store] ? flowStores[store][key] : undefined;
              },
              set: function (key, value, store) {
                store = store || "default";
                if (!flowStores[store]) {
                  flowStores[store] = {};
                }
                flowStores[store][key] = value;
              },
            },
          };
        };
      },
      registerType: function (type, constructor) {
        registeredType = type;
        registeredConstructor = constructor;
      },
    },
    events: fakeEvents,
  };

  require("../src/tag-dictionary-node.js")(RED);

  return {
    type: registeredType,
    createNode: function (config) {
      const node = new registeredConstructor(config);
      allCreatedNodes.push(node);
      return node;
    },
    // Fires the same readiness signal the node listens for in a real
    // Node-RED runtime, so tests don't need to wait for the 2000ms
    // defensive fallback timeout.
    triggerFlowsStarted: function () {
      fakeEvents.emit("flows:started");
    },
  };
}

describe("opcua-tag-dictionary node", function () {
  afterEach(function () {
    // Close every node created in this test - clears each one's
    // fallback timer (see the comment on allCreatedNodes above).
    while (allCreatedNodes.length) {
      const node = allCreatedNodes.pop();
      node.emit("close", function () {});
    }
  });

  it("should register as opcua-tag-dictionary", function () {
    const { type } = loadNodeWithFakeRED();
    expect(type).toBe("opcua-tag-dictionary");
  });

  it("should carry the configured name", function () {
    const { createNode } = loadNodeWithFakeRED();
    const node = createNode({ name: "test dictionary", tags: [] });
    expect(node.name).toBe("test dictionary");
  });

  it("should not publish until the flows:started readiness signal fires", function () {
    const { createNode } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [{ folder: "Machine1", tagName: "Speed", dataType: "Double" }],
    });
    // No triggerFlowsStarted() call here - confirms publish genuinely
    // waits for the readiness signal rather than firing immediately.
    const blueprint = node.context().flow.get("OpcBlueprint", "memoryOnly");
    expect(blueprint).toBeUndefined();
  });

  it("should publish a nested blueprint object grouped by folder once flows:started fires", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [
        { folder: "Machine1", tagName: "Speed", dataType: "Double" },
        { folder: "Machine1", tagName: "Running", dataType: "Boolean" },
        { folder: "Machine2", tagName: "Temperature", dataType: "Double" },
      ],
    });
    triggerFlowsStarted();
    const blueprint = node.context().flow.get("OpcBlueprint", "memoryOnly");
    expect(blueprint).toEqual({
      Machine1: { Speed: "Double", Running: "Boolean" },
      Machine2: { Temperature: "Double" },
    });
  });

  it("should use a custom blueprintContextKey and contextStore when configured", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      blueprintContextKey: "CustomBlueprintKey",
      contextStore: "default",
      tags: [{ folder: "F1", tagName: "T1", dataType: "Int32" }],
    });
    triggerFlowsStarted();
    const blueprint = node.context().flow.get("CustomBlueprintKey", "default");
    expect(blueprint).toEqual({ F1: { T1: "Int32" } });
  });

  it("should skip rows missing a folder or tag name rather than publishing garbage", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [
        { folder: "Machine1", tagName: "Speed", dataType: "Double" },
        { folder: "", tagName: "Orphan", dataType: "Double" },
        { folder: "Machine1", tagName: "", dataType: "Double" },
      ],
    });
    triggerFlowsStarted();
    const blueprint = node.context().flow.get("OpcBlueprint", "memoryOnly");
    expect(blueprint).toEqual({ Machine1: { Speed: "Double" } });
  });

  it("should default dataType to Double when not specified", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [{ folder: "Machine1", tagName: "Speed" }],
    });
    triggerFlowsStarted();
    const blueprint = node.context().flow.get("OpcBlueprint", "memoryOnly");
    expect(blueprint).toEqual({ Machine1: { Speed: "Double" } });
  });

  it("should ignore a second flows:started event (publish only once)", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [{ folder: "Machine1", tagName: "Speed", dataType: "Double" }],
    });
    triggerFlowsStarted();
    node.status.mockClear();
    triggerFlowsStarted();
    expect(node.status).not.toHaveBeenCalled();
  });

  it("should republish and forward the blueprint as msg.payload on input", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [{ folder: "Machine1", tagName: "Speed", dataType: "Double" }],
    });
    triggerFlowsStarted();
    const sendMock = jest.fn();
    node.emit("input", { payload: "trigger" }, sendMock, jest.fn());
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { Machine1: { Speed: "Double" } },
      })
    );
  });

  it("should republish on input even before flows:started has fired", function () {
    // An input message is an explicit, unambiguous trigger - by
    // definition something is already connected and running, so this
    // doesn't need to wait for the readiness signal the way the
    // automatic on-deploy publish does.
    const { createNode } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [{ folder: "Machine1", tagName: "Speed", dataType: "Double" }],
    });
    const sendMock = jest.fn();
    node.emit("input", { payload: "trigger" }, sendMock, jest.fn());
    const blueprint = node.context().flow.get("OpcBlueprint", "memoryOnly");
    expect(blueprint).toEqual({ Machine1: { Speed: "Double" } });
  });

  it("should update node.status to show tag and folder counts", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({
      name: "test dictionary",
      tags: [
        { folder: "Machine1", tagName: "Speed", dataType: "Double" },
        { folder: "Machine1", tagName: "Running", dataType: "Boolean" },
        { folder: "Machine2", tagName: "Temperature", dataType: "Double" },
      ],
    });
    triggerFlowsStarted();
    expect(node.status).toHaveBeenCalledWith(
      expect.objectContaining({ text: "3 tags in 2 folders" })
    );
  });

  it("should handle an empty tags array without throwing", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({ name: "empty dictionary", tags: [] });
    triggerFlowsStarted();
    const blueprint = node.context().flow.get("OpcBlueprint", "memoryOnly");
    expect(blueprint).toEqual({});
  });

  it("should handle a missing tags array without throwing", function () {
    const { createNode, triggerFlowsStarted } = loadNodeWithFakeRED();
    const node = createNode({ name: "no tags field" });
    triggerFlowsStarted();
    const blueprint = node.context().flow.get("OpcBlueprint", "memoryOnly");
    expect(blueprint).toEqual({});
  });

  it("should schedule a defensive fallback timeout in case flows:started never fires", function () {
    // Not testing the exact 2000ms fallback firing (jest fake timers
    // conflict with something else in this environment's global.performance
    // patching, unrelated to this node's correctness) - the fallback is a
    // plain setTimeout calling the same already-tested publish() function,
    // so this just confirms a timer was actually scheduled.
    const originalSetTimeout = global.setTimeout;
    const scheduled = [];
    global.setTimeout = function (fn, ms) {
      scheduled.push(ms);
      return originalSetTimeout(fn, ms);
    };
    try {
      const { createNode } = loadNodeWithFakeRED();
      createNode({
        name: "test dictionary",
        tags: [{ folder: "Machine1", tagName: "Speed", dataType: "Double" }],
      });
      expect(scheduled).toContain(2000);
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });
});

describe("opcua-tag-dictionary node - real Node-RED runtime smoke test", function () {
  // Confirms the node deploys cleanly through the actual Node-RED runtime
  // (registration, no thrown errors) - the one thing the fake-RED unit
  // tests above can't verify. Does not assert on node.context().flow
  // directly or on the flows:started publish completing, since
  // node-red-node-test-helper has a documented limitation where context
  // isn't reliably available in tests even though it works correctly in
  // a real deployment (see comment at the top of this file).
  const helper = require("node-red-node-test-helper");
  const tagDictionaryNode = require("../src/tag-dictionary-node.js");

  helper.init(require.resolve("node-red"));

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload().then(function () {
      helper.stopServer(done);
    });
  });

  it("should deploy through the real Node-RED runtime without errors", function (done) {
    const flow = [
      {
        id: "n1",
        type: "opcua-tag-dictionary",
        name: "smoke test dictionary",
        tags: [{ folder: "Machine1", tagName: "Speed", dataType: "Double" }],
      },
    ];
    helper.load([tagDictionaryNode], flow, function (err) {
      expect(err).toBeUndefined();
      const n1 = helper.getNode("n1");
      expect(n1).not.toBeNull();
      expect(n1.name).toBe("smoke test dictionary");
      done();
    });
  });
});
