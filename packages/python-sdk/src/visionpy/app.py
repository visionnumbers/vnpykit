"""VisionPy application lifecycle, tree ownership, and callbacks."""

from __future__ import annotations

from collections.abc import Callable, Iterator, Mapping
from contextlib import contextmanager
from enum import StrEnum
from typing import TYPE_CHECKING, Literal
from uuid import uuid4

from . import _bridge
from ._context import pop_app, push_app
from .exceptions import LifecycleError, VisionPyRuntimeError
from .protocol import MAX_NODES_PER_SNAPSHOT, MAX_PATCHES_PER_BATCH, MAX_TREE_DEPTH

if TYPE_CHECKING:
    from .component import Component, Scalar
    from .state import Binding


class AppStatus(StrEnum):
    CREATED = "created"
    BUILDING = "building"
    READY = "ready"
    RUNNING = "running"
    STOPPING = "stopping"
    DISPOSED = "disposed"
    FAILED = "failed"


class App:
    def __init__(
        self,
        *,
        title: str = "VisionPy App",
        theme: Literal["system", "light", "dark"] = "system",
    ) -> None:
        if not isinstance(title, str) or len(title) > 200:
            raise ValueError("title must be a string of at most 200 characters")
        if theme not in {"system", "light", "dark"}:
            raise ValueError("theme must be system, light, or dark")
        self.id = f"app_{uuid4().hex}"
        self.title = title
        self.theme = theme
        self._status = AppStatus.CREATED
        self._root: Component | None = None
        self._next_node_id = 1
        self._next_handler_id = 1
        self._callbacks: dict[str, tuple[str, str, Callable[..., object]]] = {}
        self._bindings: set[Binding] = set()
        self._pending_patches: dict[str, dict[str, Scalar]] = {}
        self._event_depth = 0

    @property
    def status(self) -> str:
        return self._status.value

    @contextmanager
    def layout(self) -> Iterator[None]:
        if self._status is not AppStatus.CREATED:
            raise LifecycleError("layout() is only valid once from the created state")
        self._status = AppStatus.BUILDING
        token = push_app(self)
        try:
            yield
            if self._root is None:
                raise LifecycleError("layout must contain one root component")
            self._status = AppStatus.READY
        except Exception:
            self._status = AppStatus.FAILED
            raise
        finally:
            pop_app(token)

    def run(self) -> None:
        if self._status is not AppStatus.READY:
            raise LifecycleError("run() requires a completed layout and can only be called once")
        self._status = AppStatus.RUNNING
        _bridge.bind_app(self)
        if _bridge.is_installed():
            _bridge.send_snapshot(self.snapshot_payload())

    def request_stop(self) -> None:
        if self._status in {AppStatus.DISPOSED, AppStatus.STOPPING}:
            return
        if self._status not in {AppStatus.RUNNING, AppStatus.READY, AppStatus.FAILED}:
            raise LifecycleError(f"cannot stop app while {self.status}")
        self._status = AppStatus.STOPPING

    def dispose(self) -> None:
        if self._status is AppStatus.DISPOSED:
            return
        if self._root is not None:
            self._root.dispose()
        for binding in tuple(self._bindings):
            binding.dispose()
        self._bindings.clear()
        self._callbacks.clear()
        self._pending_patches.clear()
        self._status = AppStatus.DISPOSED

    def snapshot_payload(self) -> dict[str, object]:
        if self._root is None:
            raise LifecycleError("app has no component tree")
        return {"root": self._root.to_vnode(), "title": self.title}

    def dispatch_event(self, payload: Mapping[str, object]) -> None:
        if self._status is not AppStatus.RUNNING:
            raise VisionPyRuntimeError("app is not accepting events", code="DISPOSED")
        handler_id = payload.get("handlerId")
        node_id = payload.get("nodeId")
        event = payload.get("event")
        if (
            not isinstance(handler_id, str)
            or not isinstance(node_id, str)
            or not isinstance(event, str)
        ):
            raise VisionPyRuntimeError("malformed event payload", code="INVALID_MESSAGE")
        callback_record = self._callbacks.get(handler_id)
        if callback_record is None or callback_record[:2] != (node_id, event):
            raise VisionPyRuntimeError("unknown or mismatched callback", code="UNKNOWN_HANDLER")
        callback = callback_record[2]
        self._event_depth += 1
        try:
            callback()
        except Exception as error:
            self._report_callback_error(error)
        finally:
            self._event_depth -= 1
            if self._event_depth == 0:
                self._flush_patches()

    def _allocate_node_id(self) -> str:
        if self._next_node_id > MAX_NODES_PER_SNAPSHOT:
            raise LifecycleError("component count exceeds the protocol limit")
        node_id = str(self._next_node_id)
        self._next_node_id += 1
        return node_id

    def _attach(self, component: Component, parent: Component | None) -> None:
        if self._status is not AppStatus.BUILDING:
            raise LifecycleError("components can only be created while building layout")
        if component.depth > MAX_TREE_DEPTH:
            raise LifecycleError("component tree exceeds the protocol depth limit")
        if parent is None:
            if self._root is not None:
                raise LifecycleError("layout can contain only one root component")
            self._root = component
        else:
            parent.children.append(component)

    def _register_callback(self, component: Component, event: str, callback: object) -> str:
        if not callable(callback):
            raise TypeError("callback must be callable")
        handler_id = str(self._next_handler_id)
        self._next_handler_id += 1
        self._callbacks[handler_id] = (component.id, event, callback)
        return handler_id

    def _register_binding(self, binding: Binding) -> None:
        self._bindings.add(binding)

    def _queue_patch(self, node_id: str, props: dict[str, Scalar]) -> None:
        if self._status is not AppStatus.RUNNING:
            return
        current = self._pending_patches.setdefault(node_id, {})
        current.update(props)
        if len(self._pending_patches) > MAX_PATCHES_PER_BATCH:
            self._pending_patches.clear()
            raise VisionPyRuntimeError(
                "patch count exceeds the protocol limit", code="INVALID_MESSAGE"
            )
        if self._event_depth == 0:
            self._flush_patches()

    def _flush_patches(self) -> None:
        if not self._pending_patches:
            return
        changes: list[dict[str, object]] = []
        for node_id, props in self._pending_patches.items():
            changes.append({"id": node_id, "props": dict(props)})
        self._pending_patches.clear()
        if _bridge.is_installed():
            _bridge.send_patch_batch(changes)

    def _report_callback_error(self, error: Exception) -> None:
        if _bridge.is_installed():
            _bridge.send_error("CALLBACK_ERROR", str(error), "callback", fatal=False)
