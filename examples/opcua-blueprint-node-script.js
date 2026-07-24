/**
 * Paste this exact script into the "Address Space Script" field of every
 * opcua-compact-server node. It should be identical across all of them -
 * all real logic lives in opcua-blueprint-helper.js (loaded once via
 * functionGlobalContext in settings.js - see that file's header comment
 * for setup instructions). This bootstrap should never need editing
 * again; adding or changing tags only means editing your blueprint data.
 */
function constructAddressSpaceScript(server, addressSpace, eventObjects, done) {
  sandboxGlobalContext
    .get("opcuaBlueprintHelper")
    .buildBlueprintAddressSpace(
      server,
      addressSpace,
      eventObjects,
      done,
      node,
      sandboxFlowContext
      // Optional 7th argument to override any default, e.g.:
      // { dataRefreshIntervalMs: 500, maxRetries: 60 }
    );
}
