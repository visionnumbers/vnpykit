"""VisionPy's pure-Python SDK contract package."""

from ._version import __version__
from .app import App, AppStatus
from .component import Component
from .exceptions import (
    InvalidPropertyError,
    LifecycleError,
    ProtocolMismatchError,
    UnsupportedFeatureError,
    VisionPyError,
    VisionPyRuntimeError,
)
from .protocol import PROTOCOL_MAJOR
from .state import State

__all__ = [
    "PROTOCOL_MAJOR",
    "App",
    "AppStatus",
    "Component",
    "InvalidPropertyError",
    "LifecycleError",
    "ProtocolMismatchError",
    "State",
    "UnsupportedFeatureError",
    "VisionPyError",
    "VisionPyRuntimeError",
    "__version__",
]
