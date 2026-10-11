"""Stable Python-side error contracts."""

from __future__ import annotations

from collections.abc import Mapping


class VNPyKitError(Exception):
    """Base exception with a stable machine-readable code."""

    default_code = "VNPYKIT_ERROR"

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


class InvalidPropertyError(VNPyKitError):
    default_code = "INVALID_PROPERTY"


class LifecycleError(VNPyKitError):
    default_code = "LIFECYCLE_ERROR"


class ProtocolMismatchError(VNPyKitError):
    default_code = "PROTOCOL_MISMATCH"


class VNPyKitRuntimeError(VNPyKitError):
    default_code = "RUNTIME_ERROR"


class UnsupportedFeatureError(VNPyKitError):
    default_code = "UNSUPPORTED_FEATURE"
