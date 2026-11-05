/**
 * MQTT ingest Function node for the Compact-Server v2 / Tag Dictionary
 * setup, with per-device heartbeats for Bad-quality tag flagging.
 *
 * WIRING
 *   [mqtt in: Advantech/#] -> [function: this script] -> (optional debug)
 *
 * Paste this whole script into the Function node.
 *
 * WHAT IT DOES
 * 1. Turns each MQTT message into live values in flow context "OpcData".
 *    Every key is exactly "<Tag Dictionary Folder>.<Tag name>", because
 *    that is the key the server reads for each tag. For an Advantech WISE
 *    topic "Advantech/74FE4890B4B3/data" with payload {"di1":true,...},
 *    the folder is "Advantech.74FE4890B4B3" and the key is
 *    "Advantech.74FE4890B4B3.di1".
 * 2. Converts booleans to 1/0 and numeric strings to numbers, so Double
 *    tags get real values. (Booleans also work for tags typed Boolean.)
 * 3. Writes a heartbeat per device (per folder) into flow context
 *    "OpcDataLastUpdateByFolder" on every message, whether or not any
 *    value changed: a repeated identical reading still proves the device
 *    is talking. The server flags only that device's tags Bad once its
 *    heartbeat is older than staleDataThresholdMs (default 10 s). A folder
 *    in the Tag Dictionary that has never sent anything is Bad too, once
 *    any device has reported (before the first message, tags read Good).
 * 4. On the module's "Device_Status" message with status "disconnect"
 *    (the MQTT last will sent when it drops off), marks that device Bad
 *    straight away instead of waiting for the timeout.
 *
 * IMPORTANT: if your modules only publish when an input changes, set
 * their periodic publish interval below staleDataThresholdMs (or raise
 * the threshold), otherwise a healthy but idle device will show Bad.
 */

const STORE = "memoryOnly"; // must match the Tag Dictionary's context store
const FOLDER_SEP = "."; // "." for Folder "Advantech.74FE4890B4B3";
// use "/" if the Tag Dictionary Folder is "Advantech/74FE4890B4B3" (nested)

// Topic: <prefix>/<device id>/<kind>, e.g. Advantech/74FE4890B4B3/data
const parts = String(msg.topic || "").split("/");
if (parts.length < 2) return null;
const folder = parts[0] + FOLDER_SEP + parts[1];
const kind = parts[2] || "data";

let payload = msg.payload;
if (Buffer.isBuffer(payload)) payload = payload.toString();
if (typeof payload === "string") {
  try {
    payload = JSON.parse(payload);
  } catch (e) {
    return null;
  }
}
if (!payload || typeof payload !== "object") return null;

const beats = flow.get("OpcDataLastUpdateByFolder", STORE) || {};

// Device went offline (MQTT last will): flag its tags Bad immediately.
if (kind === "Device_Status") {
  if (String(payload.status).toLowerCase() === "disconnect") {
    beats[folder] = 0;
    flow.set("OpcDataLastUpdateByFolder", beats, STORE);
  }
  return null;
}
if (kind !== "data") return null;

const opcData = flow.get("OpcData", STORE) || {};
const out = [];

for (const [field, raw] of Object.entries(payload)) {
  let val = raw;
  if (typeof val === "boolean") val = val ? 1 : 0;
  else if (typeof val === "string" && val.trim() !== "" && !isNaN(val))
    val = Number(val);

  const key = folder + "." + field;
  if (opcData[key] !== val) {
    opcData[key] = val;
    out.push({ topic: key, payload: val });
  }
}

flow.set("OpcData", opcData, STORE);

// Per-device heartbeat: this device's tags stay Good while it keeps talking.
beats[folder] = Date.now();
flow.set("OpcDataLastUpdateByFolder", beats, STORE);

// One message per changed tag, for debugging or other downstream use.
return out.length ? [out] : null;
