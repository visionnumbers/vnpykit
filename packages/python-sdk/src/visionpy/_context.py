"""Construction context owned by the pure-Python SDK."""

from __future__ import annotations

from contextvars import ContextVar, Token
from typing import TYPE_CHECKING

from .exceptions import LifecycleError

if TYPE_CHECKING:
    from .app import App
    from .component import Component

_current_app: ContextVar[App | None] = ContextVar("visionpy_current_app", default=None)
_current_parent: ContextVar[Component | None] = ContextVar("visionpy_current_parent", default=None)


def require_app() -> App:
    app = _current_app.get()
    if app is None:
        raise LifecycleError("widgets must be created inside App.layout()")
    return app


def current_parent() -> Component | None:
    return _current_parent.get()


def push_app(app: App) -> Token[App | None]:
    return _current_app.set(app)


def pop_app(token: Token[App | None]) -> None:
    _current_app.reset(token)


def push_parent(component: Component) -> Token[Component | None]:
    return _current_parent.set(component)


def pop_parent(token: Token[Component | None]) -> None:
    _current_parent.reset(token)

