# visionpy Python SDK

This pure-Python package supplies the VisionPy application model, reactive state,
controlled forms, typed DOM-free events, callback ownership, snapshot serialization,
property patches, protocol constants, and error contracts. Browser DOM and Pyodide
loading remain in the TypeScript packages.

M2 widgets are `Container`, `Column`, `Row`, `Text`, `Button`, `TextInput`, and
`Checkbox`. Pass `State[str]` to `TextInput(value=...)` or `State[bool]` to
`Checkbox(checked=...)` for controlled values.
