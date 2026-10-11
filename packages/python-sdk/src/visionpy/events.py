"""Typed, DOM-free event values delivered to Python callbacks."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True, slots=True)
class ClickEvent:
    node_id: str
    kind: Literal["click"] = "click"


@dataclass(frozen=True, slots=True)
class InputEvent:
    node_id: str
    value: str
    kind: Literal["input"] = "input"


@dataclass(frozen=True, slots=True)
class ChangeEvent[T: (str, bool)]:
    node_id: str
    value: T
    kind: Literal["change"] = "change"


@dataclass(frozen=True, slots=True)
class SubmitEvent:
    node_id: str
    kind: Literal["submit"] = "submit"


type VisionPyEvent = ClickEvent | InputEvent | ChangeEvent[str] | ChangeEvent[bool] | SubmitEvent
