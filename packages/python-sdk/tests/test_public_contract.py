from __future__ import annotations

import json
from importlib.metadata import version

import pytest

import vnpykit
from vnpykit.exceptions import ProtocolMismatchError
from vnpykit.protocol import make_envelope


def test_package_is_importable_and_versioned() -> None:
    assert vnpykit.__version__ == "0.1.0a1"
    assert version("vnpykit") == vnpykit.__version__
    assert vnpykit.PROTOCOL_MAJOR == 1


def test_error_contract_has_stable_code_and_safe_details() -> None:
    error = ProtocolMismatchError("renderer uses protocol 2", details={"received": 2})
    assert error.code == "PROTOCOL_MISMATCH"
    assert error.details == {"received": 2}
    assert str(error) == "PROTOCOL_MISMATCH: renderer uses protocol 2"


def test_make_envelope_is_json_serializable() -> None:
    message = make_envelope(
        app_id="app_1",
        generation="worker_1",
        seq=0,
        message_type="STOP_REQUEST",
        payload={},
    )
    assert json.loads(json.dumps(message)) == message


@pytest.mark.parametrize("app_id", ["", "space bad", "slash/bad", "x" * 65])
def test_make_envelope_rejects_invalid_app_id(app_id: str) -> None:
    with pytest.raises(ValueError, match="app_id"):
        make_envelope(
            app_id=app_id,
            generation="worker_1",
            seq=0,
            message_type="STOP_REQUEST",
            payload={},
        )


def test_make_envelope_rejects_boolean_sequence() -> None:
    with pytest.raises(ValueError, match="seq"):
        make_envelope(
            app_id="app_1",
            generation="worker_1",
            seq=True,
            message_type="STOP_REQUEST",
            payload={},
        )

