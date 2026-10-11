from vnpykit import App, State, __version__
from vnpykit.ui import Button, Checkbox, Column, Container, Row, Text, TextInput

app = App(title="VNPyKit Counter")
count = State(0)
name = State("")
accepted = State(False)
result = State("Complete the form.")


def submit() -> None:
    if len(name.value.strip()) < 2:
        result.set("Enter at least two characters.")
    elif not accepted.value:
        result.set("Accept the browser-only demo terms.")
    else:
        result.set(f"Submitted for {name.value}.")

with app.layout(), Container(padding=20), Column(gap=12, on_submit=submit):
    Text("VNPyKit Counter", level="h2")
    Text(f"SDK {__version__}", tone="muted")
    Text.bind(lambda: f"Count: {count.value}")
    Button("Increase", on_click=lambda: count.set(count.value + 1))
    with Row(gap=12):
        TextInput(
            "Name",
            value=name,
            placeholder="Ada Lovelace",
            required=True,
            validate=lambda value: None if len(value.strip()) >= 2 else "Use at least 2 characters",
        )
        Checkbox("Accept demo terms", checked=accepted, required=True)
    Text.bind(lambda: f"Draft: {name.value or '(empty)'} / accepted: {accepted.value}")
    Text.bind(lambda: result.value)
    Button("Submit form", submit=True)

app.run()
