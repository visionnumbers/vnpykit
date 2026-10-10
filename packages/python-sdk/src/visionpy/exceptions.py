"""Stable Python-side error contracts."""

from __future__ import annotations

from collections.abc import Mapping


class VisionPyError(Exception):
    """Base exception with a stable machine-readable code."""

    default_code = "VISIONPY_ERROR"

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        details: Mapping[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code or self.default_code
        self.message = message
        self.details = dict(details or {})

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


class InvalidPropertyError(VisionPyError):
    default_code = "INVALID_PROPERTY"


class LifecycleError(VisionPyError):
    default_code = "LIFECYCLE_ERROR"


class ProtocolMismatchError(VisionPyError):
    default_code = "PROTOCOL_MISMATCH"


class VisionPyRuntimeError(VisionPyError):
    default_code = "RUNTIME_ERROR"


class UnsupportedFeatureError(VisionPyError):
    default_code = "UNSUPPORTED_FEATURE"
