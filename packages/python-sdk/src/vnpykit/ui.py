"""Renderer-supported widgets for layouts, content, and controlled forms."""

from __future__ import annotations

from collections.abc import Callable
from typing import Literal, cast

from .component import Component
from .events import ChangeEvent, InputEvent
from .exceptions import InvalidPropertyError
from .protocol import MAX_TEXT_LENGTH
from .state import Binding, State

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
        on_click: Callable[..., None] | None = None,
        disabled: bool = False,
        submit: bool = False,
    ) -> None:
        _text(text, "text")
        _boolean(disabled, "disabled")
        _boolean(submit, "submit")
        super().__init__({"text": text, "disabled": disabled, "submit": submit})
        if on_click is not None:
            if not callable(on_click):
                raise InvalidPropertyError("Button.on_click must be callable")
            self._register_event("click", on_click)


class Column(Component):
    kind = "column"
    is_container = True

    def __init__(
        self,
        *,
        gap: int = 8,
        align: Align = "stretch",
        on_submit: Callable[..., None] | None = None,
    ) -> None:
        _bounded_integer(gap, "gap", 0, 64)
        if align not in {"start", "center", "end", "stretch"}:
            raise InvalidPropertyError("Column.align is invalid")
        super().__init__({"gap": gap, "align": align})
        if on_submit is not None:
            self._register_event("submit", on_submit)


class Row(Component):
    kind = "row"
    is_container = True

    def __init__(self, *, gap: int = 8, align: Align = "center") -> None:
        _bounded_integer(gap, "gap", 0, 64)
        if align not in {"start", "center", "end", "stretch"}:
            raise InvalidPropertyError("Row.align is invalid")
        super().__init__({"gap": gap, "align": align})


class TextInput(Component):
    """A controlled text field; browser input is reconciled with ``value``."""

    kind = "textInput"

    def __init__(
        self,
        label: str,
        *,
        value: str | State[str] = "",
        placeholder: str = "",
        disabled: bool = False,
        required: bool = False,
        on_input: Callable[[InputEvent], None] | None = None,
        on_change: Callable[[ChangeEvent[str]], None] | None = None,
        validate: Callable[[str], str | None] | None = None,
    ) -> None:
        _text(label, "label")
        _text(placeholder, "placeholder")
        _boolean(disabled, "disabled")
        _boolean(required, "required")
        state = cast(State[str], value) if isinstance(value, State) else None
        initial = state.value if state is not None else cast(str, value)
        _text(initial, "value")
        super().__init__(
            {
                "label": label,
                "value": initial,
                "placeholder": placeholder,
                "disabled": disabled,
                "required": required,
                "error": None,
            }
        )
        if state is not None:
            binding = Binding(self, "value", lambda: state.value)
            binding.attach()

        def handle(event: InputEvent | ChangeEvent[str]) -> None:
            if not isinstance(event.value, str):
                raise InvalidPropertyError("TextInput events require a string value")
            self._set_bound_prop("value", event.value)
            if state is not None:
                state.set(event.value)
            self._set_bound_prop("error", _validation_error(validate, event.value))
            if isinstance(event, InputEvent):
                if on_input is not None:
                    on_input(event)
            elif on_change is not None:
                on_change(event)

        if state is not None or on_input is not None or validate is not None:
            self._register_event("input", handle)
        if on_change is not None:
            self._register_event("change", handle)


class Checkbox(Component):
    """A controlled native checkbox with a typed boolean change event."""

    kind = "checkbox"

    def __init__(
        self,
        label: str,
        *,
        checked: bool | State[bool] = False,
        disabled: bool = False,
        required: bool = False,
        on_change: Callable[[ChangeEvent[bool]], None] | None = None,
        validate: Callable[[bool], str | None] | None = None,
    ) -> None:
        _text(label, "label")
        _boolean(disabled, "disabled")
        _boolean(required, "required")
        state = cast(State[bool], checked) if isinstance(checked, State) else None
        initial = state.value if state is not None else cast(bool, checked)
        _boolean(initial, "checked")
        super().__init__(
            {
                "label": label,
                "checked": initial,
                "disabled": disabled,
                "required": required,
                "error": None,
            }
        )
        if state is not None:
            binding = Binding(self, "checked", lambda: state.value)
            binding.attach()

        def handle(event: ChangeEvent[bool]) -> None:
            if not isinstance(event.value, bool):
                raise InvalidPropertyError("Checkbox change events require a boolean value")
            self._set_bound_prop("checked", event.value)
            if state is not None:
                state.set(event.value)
            self._set_bound_prop("error", _validation_error(validate, event.value))
            if on_change is not None:
                on_change(event)

        if state is not None or on_change is not None or validate is not None:
            self._register_event("change", handle)


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


def _validation_error[T: (str, bool)](
    validator: Callable[[T], str | None] | None, value: T
) -> str | None:
    if validator is None:
        return None
    result = validator(value)
    if result is not None:
        _text(result, "validation error")
    return result
