/** Licensed under MIT - see LICENSE for full copyright notices. **/
"use strict";

module.exports = function (RED) {
  function OpcuaTagDictionaryNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.tags = Array.isArray(config.tags) ? config.tags : [];
    node.blueprintContextKey = config.blueprintContextKey || "OpcBlueprint";
    node.contextStore = config.contextStore || "memoryOnly";
    // Converts the flat, UI-editable row list (one row per tag, with its
    // own folder name) into the nested {folder: {tagName: dataType}}
    // shape that opcua-blueprint-helper.js (and the OpcBlueprint
    // convention generally) expects.
    node.buildBlueprint = function () {
      const blueprint = {};
      let tagCount = 0;

      node.tags.forEach(function (row) {
        const folder = (row.folder || "").trim();
        const tagName = (row.tagName || "").trim();
        const dataType = row.dataType || "Double";

        if (!folder || !tagName) {
          return; // skip incomplete rows rather than publishing garbage
        }

        if (!blueprint[folder]) {
          blueprint[folder] = {};
        }
        blueprint[folder][tagName] = dataType;
        tagCount++;
      });

      return {
        blueprint,
        tagCount,
        folderCount: Object.keys(blueprint).length,
      };
    };

    node.publish = function () {
      const { blueprint, tagCount, folderCount } = node.buildBlueprint();

      try {
        node
          .context()
          .flow.set(node.blueprintContextKey, blueprint, node.contextStore);
      } catch (err) {
        node.error(
          "Could not publish tag dictionary to flow context: " + err.message
        );
        node.status({
          fill: "red",
          shape: "dot",
          text: "context error - see debug log",
        });
        return blueprint;
      }

      node.status({
        fill: "green",
        shape: "dot",
        text: tagCount + " tags in " + folderCount + " folders",
      });

      return blueprint;
    };

    // node.context().flow is not reliably available immediately when a
    // node is constructed - it's only guaranteed ready once Node-RED's
    // runtime has genuinely finished starting all flows. Rather than
    // guess a fixed delay (which risks the same race this project spent
    // considerable effort chasing down in node-opcua's own internals
    // earlier - see server.js's waitForStandardTypesReady), listen for
    // the runtime's own 'flows:started' event as a real readiness
    // signal. A generous fallback timeout is kept as a defensive
    // backstop only, in case this event is ever missed for some reason
    // (e.g. the node is added to an already-running flow via a runtime
    // deploy after startup, when 'flows:started' won't fire again).
    let published = false;
    const publishOnce = function () {
      if (published) {
        return;
      }
      published = true;
      node.publish();
    };

    if (RED.events && typeof RED.events.once === "function") {
      RED.events.once("flows:started", publishOnce);
    }
    // Defensive fallback - covers both a missed event and the
    // already-running-flow redeploy case above.
    const fallbackTimer = setTimeout(publishOnce, 2000);

    // Also republish on any input message, so this can be wired to an
    // inject node (or any other trigger) to force a refresh without a
    // full redeploy - useful if you want to update tags via some other
    // mechanism later without touching this node's own config.
    node.on("input", function (msg, send, done) {
      const blueprint = node.publish();
      msg.payload = blueprint;
      send(msg);
      if (done) {
        done();
      }
    });

    node.on("close", function (done) {
      clearTimeout(fallbackTimer);
      node.status({});
      done();
    });
  }

  RED.nodes.registerType("opcua-tag-dictionary", OpcuaTagDictionaryNode);
};
