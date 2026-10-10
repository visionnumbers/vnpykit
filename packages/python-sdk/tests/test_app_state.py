from __future__ import annotations

import json
from collections.abc import Callable, Iterator
from typing import cast

import pytest

from visionpy import App, LifecycleError, State, _bridge
from visionpy.exceptions import InvalidPropertyError, VisionPyRuntimeError
from visionpy.ui import Button, Column, Container, Text


@pytest.fixture(autouse=True)
def clean_bridge() -> Iterator[None]:
    _bridge.dispose_transport()
    yield
    _bridge.dispose_transport()


def counter_app() -> tuple[App, State[int]]:
    app = App(title="Counter")
    count = State(0)
    with app.layout(), Container(padding=12), Column(gap=8):
        Text.bind(lambda: f"Count: {count.value}")
        Button("Increase", on_click=lambda: count.set(count.value + 1))
    return app, count


def install_capture() -> tuple[list[dict[str, object]], Callable[[str], object]]:
    messages: list[dict[str, object]] = []

    def sink(serialized: str) -> object:
        value = json.loads(serialized)
        assert isinstance(value, dict)
        messages.append(value)
        return None

    _bridge.install(sink, "browser_app", "generation_1")
    return messages, sink


def host_message(seq: int, message_type: str, payload: dict[str, object]) -> str:
    return json.dumps(
        {
            "protocol": 1,
            "appId": "browser_app",
            "generation": "generation_1",
            "seq": seq,
            "type": message_type,
            "payload": payload,
        }
    )


def test_snapshot_has_stable_ordered_identity() -> None:
    app, _ = counter_app()
    payload = app.snapshot_payload()
    root = payload["root"]
    assert isinstance(root, dict)
    assert root["id"] == "1"
    assert root["kind"] == "container"
    children = cast(list[dict[str, object]], root["children"])
    column = children[0]
    assert column["id"] == "2"
    column_children = cast(list[dict[str, object]], column["children"])
    assert [child["id"] for child in column_children] == ["3", "4"]
    assert column_children[1]["events"] == {"click": "1"}


def test_app_and_node_identity_are_scoped() -> None:
    first, _ = counter_app()
    second, _ = counter_app()
    assert first.id != second.id
    first_root = cast(dict[str, object], first.snapshot_payload()["root"])
    second_root = cast(dict[str, object], second.snapshot_payload()["root"])
    assert first_root["id"] == "1"
    assert second_root["id"] == "1"


def test_widget_requires_layout_and_tree_freezes_after_run() -> None:
    with pytest.raises(LifecycleError, match=r"inside App\.layout"):
        Text("outside")
    app, _ = counter_app()
    app.run()
    with pytest.raises(LifecycleError, match=r"inside App\.layout"):
        Text("late")


def test_lifecycle_and_disposal_are_repeat_safe() -> None:
    app, _ = counter_app()
    assert app.status == "ready"
    app.run()
    assert app.status == "running"
    with pytest.raises(LifecycleError, match="only be called once"):
        app.run()
    app.dispose()
    app.dispose()
    assert app.status == "disposed"


@pytest.mark.parametrize(
    ("factory", "message"),
    [
        (lambda: Column(gap=65), "gap"),
        (lambda: Container(width=4097), "width"),
        (lambda: Text("x" * 20_001), "exceeds"),
        (lambda: Button("bad", disabled=cast(bool, 1)), "boolean"),
    ],
)
def test_properties_are_bounded(factory: Callable[[], object], message: str) -> None:
    app = App()
    with pytest.raises(InvalidPropertyError, match=message), app.layout():
        factory()


def test_bound_state_emits_one_patch_after_event_batch() -> None:
    messages, _ = install_capture()
    app, count = counter_app()
    app.run()
    assert messages[0]["type"] == "UI_SNAPSHOT"
    _bridge.dispatch_json(host_message(0, "RENDER_ACK", {"ackSeq": 1}))
    _bridge.dispatch_json(
        host_message(1, "USER_EVENT", {"handlerId": "1", "nodeId": "4", "event": "click"})
    )
    assert count.value == 1
    assert messages[-1]["type"] == "PATCH_BATCH"
    assert messages[-1]["payload"] == {"changes": [{"id": "3", "props": {"text": "Count: 1"}}]}


def test_repeated_events_reach_count_three() -> None:
    messages, _ = install_capture()
    app, count = counter_app()
    app.run()
    _bridge.dispatch_json(host_message(0, "RENDER_ACK", {"ackSeq": 1}))
    for seq in range(1, 4):
        _bridge.dispatch_json(
            host_message(seq, "USER_EVENT", {"handlerId": "1", "nodeId": "4", "event": "click"})
        )
    assert count.value == 3
    patches = [message for message in messages if message["type"] == "PATCH_BATCH"]
    assert len(patches) == 3


def test_callback_error_is_reported_and_next_event_recovers() -> None:
    messages, _ = install_capture()
    app = App()
    count = State(0)

    def callback() -> None:
        if count.value == 0:
            count.set(1)
            raise RuntimeError("first click failed")
        count.set(count.value + 1)

    with app.layout(), Column():
        Text.bind(lambda: str(count.value))
        Button("Increase", on_click=callback)
    app.run()
    _bridge.dispatch_json(host_message(0, "RENDER_ACK", {"ackSeq": 1}))
    event: dict[str, object] = {"handlerId": "1", "nodeId": "3", "event": "click"}
    _bridge.dispatch_json(host_message(1, "USER_EVENT", event))
    _bridge.dispatch_json(host_message(2, "USER_EVENT", event))
    assert count.value == 2
    assert any(
        message["type"] == "ERROR"
        and cast(dict[str, object], message["payload"])["code"] == "CALLBACK_ERROR"
        for message in messages
    )


def test_invalid_callback_and_stale_generation_are_rejected() -> None:
    install_capture()
    app, _ = counter_app()
    app.run()
    _bridge.dispatch_json(host_message(0, "RENDER_ACK", {"ackSeq": 1}))
    with pytest.raises(VisionPyRuntimeError, match="unknown"):
        _bridge.dispatch_json(
            host_message(1, "USER_EVENT", {"handlerId": "99", "nodeId": "4", "event": "click"})
        )
    stale = json.loads(host_message(1, "USER_EVENT", {}))
    stale["generation"] = "old_generation"
    with pytest.raises(VisionPyRuntimeError, match="stale"):
        _bridge.dispatch_json(json.dumps(stale))


def test_dispose_detaches_bindings_and_callbacks() -> None:
    messages, _ = install_capture()
    app, count = counter_app()
    app.run()
    app.dispose()
    before = len(messages)
    count.set(10)
    assert len(messages) == before
    with pytest.raises(VisionPyRuntimeError, match="not accepting"):
        app.dispatch_event({"handlerId": "1", "nodeId": "4", "event": "click"})


def test_subscription_unsubscribe_is_idempotent() -> None:
    state = State(0)
    values: list[int] = []
    unsubscribe = state.subscribe(values.append)
    state.set(1)
    unsubscribe()
    unsubscribe()
    state.set(2)
    assert values == [1]
