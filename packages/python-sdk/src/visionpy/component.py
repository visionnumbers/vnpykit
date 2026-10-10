"""Component tree primitives."""

from __future__ import annotations

from contextvars import Token
from typing import TYPE_CHECKING, ClassVar

from ._context import current_parent, pop_parent, push_parent, require_app
from .exceptions import LifecycleError

if TYPE_CHECKING:
    from .app import App
    from .state import Binding

Scalar = str | int | float | bool | None


class Component:
    """Base class for renderer-supported components."""

    kind: ClassVar[str]
    is_container: ClassVar[bool] = False

    def __init__(self, props: dict[str, Scalar]) -> None:
        self._app: App = require_app()
        self.id = self._app._allocate_node_id()
        self.props = props
        self.children: list[Component] = []
        self.events: dict[str, str] = {}
        self._bindings: list[Binding] = []
        self._parent_token: Token[Component | None] | None = None
        self._disposed = False

        parent = current_parent()
        self.depth: int = 1 if parent is None else parent.depth + 1
        self._app._attach(self, parent)

    def __enter__(self) -> Component:
        if not self.is_container:
            raise LifecycleError(f"{type(self).__name__} cannot contain child widgets")
        if self._parent_token is not None:
            raise LifecycleError("component context cannot be re-entered")
        self._parent_token = push_parent(self)
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        if self._parent_token is None:
            raise LifecycleError("component context is not active")
        pop_parent(self._parent_token)
        self._parent_token = None

    def _register_event(self, event: str, callback: object) -> None:
        self.events[event] = self._app._register_callback(self, event, callback)

    def _set_bound_prop(self, name: str, value: Scalar) -> None:
        if self.props.get(name) == value:
            return
        self.props[name] = value
        self._app._queue_patch(self.id, {name: value})

    def _add_binding(self, binding: Binding) -> None:
        self._bindings.append(binding)
        self._app._register_binding(binding)

    def to_vnode(self) -> dict[str, object]:
        vnode: dict[str, object] = {
            "id": self.id,
            "kind": self.kind,
            "props": dict(self.props),
            "children": [child.to_vnode() for child in self.children],
        }
        if self.events:
            vnode["events"] = dict(self.events)
        return vnode

    def dispose(self) -> None:
        if self._disposed:
            return
        self._disposed = True
        for binding in tuple(self._bindings):
            binding.dispose()
        for child in tuple(self.children):
            child.dispose()
        self.children.clear()
        self.events.clear()
