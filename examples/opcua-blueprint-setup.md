# Shared blueprint address-space helper - setup

This moves the OPC UA address-space-building logic out of each node's
"Address Space Script" textarea and into a real, shared, version-controlled
`.js` file. After this, every server node's script is a few lines that
never need to change - adding or changing tags only ever means editing
your blueprint data.

## 1. Place the helper file

Copy `opcua-blueprint-helper.js` somewhere in your Node-RED user directory,
e.g.:

```bash
mkdir -p ~/.node-red/lib
cp opcua-blueprint-helper.js ~/.node-red/lib/
```

## 2. Wire it up in settings.js

Open `~/.node-red/settings.js` and find the `functionGlobalContext` block
(it exists already but is likely empty/commented out). Add:

```js
functionGlobalContext: {
    opcuaBlueprintHelper: require('/home/pi/.node-red/lib/opcua-blueprint-helper.js')
},
```

Use the **full absolute path** - `require()` in settings.js does not
resolve relative to your flow files, so `~` or relative paths will not
work here.

### Optional: fix the "Unknown context store 'memoryOnly'" warning

Your blueprint script reads/writes context using a store named
`"memoryOnly"`, but that store isn't actually declared in `settings.js`,
so Node-RED silently falls back to the default store (harmless, but
worth naming properly). In the same `settings.js`, find `contextStorage`
and add it:

```js
contextStorage: {
    default: "memoryOnly",
    memoryOnly: { module: "memory" },
},
```

## 3. Restart Node-RED

```bash
node-red-stop
node-red -v
```

`settings.js` is only read at startup, so this step is required for the
`functionGlobalContext` change to take effect.

## 4. Replace each node's Address Space Script

In each of your 5 `opcua-compact-server` nodes, replace the entire
"Address Space Script" field with the contents of
`opcua-blueprint-node-script.js`. It should be **identical** across all
5 nodes - the only thing that differs between them is the OPC UA port/
connection settings on the Settings/Limits tabs, not this script.

## 5. Deploy and confirm

Deploy the flow and check the log. You should see the same
`OPC UA Server LIVE: N folders loaded.` message as before, for each
node, with no change in behavior - the tags, folder structure, and
live values all come from the exact same blueprint mechanism as before.

## What actually changed

- All the real logic (blueprint polling/retry, folder/tag construction,
  type coercion, data refresh, status updates, cleanup) now lives in one
  tested file instead of being copy-pasted across 5 textareas.
- A latent bug is fixed: the original script's cleanup
  (`flexServerInternals.on("close", ...)`) was silently never running,
  because `this` inside the script is the sandbox's own global object,
  which never had an `.on` method. The interval handles were leaking on
  every redeploy. The shared helper uses the real `node` object instead,
  which does have `.on()`, so cleanup now actually runs.
- Every previously-hardcoded value (context key names, folder names,
  refresh intervals, retry count/delay) is now an optional override
  argument with the same defaults as before - so nothing changes unless
  you explicitly pass different options.

## Adding/changing tags going forward

Never touch any node's script again. Just edit whatever populates
`OpcBlueprint` in flow context (your "Load Master Dictionary" function
node, or wherever that comes from) - the shared helper picks up any
folder/tag structure automatically the next time a server node
(re)deploys.

## Optional: Bad-quality tags when the device/feed goes down

By default, if your data source (MQTT feed, PLC connection, etc.) stops
sending updates, tags silently keep reporting their last known value as
if it were still current - a client has no way to tell the data is
stale just by looking at the value. Kepware and similar gateways solve
this with OPC UA's built-in quality/status-code mechanism: flagging
every tag Bad when the underlying device or connection is down, rather
than showing stale-but-plausible-looking numbers.

This helper supports the same pattern via a heartbeat convention:

1. Replace your MQTT ingest Function node's script with the updated
   version in `opcua-ingest-with-heartbeat.js` (in this same folder).
   The only change is one new line,
   `flow.set("OpcDataLastUpdate", Date.now(), "memoryOnly")`, set
   whenever a message actually arrives - regardless of whether any tag
   value changed, since even a repeated identical reading proves the
   device is still communicating.

2. That's it by default - `staleDataThresholdMs` defaults to 10 seconds.
   If no heartbeat update lands within that window, every tag on that
   server node reports `BadNoCommunication` to OPC UA clients instead
   of `Good`, until the heartbeat resumes.

3. To tune this per node, pass overrides in the bootstrap script's
   options object:
   ```js
   { staleDataThresholdMs: 5000, staleDataStatusCode: "BadDeviceFailure" }
   ```
   `staleDataStatusCode` can be any name from node-opcua's `StatusCodes`
   enum (e.g. `BadNoCommunication`, `BadDeviceFailure`,
   `BadWaitingForInitialData`).

If you don't add the heartbeat line to your ingest function, this
feature is simply inactive - tags always report Good, exactly like
before. Nothing breaks either way; the heartbeat key is checked
defensively and staleness detection is skipped entirely if it's never
set.
