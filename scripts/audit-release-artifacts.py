"""Fail when release archives contain unsafe paths or stale/private metadata."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".map",
    ".md",
    ".py",
    ".pyi",
    ".toml",
    ".txt",
}
# Require a directory segment after a Windows drive root. This avoids treating a
# JavaScript string such as ``"None:\\n"`` as a local path.
ABSOLUTE_PATH = re.compile(rb"(?:[A-Za-z]:[\\/][A-Za-z0-9_. -]{1,64}[\\/]|/(?:Users|home)/)")
STALE_IDENTITIES = (b"visionpy", b"codelab")
EXPECTED_NPM = {
    "@vnpykit/protocol",
    "@vnpykit/renderer",
    "@vnpykit/runtime-pyodide",
    "@vnpykit/embed",
    "@vnpykit/cli",
}


def safe_member(name: str) -> None:
    path = PurePosixPath(name.replace("\\", "/"))
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"unsafe archive member: {name}")


def audit_text(label: str, data: bytes) -> None:
    lowered = data.lower()
    if b"workspace:" in lowered:
        raise ValueError(f"workspace dependency leaked into {label}")
    match = ABSOLUTE_PATH.search(data)
    if match:
        context = data[max(0, match.start() - 40) : match.end() + 40]
        raise ValueError(f"absolute local path leaked into {label}: {context!r}")
    for identity in STALE_IDENTITIES:
        if identity in lowered:
            raise ValueError(f"stale identity {identity.decode()} leaked into {label}")


def audit_zip_bytes(label: str, data: bytes) -> None:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for member in archive.infolist():
            safe_member(member.filename)
            if member.is_dir():
                continue
            payload = archive.read(member)
            if Path(member.filename).suffix.lower() in TEXT_SUFFIXES:
                audit_text(f"{label}:{member.filename}", payload)


def audit_wheel(path: Path) -> None:
    audit_zip_bytes(path.name, path.read_bytes())


def audit_tgz(path: Path, expected_version: str) -> tuple[str, list[tuple[str, str]]]:
    package_name = ""
    embedded_wheels: list[tuple[str, str]] = []
    with tarfile.open(path, "r:gz") as archive:
        for member in archive.getmembers():
            safe_member(member.name)
            if not member.isfile():
                continue
            extracted = archive.extractfile(member)
            if extracted is None:
                continue
            payload = extracted.read()
            suffix = Path(member.name).suffix.lower()
            if suffix in TEXT_SUFFIXES:
                audit_text(f"{path.name}:{member.name}", payload)
            if member.name == "package/package.json":
                manifest = json.loads(payload)
                package_name = manifest.get("name", "")
                if manifest.get("version") != expected_version:
                    raise ValueError(f"version mismatch in {path.name}")
                if manifest.get("private") is True:
                    raise ValueError(f"private package in {path.name}")
                if manifest.get("publishConfig", {}).get("access") != "public":
                    raise ValueError(f"non-public access in {path.name}")
                for group in ("dependencies", "peerDependencies", "optionalDependencies"):
                    for dependency, version in manifest.get(group, {}).items():
                        if dependency.startswith("@vnpykit/") and version != expected_version:
                            raise ValueError(
                                f"non-exact internal dependency {dependency}@{version} in {path.name}"
                            )
            if member.name.endswith(".whl"):
                audit_zip_bytes(f"{path.name}:{member.name}", payload)
                embedded_wheels.append(
                    (PurePosixPath(member.name).name, hashlib.sha256(payload).hexdigest())
                )
    if not package_name:
        raise ValueError(f"package manifest missing from {path.name}")
    return package_name, embedded_wheels


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact_root", type=Path)
    parser.add_argument("--npm-version", default="0.1.0-alpha.1")
    parser.add_argument("--expected-copies", type=int, default=1)
    args = parser.parse_args()
    wheels = sorted(args.artifact_root.rglob("*.whl"))
    tarballs = sorted(args.artifact_root.rglob("*.tgz"))
    expected_tarballs = 5 * args.expected_copies
    if len(wheels) != args.expected_copies or len(tarballs) != expected_tarballs:
        raise SystemExit(
            f"expected {args.expected_copies} wheel(s) and {expected_tarballs} npm archives, "
            f"got {len(wheels)} and {len(tarballs)}"
        )
    for wheel in wheels:
        audit_wheel(wheel)
    standalone_wheels = {
        wheel.name: hashlib.sha256(wheel.read_bytes()).hexdigest() for wheel in wheels
    }
    results = [audit_tgz(path, args.npm_version) for path in tarballs]
    found = {package_name for package_name, _ in results}
    if found != EXPECTED_NPM:
        raise SystemExit(f"npm package set mismatch: {sorted(found)}")
    embedded = [item for _, embedded_wheels in results for item in embedded_wheels]
    if len(embedded) != args.expected_copies:
        raise SystemExit(
            f"expected {args.expected_copies} embedded CLI wheel(s), got {len(embedded)}"
        )
    for name, digest in embedded:
        if standalone_wheels.get(name) != digest:
            raise SystemExit(f"embedded CLI wheel does not match standalone artifact: {name}")
    print(f"Audited {len(wheels)} wheel(s) and {len(tarballs)} npm archive(s): safe paths and metadata")


if __name__ == "__main__":
    main()
