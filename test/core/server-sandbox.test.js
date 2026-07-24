/**
 MIT License
 Copyright (c) 2018-2022 Klaus Landsdorf (http://node-red.plus/)
 **/

jest.setTimeout(10000);

describe("core.server-sandbox unit testing", function () {
  const coreServerSandbox = require("../../src/core/server-sandbox");

  it("should hold the default state functions for the node", function (done) {
    const contrib = coreServerSandbox;
    expect(contrib.initialize).toBeDefined();
    done();
  });

  it("should initialize debugLog", function (done) {
    const contrib = coreServerSandbox;
    expect(contrib.initialize).toBeDefined();
    expect(contrib.debugLog).toBeDefined();
    done();
  });

  it("should initialize errorLog", function (done) {
    const contrib = coreServerSandbox;
    expect(contrib.initialize).toBeDefined();
    expect(contrib.errorLog).toBeDefined();
    done();
  });

  it("should initialize and call done", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    contrib.initialize(node, {}, (node, vm) => {
      expect(node).toBeDefined();
      expect(vm).toBeDefined();
      done();
    });
  });

  it("should remove a fired sandboxed setTimeout from node.outstandingTimers", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    node.error = jest.fn();
    contrib.initialize(node, {}, (node, vm) => {
      vm.run("setTimeout(function () {}, 5);");
      expect(node.outstandingTimers.length).toBe(1);
      setTimeout(() => {
        // once the timer has fired, it must be cleaned out of the
        // tracking array instead of staying there for the life of the node
        expect(node.outstandingTimers.length).toBe(0);
        expect(node.error).not.toHaveBeenCalled();
        done();
      }, 30);
    });
  });

  it("should route an error thrown inside a sandboxed setTimeout to node.error instead of crashing", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    node.error = jest.fn();
    contrib.initialize(node, {}, (node, vm) => {
      vm.run(
        "setTimeout(function () { throw new Error('boom from script'); }, 5);"
      );
      setTimeout(() => {
        expect(node.error).toHaveBeenCalledTimes(1);
        expect(node.error.mock.calls[0][0].message).toBe("boom from script");
        done();
      }, 30);
    });
  });

  it("should route an error thrown inside a sandboxed setInterval to node.error instead of crashing", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    node.error = jest.fn();
    contrib.initialize(node, {}, (node, vm) => {
      vm.run(
        "setInterval(function () { throw new Error('boom from interval'); }, 5);"
      );
      setTimeout(() => {
        // stop the interval from firing further and re-throwing on the test process
        node.outstandingIntervals.forEach((id) => clearInterval(id));
        expect(node.error).toHaveBeenCalled();
        expect(node.error.mock.calls[0][0].message).toBe("boom from interval");
        done();
      }, 30);
    });
  });

  it("should provide standard globals (Math, Date, console, JSON) without explicit injection", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    contrib.initialize(node, {}, (node, vm) => {
      const result = vm.run(
        "typeof Math.random() + '|' + (new Date() instanceof Date) + '|' + typeof console.log + '|' + JSON.stringify({ok: true});"
      );
      expect(result).toBe('number|true|function|{"ok":true}');
      done();
    });
  });

  it("should allow require('fs') from an address space script", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    contrib.initialize(node, {}, (node, vm) => {
      const result = vm.run("typeof require('fs').readFileSync;");
      expect(result).toBe("function");
      done();
    });
  });

  it("should block require() of anything outside the allowlist", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    contrib.initialize(node, {}, (node, vm) => {
      expect(() => vm.run("require('child_process');")).toThrow(
        /not permitted/
      );
      expect(() => vm.run("require('net');")).toThrow(/not permitted/);
      done();
    });
  });

  it("should pass the live node and coreServer objects through by reference, not by copy", function (done) {
    const contrib = coreServerSandbox;
    const EventEmitter = require("events");
    let node = new EventEmitter();
    const coreServer = { marker: "original" };
    contrib.initialize(node, coreServer, (node, vm) => {
      // mutate the object from inside the sandbox and confirm the outer
      // reference sees the change - this is the live-reference behavior
      // an isolate-based sandbox (e.g. isolated-vm) could not provide
      // without hand-wrapping every property.
      vm.run("coreServer.marker = 'mutated-from-sandbox';");
      expect(coreServer.marker).toBe("mutated-from-sandbox");
      done();
    });
  });
});
