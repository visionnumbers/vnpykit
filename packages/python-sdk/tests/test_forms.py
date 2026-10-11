from __future__ import annotations

import json
from typing import cast

from vnpykit import App, ChangeEvent, InputEvent, State, _bridge
from vnpykit.ui import Button, Checkbox, Column, Row, Text, TextInput


def install_capture() -> list[dict[str, object]]:
    messages: list[dict[str, object]] = []
    _bridge.install(lambda value: messages.append(json.loads(value)), "app_1", "generation_1")
    return messages


def event(seq: int, handler: str, node: str, kind: str, value: object = None) -> str:
    payload: dict[str, object] = {"handlerId": handler, "nodeId": node, "event": kind}
    if value is not None:
        payload["value"] = value
    return json.dumps(
        {
            "protocol": 1,
            "appId": "app_1",
            "generation": "generation_1",
            "seq": seq,
            "type": "USER_EVENT",
            "payload": payload,
        }
    )


def test_controlled_form_round_trip_and_typed_events() -> None:
    messages = install_capture()
    name = State("")
    accepted = State(False)
    seen: list[object] = []
    submitted = State(0)
    app = App(title="Form")
    with app.layout(), Column(on_submit=lambda: submitted.set(submitted.value + 1)):
        with Row():
            TextInput("Name", value=name, on_input=seen.append)
            Checkbox("Accept", checked=accepted, on_change=seen.append)
        Button("Submit", submit=True)
    app.run()

    root = cast(dict[str, object], messages[0]["payload"])["root"]
    assert cast(dict[str, object], root)["kind"] == "column"
    _bridge.dispatch_json(event(0, "2", "3", "input", "Ada"))
    _bridge.dispatch_json(event(1, "3", "4", "change", True))
    _bridge.dispatch_json(event(2, "1", "1", "submit"))

    assert name.value == "Ada"
    assert accepted.value is True
    assert submitted.value == 1
    assert isinstance(seen[0], InputEvent)
    assert isinstance(seen[1], ChangeEvent)
    assert cast(InputEvent, seen[0]).value == "Ada"
    assert cast(ChangeEvent[bool], seen[1]).value is True


def test_validation_is_bounded_and_recovers() -> None:
    messages = install_capture()
    value = State("")
    app = App()
    with app.layout(), Column():
        TextInput(
            "Email",
            value=value,
            validate=lambda text: None if "@" in text else "Enter a valid email",
        )
    app.run()
    _bridge.dispatch_json(event(0, "1", "2", "input", "invalid"))
    assert any(
        message["type"] == "PATCH_BATCH"
        and any(
            cast(dict[str, object], change).get("props")
            == {"value": "invalid", "error": "Enter a valid email"}
            for change in cast(list[object], cast(dict[str, object], message["payload"])["changes"])
        )
        for message in messages
    )
    _bridge.dispatch_json(event(1, "1", "2", "input", "a@example.test"))
    assert value.value == "a@example.test"


def test_runaway_reactivity_is_stopped_and_reported() -> None:
    messages = install_capture()
    value = State(0)
    armed = State(False)
    app = App()

    def render() -> str:
        current = value.value
        if armed.value:
            value.set(current + 1)
        return str(current)

    with app.layout(), Column():
        Text.bind(render)
        Button("Arm", on_click=lambda: armed.set(True))
    app.run()
    _bridge.dispatch_json(event(0, "1", "3", "click"))
    errors = [message for message in messages if message["type"] == "ERROR"]
    assert any(
        cast(dict[str, object], item["payload"])["code"] == "REACTIVITY_LOOP"
        for item in errors
    )
    assert value.value <= 101


def teardown_function() -> None:
    _bridge.dispose_transport()
