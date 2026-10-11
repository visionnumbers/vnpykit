"""Python-visible protocol version and typed envelope definitions.

Validation authority lives in ``@vnpykit/protocol``. These definitions let
the future Worker bridge produce messages without importing browser objects.
"""

from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

PROTOCOL_MAJOR: Literal[1] = 1
MAX_MESSAGE_BYTES = 256 * 1024
MAX_NODES_PER_SNAPSHOT = 2_000
MAX_TREE_DEPTH = 32
MAX_PROPS_PER_NODE = 24
MAX_PATCHES_PER_BATCH = 1_000
MAX_TEXT_LENGTH = 20_000

type MessageType = Literal[
    "RUNTIME_READY",
    "UI_SNAPSHOT",
    "PATCH_BATCH",
    "USER_EVENT",
    "RENDER_ACK",
    "ERROR",
    "STOP_REQUEST",
    "STOP_ACK",
    "DISPOSE_REQUEST",
    "DISPOSE_ACK",
]


class Envelope(TypedDict):
    protocol: Literal[1]
    appId: str
    generation: str
    seq: int
    type: MessageType
    payload: dict[str, object]


class UserEventPayload(TypedDict):
    handlerId: str
    nodeId: str
    event: Literal["click", "input", "change", "submit"]
    value: NotRequired[str | bool]


def make_envelope(
    *,
    app_id: str,
    generation: str,
    seq: int,
    message_type: MessageType,
    payload: dict[str, object],
) -> Envelope:
    """Construct an envelope after checking inexpensive producer invariants."""
    if not app_id or len(app_id) > 64 or not _is_identifier(app_id):
        raise ValueError("app_id must match [A-Za-z0-9_-]{1,64}")
    if not generation or len(generation) > 64 or not _is_identifier(generation):
        raise ValueError("generation must match [A-Za-z0-9_-]{1,64}")
    if isinstance(seq, bool) or seq < 0:
        raise ValueError("seq must be a nonnegative integer")
    return {
        "protocol": PROTOCOL_MAJOR,
        "appId": app_id,
        "generation": generation,
        "seq": seq,
        "type": message_type,
        "payload": payload,
    }


def _is_identifier(value: str) -> bool:
    return all(
        character.isascii() and (character.isalnum() or character in "_-")
        for character in value
    )
