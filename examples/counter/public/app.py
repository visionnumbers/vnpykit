from visionpy import App, State, __version__
from visionpy.ui import Button, Column, Container, Text

app = App(title="VisionPy Counter")
count = State(0)

with app.layout(), Container(padding=20), Column(gap=12):
    Text("VisionPy Counter", level="h2")
    Text(f"SDK {__version__}", tone="muted")
    Text.bind(lambda: f"Count: {count.value}")
    Button("Increase", on_click=lambda: count.set(count.value + 1))

app.run()
