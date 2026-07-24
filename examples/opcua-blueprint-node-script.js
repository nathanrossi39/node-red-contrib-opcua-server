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
      sandboxFlowContext,
      coreServer.choreCompact.opcua,
      {
        // Namespace URI is intentionally left as the shared default here -
        // do NOT make this unique per node, since existing MES tag
        // configuration references tag paths by this URI across all
        // server nodes. Instead, startupStaggerMs below fixes the
        // underlying node-opcua collision without changing tag paths.
        //
        // Derives a distinct, repeatable stagger per node from its own
        // port (already unique per node) - e.g. port 62541 -> 410ms,
        // 62542 -> 420ms, etc. Spreads out each node's registerNamespace
        // call by roughly a third of a second from its neighbors, which
        // has been enough to avoid the collision without adding
        // meaningful startup delay.
        startupStaggerMs: (node.port % 100) * 10,
      }
    );
}
