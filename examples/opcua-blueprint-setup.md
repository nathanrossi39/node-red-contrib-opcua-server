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
