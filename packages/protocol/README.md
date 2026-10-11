# @vnpykit/protocol

Strict TypeScript contracts and bounded validators for VNPyKit protocol major 1.
The package validates message size, envelope shape, sequencing, ownership,
snapshots, patches, events, lifecycle messages, and stable error contracts.

```ts
import { parseEnvelope, PROTOCOL_MAJOR } from "@vnpykit/protocol";
```

This is public alpha software. Protocol major 1 is stable for the 0.1 alpha line,
but higher-level APIs may still change. Apache-2.0.
