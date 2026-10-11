# Protocol v1

Every message is a plain structured-clone-safe object:

```json
{
  "protocol": 1,
  "appId": "app_1",
  "generation": "worker_1",
  "seq": 0,
  "type": "RUNTIME_READY",
  "payload": { "sdkVersion": "0.1.0a1", "protocolMajor": 1 }
}
```

The complete TypeScript union and validators live in `packages/protocol`. Unknown fields and message types are rejected. Session validation additionally checks app and generation identity, strictly increasing per-direction sequence values, mounted node/handler ownership, and event semantics.

Initial soft limits are 256 KiB per JSON message, 2,000 nodes, depth 32, 24 properties per node, 1,000 property patches, 20,000 characters per text field, 100 events per second, and 200 pending events. These are application-level guards rather than browser memory guarantees.

M1 implements `RUNTIME_READY`, `UI_SNAPSHOT`, `RENDER_ACK`, `USER_EVENT`, `PATCH_BATCH`, `ERROR`, `STOP_REQUEST`/`STOP_ACK`, and `DISPOSE_REQUEST`/`DISPOSE_ACK`. The tree freezes after the initial snapshot; patches update allowlisted properties on existing instance-owned nodes only.

M2 keeps this envelope and message union unchanged. It activates the existing
`row`, `textInput`, and `checkbox` widget kinds and adds the compatible `submit`
event kind. Input events carry a string, Checkbox change events carry a boolean,
TextInput change events carry a string, and click/submit carry no value. Session
validation cross-checks each value against the owned node kind and registered event.
New optional form properties are `required`, plain-text `error`, and Button
`submit`; older M1 snapshots remain valid.
