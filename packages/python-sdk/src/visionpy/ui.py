"""M1 widget set."""

from __future__ import annotations

from collections.abc import Callable
from typing import Literal

from .component import Component
from .exceptions import InvalidPropertyError
from .protocol import MAX_TEXT_LENGTH
from .state import Binding

Align = Literal["start", "center", "end", "stretch"]
TextLevel = Literal["body", "h1", "h2"]
TextTone = Literal["default", "muted"]


class Text(Component):
    kind = "text"

    def __init__(
        self,
        text: str,
        *,
        level: TextLevel = "body",
        tone: TextTone = "default",
    ) -> None:
        _text(text, "text")
        if level not in {"body", "h1", "h2"}:
            raise InvalidPropertyError("Text.level must be body, h1, or h2")
        if tone not in {"default", "muted"}:
            raise InvalidPropertyError("Text.tone must be default or muted")
        super().__init__({"text": text, "level": level, "tone": tone})

    @classmethod
    def bind(
        cls,
        getter: Callable[[], str],
        *,
        level: TextLevel = "body",
        tone: TextTone = "default",
    ) -> Text:
        component = cls("", level=level, tone=tone)
        binding = Binding(component, "text", getter)
        binding.attach()
        return component


class Button(Component):
    kind = "button"

    def __init__(
        self,
        text: str,
        *,
        on_click: Callable[[], None] | None = None,
        disabled: bool = False,
    ) -> None:
        _text(text, "text")
        _boolean(disabled, "disabled")
        super().__init__({"text": text, "disabled": disabled})
        if on_click is not None:
            if not callable(on_click):
                raise InvalidPropertyError("Button.on_click must be callable")
            self._register_event("click", on_click)


class Column(Component):
    kind = "column"
    is_container = True

    def __init__(self, *, gap: int = 8, align: Align = "stretch") -> None:
        _bounded_integer(gap, "gap", 0, 64)
        if align not in {"start", "center", "end", "stretch"}:
            raise InvalidPropertyError("Column.align is invalid")
        super().__init__({"gap": gap, "align": align})


class Container(Component):
    kind = "container"
    is_container = True

    def __init__(self, *, padding: int = 0, width: int | None = None) -> None:
        _bounded_integer(padding, "padding", 0, 64)
        if width is not None:
            _bounded_integer(width, "width", 0, 4096)
        super().__init__({"padding": padding, "width": width})


def _text(value: object, name: str) -> None:
    if not isinstance(value, str):
        raise InvalidPropertyError(f"{name} must be a string")
    if len(value) > MAX_TEXT_LENGTH:
        raise InvalidPropertyError(f"{name} exceeds {MAX_TEXT_LENGTH} characters")


def _boolean(value: object, name: str) -> None:
    if not isinstance(value, bool):
        raise InvalidPropertyError(f"{name} must be a boolean")


def _bounded_integer(value: object, name: str, minimum: int, maximum: int) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum or value > maximum:
        raise InvalidPropertyError(f"{name} must be an integer in [{minimum}, {maximum}]")

