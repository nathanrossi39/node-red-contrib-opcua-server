// Run this directly on the Pi with: node check_tag_quality.js <port> <tagPath>
// Example: node check_tag_quality.js 62541 "Simulation Examples.Functions.Group1.Cycle4"
const { OPCUAClient, AttributeIds } = require("node-opcua");

const port = process.argv[2];
const tagPath = process.argv[3];

if (!port || !tagPath) {
  console.error('Usage: node check_tag_quality.js <port> "<tagPath>"');
  process.exit(1);
}

async function main() {
  const client = OPCUAClient.create({ endpointMustExist: false });
  await client.connect(`opc.tcp://localhost:${port}`);
  const session = await client.createSession();

  // Try namespace index 1 first, then 2, since it depends on registration order
  for (const ns of [1, 2, 3]) {
    const nodeId = `ns=${ns};s=${tagPath}`;
    try {
      const dataValue = await session.read({
        nodeId,
        attributeId: AttributeIds.Value,
      });
      if (dataValue.statusCode.toString().includes("BadNodeIdUnknown")) {
        continue; // wrong namespace index, try the next one
      }
      console.log(`NodeId: ${nodeId}`);
      console.log(`Value: ${dataValue.value.value}`);
      console.log(`StatusCode: ${dataValue.statusCode.toString()}`);
      console.log(`SourceTimestamp: ${dataValue.sourceTimestamp}`);
      await session.close();
      await client.disconnect();
      process.exit(0);
    } catch (err) {
      // try next namespace index
    }
  }

  console.error("Could not find that tag under namespace index 1, 2, or 3. Check the tag path is exact.");
  await session.close();
  await client.disconnect();
  process.exit(1);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
