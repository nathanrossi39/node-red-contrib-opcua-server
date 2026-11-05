/** Licensed under MIT - see LICENSE for full copyright notices. **/

// Tests the Bad-quality (staleness) behaviour of
// examples/opcua-blueprint-helper.js, driven by the shipped MQTT ingest
// example (examples/opcua-ingest-with-heartbeat.js) so the two stay in
// step. node-opcua is replaced by a tiny stand-in: only the status code a
// tag reports is under test here, not the OPC UA stack itself.

const fs = require("fs");
const path = require("path");

const helper = require("../examples/opcua-blueprint-helper.js");
const ingestSource = fs.readFileSync(
  path.join(__dirname, "..", "examples", "opcua-ingest-with-heartbeat.js"),
  "utf8"
);

const THRESHOLD_MS = 10000;
const REFRESH_MS = 200;

function fakeOpcua() {
  return {
    Variant: function (v) {
      Object.assign(this, v);
    },
    DataValue: function (v) {
      Object.assign(this, v);
    },
    DataType: { Double: 1, Boolean: 2, Int16: 3, Int32: 4, String: 5 },
    StatusCodes: {
      Good: "Good",
      BadNoCommunication: "BadNoCommunication",
    },
  };
}

// Builds an address space from `blueprint` and returns helpers to feed
// MQTT messages through the ingest example and read each tag's quality.
function setup(blueprint) {
  const store = { OpcBlueprint: blueprint };
  const flow = {
    get: (key) => store[key],
    set: (key, value) => {
      store[key] = value;
    },
  };
  const closeHandlers = [];
  const node = {
    status() {},
    warn() {},
    error() {},
    send() {},
    on(event, fn) {
      if (event === "close") closeHandlers.push(fn);
    },
  };
  const variables = {};
  const namespace = {
    addFolder: () => ({}),
    addVariable: (opts) => {
      variables[opts.nodeId] = opts;
    },
  };
  const addressSpace = {
    registerNamespace: () => namespace,
    findNode: () => ({ objects: {} }),
  };

  helper.buildBlueprintAddressSpace(
    null,
    addressSpace,
    {},
    () => {},
    node,
    flow,
    fakeOpcua(),
    { staleDataThresholdMs: THRESHOLD_MS, dataRefreshIntervalMs: REFRESH_MS }
  );
  // The helper waits for the blueprint and staggers the build with timers.
  jest.advanceTimersByTime(0);

  // eslint-disable-next-line no-new-func
  const ingest = new Function("msg", "flow", "Buffer", ingestSource);

  return {
    store,
    mqtt(topic, payload) {
      return ingest(
        { topic, payload: Buffer.from(JSON.stringify(payload)) },
        flow,
        Buffer
      );
    },
    read(nodeId) {
      jest.advanceTimersByTime(REFRESH_MS); // let the helper pick up context
      return variables["s=" + nodeId].value.timestamped_get();
    },
    close() {
      closeHandlers.forEach((fn) => fn());
    },
  };
}

describe("opcua-blueprint-helper per-device heartbeat", () => {
  let env;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["performance"] });
    env = setup({
      "Advantech.AAA": { di1: "Double" },
      "Advantech.BBB": { di1: "Boolean" },
    });
  });

  afterEach(() => {
    env.close();
    jest.useRealTimers();
  });

  it("maps MQTT topic and payload onto the Tag Dictionary keys", () => {
    env.mqtt("Advantech/AAA/data", { di1: true });
    env.mqtt("Advantech/BBB/data", { di1: false });

    expect(env.store.OpcData).toEqual({
      "Advantech.AAA.di1": 1,
      "Advantech.BBB.di1": 0,
    });
    expect(env.read("Advantech.AAA.di1").value.value).toBe(1);
    expect(env.read("Advantech.BBB.di1").value.value).toBe(false);
  });

  it("flags only the silent device Bad", () => {
    env.mqtt("Advantech/AAA/data", { di1: true });
    env.mqtt("Advantech/BBB/data", { di1: true });
    expect(env.read("Advantech.AAA.di1").statusCode).toBe("Good");
    expect(env.read("Advantech.BBB.di1").statusCode).toBe("Good");

    // AAA keeps publishing, BBB goes quiet for longer than the threshold.
    for (let t = 0; t < THRESHOLD_MS + 2000; t += 1000) {
      jest.advanceTimersByTime(1000);
      env.mqtt("Advantech/AAA/data", { di1: true });
    }

    expect(env.read("Advantech.AAA.di1").statusCode).toBe("Good");
    expect(env.read("Advantech.BBB.di1").statusCode).toBe("BadNoCommunication");

    // BBB comes back and recovers.
    env.mqtt("Advantech/BBB/data", { di1: true });
    expect(env.read("Advantech.BBB.di1").statusCode).toBe("Good");
  });

  it("treats an unchanged reading as a sign of life", () => {
    env.mqtt("Advantech/AAA/data", { di1: true });
    for (let t = 0; t < THRESHOLD_MS * 2; t += 2000) {
      jest.advanceTimersByTime(2000);
      env.mqtt("Advantech/AAA/data", { di1: true });
    }
    expect(env.read("Advantech.AAA.di1").statusCode).toBe("Good");
  });

  it("flags a device that has never reported, once any device has", () => {
    env.mqtt("Advantech/AAA/data", { di1: true });
    expect(env.read("Advantech.BBB.di1").statusCode).toBe("BadNoCommunication");
  });

  it("flags a device Bad immediately on a Device_Status disconnect", () => {
    env.mqtt("Advantech/AAA/data", { di1: true });
    env.mqtt("Advantech/BBB/data", { di1: true });

    env.mqtt("Advantech/AAA/Device_Status", { status: "disconnect" });

    expect(env.read("Advantech.AAA.di1").statusCode).toBe("BadNoCommunication");
    expect(env.read("Advantech.BBB.di1").statusCode).toBe("Good");
  });
});

describe("opcua-blueprint-helper global heartbeat fallback", () => {
  let env;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["performance"] });
    env = setup({ Machine1: { Speed: "Double" } });
  });

  afterEach(() => {
    env.close();
    jest.useRealTimers();
  });

  it("reports Good when no heartbeat is written at all", () => {
    env.store.OpcData = { "Machine1.Speed": 5 };
    jest.advanceTimersByTime(THRESHOLD_MS * 2);
    expect(env.read("Machine1.Speed").statusCode).toBe("Good");
  });

  it("uses the single OpcDataLastUpdate heartbeat when no per-folder map exists", () => {
    env.store.OpcDataLastUpdate = Date.now();
    expect(env.read("Machine1.Speed").statusCode).toBe("Good");

    jest.advanceTimersByTime(THRESHOLD_MS + 1000);
    expect(env.read("Machine1.Speed").statusCode).toBe("BadNoCommunication");
  });
});
