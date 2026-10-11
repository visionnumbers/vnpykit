# M2 reactive forms

M2 adds `Row`, `TextInput`, and `Checkbox` to the Python SDK and DOM renderer. It
also adds native form submission, typed event values, validation text, loading and
failure states, bounded reactive processing, and handle recreation.

```python
from visionpy import App, State
from visionpy.ui import Button, Checkbox, Column, Row, Text, TextInput

app = App(title="Registration")
name = State("")
accepted = State(False)
result = State("Complete the form.")

def submit() -> None:
    if len(name.value.strip()) < 2:
        result.set("Enter at least two characters.")
    elif not accepted.value:
        result.set("Accept the terms.")
    else:
        result.set(f"Submitted for {name.value}.")

with app.layout(), Column(gap=12, on_submit=submit):
    with Row(gap=12):
        TextInput(
            "Name",
            value=name,
            required=True,
            validate=lambda value: None if len(value.strip()) >= 2 else "Too short",
        )
        Checkbox("Accept terms", checked=accepted, required=True)
    Text.bind(lambda: f"Draft: {name.value} / accepted: {accepted.value}")
    Text.bind(lambda: result.value)
    Button("Submit", submit=True)

app.run()
```

`TextInput` writes each `input` event to its controlled string state. `Checkbox`
writes each `change` event to its controlled boolean state. Optional callbacks get
immutable `InputEvent` or `ChangeEvent[T]` instances. Validation returns `None` or
a string of at most 20,000 characters. The renderer places that string in an alert
element using `textContent`, links it with `aria-describedby`, and sets
`aria-invalid`; it never interprets validation output as HTML.

A `Column(on_submit=...)` uses a native `form`. `Button(submit=True)` and Enter in
an eligible text control invoke the callback asynchronously in Python. Native
`required` checks happen in the browser before the submit event. Callbacks cannot
synchronously cancel browser defaults after the message crosses the Worker.

The host shows an instance-scoped polite loading status immediately. Fatal startup
or runtime errors replace it with an alert. `handle.focus(nodeId)` focuses an owned
control, and `await handle.recreate()` fully disposes the old instance before
returning a fresh handle and generation. Callers still await `replacement.ready`.

## Verification and performance

Reference machine: Windows 11 Pro 10.0.26200, Intel Core i3-8145U 2.10 GHz,
7.9 GiB RAM, Node 24.20.0, pnpm 12.10.1, Pyodide 314.0.7/Python 3.14.2,
Playwright 1.64.0. Assets and the VisionPy wheel were served from localhost.

Three isolated Chromium repetitions used one Playwright worker. Each browser
context started one cold app, then a second app after the first was ready so HTTP
and OS caches were warm. First-render results in milliseconds were:

| repetition | cold | warm | last callback |
|---|---:|---:|---:|
| 1 | 6,819.8 | 5,249.1 | 3.0 |
| 2 | 7,830.4 | 5,891.3 | 2.0 |
| 3 | 7,615.1 | 5,997.3 | 2.1 |
| median | 7,615.1 | 5,891.3 | 2.1 |

The M1 checkpoint rerun mounted two cold workers concurrently and measured about
12.7-12.8 seconds to first render with 2.7-4.2 ms callbacks on this machine. The
M2 sequential example removes that startup contention, but the workloads and cache
conditions differ, so the numbers do not establish a release performance target.

The final cross-engine run used two Playwright workers, causing machine contention:
Chromium cold/warm 27,540.4/14,851.3 ms, Firefox 24,475/21,093 ms, and WebKit
21,449/14,813 ms. Callback latency after rapid typing was 13.4/67/9 ms. These are
contention measurements rather than release targets. Pyodide initialization and
wheel installation remain the dominant costs.

The real Chromium 30-cycle dispose/recreate test passed in 3.4 minutes and checked
a fresh generation every cycle plus sibling isolation. The opt-in 100-cycle release
stress test is present and runs with `RUN_RELEASE_STRESS=1`; it remains pending in
this M2 verification because a full run is not practical for the normal CI budget.

## Current limits

- A Worker is not a hardened sandbox for hostile Python.
- The tree remains fixed after the snapshot; only allowlisted properties patch.
- Accessibility verification covers semantic DOM, associated labels, keyboard
  focus, Enter submission, visible focus CSS, and alert/status roles. It does not
  include a manual screen-reader or high-contrast audit.
- Event limits are application guards rather than browser CPU or memory quotas.
- Async Python callbacks, dynamic collections, file controls, select controls, and
  cross-origin untrusted-code hosting remain later work.
