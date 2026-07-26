/**
 * Updated version of the MQTT ingest function node ("function 4" in the
 * original flow), adding heartbeat tracking for Bad-quality tag flagging.
 *
 * WHAT'S NEW vs the original: a single new line setting
 * flow.set("OpcDataLastUpdate", Date.now(), "memoryOnly") whenever a
 * message actually arrives - regardless of whether any tag value changed.
 * Even a repeated identical reading proves the device is still
 * communicating; only silence (no messages at all) means it's down.
 *
 * This is what opcua-blueprint-helper.js's staleDataThresholdMs option
 * checks against - if no update has landed within that window, every tag
 * reports a Bad status code to OPC UA clients instead of silently
 * continuing to show the last known value as if it were current. This is
 * the same underlying mechanism Kepware uses to flag tags Bad when a
 * device or connection goes down.
 *
 * Paste this into the same Function node that currently has the
 * "HIGH PERFORMANCE OPC DATA INGEST" script, replacing its contents.
 */

// HIGH PERFORMANCE OPC DATA INGEST
// Optimized for Raspberry Pi / low CPU environments

// Persistent cache (Node-RED keeps function scope in memory)
let opcData = flow.get("OpcData", "memoryOnly");

if (!opcData) {
  opcData = Object.create(null); // faster pure dictionary
  flow.set("OpcData", opcData, "memoryOnly");
}

let incomingData = msg.payload;
let topic = msg.topic;

// Fast buffer conversion
if (Buffer.isBuffer(incomingData)) {
  incomingData = incomingData.toString();
}

// Only attempt JSON parse if likely JSON
if (typeof incomingData === "string") {
  const firstChar = incomingData[0];
  if (firstChar === "{" || firstChar === "[") {
    try {
      incomingData = JSON.parse(incomingData);
    } catch {
      return null;
    }
  }
}

// A message genuinely arrived and was parsed successfully - the device/
// feed is alive right now, regardless of whether any value below turns
// out to have actually changed. Update the heartbeat unconditionally,
// before the change-detection logic, so a device that keeps sending the
// same reading is still correctly seen as "up".
flow.set("OpcDataLastUpdate", Date.now(), "memoryOnly");

let changed = false;

// ----------------------
// BULK JSON UPDATE
// ----------------------
if (incomingData && typeof incomingData === "object" && !topic?.includes(";s=")) {
  const data = incomingData;
  const keys = Object.keys(data);

  // Default prefix is blank
  let prefix = "";

  // Detect Advantech MQTT topics
  // Advantech/74FE48B56466/data
  if (topic) {
    const parts = topic.split("/");

    if (parts.length >= 3 && parts[0] === "Advantech") {
      prefix = `Advantech_${parts[1]}.`;
    }
  }

  for (let i = 0; i < keys.length; i++) {
    const tag = prefix + keys[i];
    const newVal = data[keys[i]];

    if (opcData[tag] !== newVal) {
      opcData[tag] = newVal;
      changed = true;
    }
  }
}
// ----------------------
// SINGLE TAG UPDATE
// ----------------------
else if (topic) {
  let cleanTopic = topic;

  const semiIndex = topic.indexOf(";s=");
  if (semiIndex !== -1) {
    cleanTopic = topic.substring(semiIndex + 3);
  }

  // Faster than regex split
  const lastSlash = cleanTopic.lastIndexOf("/");
  const tag = lastSlash !== -1 ? cleanTopic.substring(lastSlash + 1) : cleanTopic;

  let val = incomingData;

  // Flatten OPC structured payload
  if (val && val.value && val.value.value !== undefined) {
    val = val.value.value;
  }

  if (opcData[tag] !== val) {
    opcData[tag] = val;
    changed = true;
  }
}

// No need to forward anything
return null;
