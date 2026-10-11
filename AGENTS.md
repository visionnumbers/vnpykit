# VNPyKit contributor instructions

VNPyKit is an independent, globally reusable browser-native Python framework.

- Read `RFC/VNPyKit_RFC_0001_Architecture.md` and `RFC/VNPyKit_v0.1_Implementation_Blueprint.md` before changing public contracts. These historical filenames retain the development codename.
- Never import from VisionNumbers CodeLab or add hard-coded VisionNumbers URLs.
- Keep Python free of DOM access and renderer code free of Python execution or `eval`.
- All wire messages use `protocol`, `appId`, `generation`, `seq`, `type`, and `payload`.
- Validate every incoming message against bounded schemas.
- Do not transmit functions, DOM nodes, or proxies over IPC.
- Do not claim a Worker is a security sandbox for hostile code.
- Report exact commands, failures, and skipped tests.
