# Python API

VNPyKit `0.1.0a1` exposes a small typed application and forms API.

```python
from vnpykit import App, State
from vnpykit.ui import Button, Checkbox, Column, Container, Row, Text, TextInput
```

`App(title=...)` owns one component tree, callback registry, Worker session, and
lifecycle. Build its tree inside `app.layout()`, then call `app.run()`. `stop()`
stops the active session, `dispose()` permanently releases it, and `recreate()`
starts a fresh generation after disposal.

`State(value)` stores reactive data. Widgets can bind to a state object, while
`Text.bind(callable)` derives text and tracks state reads. Callback mutations are
batched into bounded property patches. A reactive callback is terminated with a
typed error if it exceeds the evaluation budget.

`Container`, `Column`, and `Row` define layout. `Text` renders text only. `Button`
emits click or submit events. `TextInput` and `Checkbox` are controlled form
widgets with labels, required/invalid state, and immutable typed events. No API
accepts raw HTML, arbitrary JavaScript, remote Python packages, or dynamic tree
patches in this alpha.

Protocol and lifecycle failures surface as stable error codes described in
[protocol v1](protocol-v1.md). The public type hints are authoritative for exact
constructor and callback signatures.

