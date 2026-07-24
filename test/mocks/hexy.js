/**
 * Test-only stub for the 'hexy' package.
 *
 * 'hexy' is a pure debug hex-dump formatting utility pulled in transitively
 * via node-opcua-debug -> hexDump.ts. We never call hexDump ourselves in
 * this codebase or its tests. 'hexy' ships as ESM-only, which Jest's
 * default config (transformIgnorePatterns: ["/node_modules/"]) can't
 * parse, causing an unrelated "Unexpected token 'export'" failure when
 * node-opcua's own modules are loaded during tests.
 *
 * This has no effect on the real, non-test runtime: Node's own require()
 * resolves the real 'hexy' package there without issue (verified via
 * `node -e "require('hexy')"`). This stub only applies inside Jest, via
 * moduleNameMapper in jest.config.js.
 */
"use strict";

function hexy() {
  return "";
}

module.exports = {
  hexy,
  Hexy: hexy,
  default: hexy,
  maxnumberlen: 0,
};
