# M5 real app validation

This record captures an independently developed, Python-authored Task Manager
validation completed on 2026-10-13 against the published VNPyKit public alpha.
The application was not a monorepo fixture. Results describe the scenarios that
were run; they do not establish full API stability or production readiness.

## Manual application evidence

| Application stage | Result | Scope |
| --- | --- | --- |
| Beginner v1 | 5/5 PASS | The five planned manual scenarios passed. |
| Intermediate v2 | 8/8 PASS | The eight planned manual scenarios passed. |
| Advanced v3 | 11/11 PASS | The eleven planned scenarios passed after an application callback was corrected. |

The advanced-app failure was caused by an application-level callback signature,
not a framework or protocol failure. A handler intended to capture a task ID was
declared with a positional parameter. VNPyKit correctly treated it as an
event-accepting callback and supplied the click event. Use a zero-argument
callback factory when a handler only needs captured application state:

```python
def make_delete_handler(task_id: int):
    def handle_delete() -> None:
        delete_task(task_id)

    return handle_delete


Button("Delete", on_click=make_delete_handler(task.id))
```

A one-argument handler remains appropriate when the application deliberately
consumes the typed event.

## Browser and repetition evidence

- Playwright Chromium: PASS.
- Playwright Firefox: PASS.
- Playwright WebKit: PASS.
- Chromium with `--repeat-each=10`: 10/10 PASS.

These automated results cover the tested Task Manager flows. Playwright WebKit
is not a substitute for manual Safari or assistive-technology testing on macOS.
Safari with VoiceOver remains **NOT RUN** under the existing alpha waiver.

## Static deployment evidence

The published CLI completed a static build. On the tested Windows system,
Python's default static HTTP server returned `text/plain` for
`pyodide.mjs`. The browser rejected that JavaScript module, and startup surfaced
`BOOT_FAILED`. After the server explicitly mapped `.mjs` to
`text/javascript`, direct module import passed. Task creation, completion,
editing, and deletion then passed on the static build.

A Python-side stress simulation also manipulated 100 task data records. Those
were **100 Python records, not 100 simultaneously rendered interactive widgets**.
The result does not validate dynamic widget insertion, a 100-widget DOM tree, or
large interactive-list performance.

See [static deployment](deployment.md#windows-python-http-server) for the server
configuration and [troubleshooting](troubleshooting.md) for the failure symptom.

## Validation boundaries

This evidence does not add support claims for persistence, dynamic structural
widget mutation, arbitrary packages, hostile-code isolation, mobile browsers,
or production operation. The public alpha API may still change before a stable
release.
