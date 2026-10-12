# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| `0.1.0a1` public-alpha candidate | Yes, after publication |
| Earlier development snapshots | No |

VNPyKit is prerelease software. Security fixes may require an upgrade to the
latest alpha rather than a backport.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability and do not include
credentials, exploit data, or private user data in a public channel.

The intended reporting channel is GitHub Private Vulnerability Reporting on
`visionnumbers/vnpykit`. GitHub exposes that feature for public repositories, so
it cannot be enabled while this repository remains private. Enable it immediately
after the public-visibility transition and before announcing or publishing the
alpha. Until then, disclose only through a private channel explicitly provided by
the project owner. Include affected versions, impact, reproduction steps, and
suggested mitigations when available. Maintainers will acknowledge receipt and
coordinate disclosure timing through that private channel.

## Security boundary

VNPyKit validates bounded protocol messages, renders an allowlisted DOM surface,
and runs each application in a dedicated Web Worker. These controls protect host
integrity and responsiveness from ordinary application errors. A same-origin Web
Worker is not a hardened sandbox for adversarial Python. Applications that run
untrusted code must use a separately originated, sandboxed host with an explicit
capability and network policy.
