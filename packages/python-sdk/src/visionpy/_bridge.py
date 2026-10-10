"""Internal JSON bridge injected by the Pyodide Worker."""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping
from typing import TYPE_CHECKING, Literal, cast

from .exceptions import ProtocolMismatchError, VisionPyRuntimeError
from .protocol import MAX_MESSAGE_BYTES, PROTOCOL_MAJOR

if TYPE_CHECKING:
    from .app import App

_sink: Callable[[str], object] | None = None
_app_id: str | None = None
_generation: str | None = None
_sequence = 1
_incoming_sequence = -1
_app: App | None = None


def install(sink: Callable[[str], object], app_id: str, generation: str) -> None:
    global _sink, _app_id, _generation, _sequence, _incoming_sequence
    dispose_transport()
    _sink = sink
    _app_id = app_id
    _generation = generation
    _sequence = 1
    _incoming_sequence = -1


def is_installed() -> bool:
    return _sink is not None


def bind_app(app: App) -> None:
    global _app
    if _app is not None and _app is not app and _app.status != "disposed":
        raise VisionPyRuntimeError("worker already owns another active app")
    _app = app


def send_snapshot(payload: dict[str, object]) -> None:
    _send("UI_SNAPSHOT", payload)


def send_patch_batch(changes: list[dict[str, object]]) -> None:
    _send("PATCH_BATCH", {"changes": changes})


def send_error(
    code: str,
    message: str,
    phase: Literal["bootstrap", "build", "callback", "render", "protocol"],
    *,
    fatal: bool,
) -> None:
    _send("ERROR", {"code": code, "message": message[:20_000], "phase": phase, "fatal": fatal})


def dispatch_json(serialized: str) -> None:
    global _incoming_sequence
    try:
        message = json.loads(serialized)
    except (TypeError, json.JSONDecodeError) as error:
        raise VisionPyRuntimeError("invalid bridge JSON", code="INVALID_MESSAGE") from error
    if not isinstance(message, Mapping):
        raise VisionPyRuntimeError("bridge message must be an object", code="INVALID_MESSAGE")
    if message.get("protocol") != PROTOCOL_MAJOR:
        raise ProtocolMismatchError("host protocol major does not match SDK")
    if message.get("appId") != _app_id or message.get("generation") != _generation:
        raise VisionPyRuntimeError(
            "message belongs to a stale worker generation", code="INVALID_MESSAGE"
        )
    seq = message.get("seq")
    if isinstance(seq, bool) or not isinstance(seq, int) or seq != _incoming_sequence + 1:
        raise VisionPyRuntimeError("host message sequence is invalid", code="INVALID_MESSAGE")
    _incoming_sequence = seq
    message_type = message.get("type")
    payload = message.get("payload")
    if not isinstance(payload, Mapping):
        raise VisionPyRuntimeError("message payload must be an object", code="INVALID_MESSAGE")
    app = _app
    if message_type == "RENDER_ACK":
        return
    if app is None:
        raise VisionPyRuntimeError("no running app is bound", code="BOOT_FAILED")
    if message_type == "USER_EVENT":
        app.dispatch_event(payload)
    elif message_type == "STOP_REQUEST":
        app.request_stop()
        _send("STOP_ACK", {})
    elif message_type == "DISPOSE_REQUEST":
        app.dispose()
        _send("DISPOSE_ACK", {})
    else:
        raise VisionPyRuntimeError("unsupported host message", code="INVALID_MESSAGE")


def dispose_transport() -> None:
    global _sink, _app
    sink = _sink
    _sink = None
    _app = None
    if sink is not None:
        destroy = getattr(sink, "destroy", None)
        if callable(destroy):
            destroy()


def _send(message_type: str, payload: dict[str, object]) -> None:
    global _sequence
    if _sink is None or _app_id is None or _generation is None:
        return
    message = {
        "protocol": PROTOCOL_MAJOR,
        "appId": _app_id,
        "generation": _generation,
        "seq": _sequence,
        "type": message_type,
        "payload": payload,
    }
    serialized = json.dumps(message, allow_nan=False, separators=(",", ":"))
    if len(serialized.encode("utf-8")) > MAX_MESSAGE_BYTES:
        raise VisionPyRuntimeError("outgoing message exceeds protocol byte limit")
    _sequence += 1
    cast(Callable[[str], object], _sink)(serialized)
