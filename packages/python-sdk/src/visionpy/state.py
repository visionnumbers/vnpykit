"""Synchronous reactive state and dependency tracking."""

from __future__ import annotations

import math
from collections.abc import Callable
from contextvars import ContextVar
from typing import TYPE_CHECKING, cast

from .exceptions import InvalidPropertyError

if TYPE_CHECKING:
    from .component import Component, Scalar

_active_binding: ContextVar[Binding | None] = ContextVar("visionpy_active_binding", default=None)


class State[T]:
    def __init__(self, initial: T) -> None:
        self._value = initial
        self._observers: list[Callable[[T], None]] = []
        self._bindings: set[Binding] = set()

    @property
    def value(self) -> T:
        binding = _active_binding.get()
        if binding is not None:
            binding._record(cast(State[object], self))
        return self._value

    def set(self, value: T) -> None:
        if _values_equal(self._value, value):
            return
        self._value = value
        for observer in tuple(self._observers):
            observer(value)
        for binding in tuple(self._bindings):
            binding.invalidate()

    def subscribe(self, observer: Callable[[T], None]) -> Callable[[], None]:
        self._observers.append(observer)
        active = True

        def unsubscribe() -> None:
            nonlocal active
            if active:
                active = False
                self._observers.remove(observer)

        return unsubscribe


class Binding:
    def __init__(self, component: Component, prop: str, getter: Callable[[], Scalar]) -> None:
        self._component = component
        self._prop = prop
        self._getter = getter
        self._dependencies: set[State[object]] = set()
        self._collecting: set[State[object]] | None = None
        self._disposed = False

    def attach(self) -> None:
        self.evaluate()
        self._component._add_binding(self)

    def _record(self, state: State[object]) -> None:
        if self._collecting is not None:
            self._collecting.add(state)

    def evaluate(self) -> None:
        collecting: set[State[object]] = set()
        self._collecting = collecting
        token = _active_binding.set(self)
        try:
            value = self._getter()
            _validate_bound_value(value)
        finally:
            _active_binding.reset(token)
            self._collecting = None
        for state in self._dependencies - collecting:
            state._bindings.discard(self)
        for state in collecting - self._dependencies:
            state._bindings.add(self)
        self._dependencies = collecting
        self._component._set_bound_prop(self._prop, value)

    def invalidate(self) -> None:
        if self._disposed:
            return
        try:
            self.evaluate()
        except Exception as error:
            self._component._app._report_callback_error(error)

    def dispose(self) -> None:
        if self._disposed:
            return
        self._disposed = True
        for state in self._dependencies:
            state._bindings.discard(self)
        self._dependencies.clear()


def _values_equal(left: object, right: object) -> bool:
    primitives = (str, bool, int, float, type(None))
    if isinstance(left, primitives) and isinstance(right, primitives):
        return left == right
    return left is right


def _validate_bound_value(value: object) -> None:
    if not isinstance(value, (str, bool, int, float)) and value is not None:
        raise InvalidPropertyError("bound values must be JSON scalar values")
    if isinstance(value, float) and not math.isfinite(value):
        raise InvalidPropertyError("bound numeric values must be finite")
