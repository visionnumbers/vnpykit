# ADR-0004: Package identity remains unresolved

- Status: Accepted for M3 development; publication decision deferred
- Date: 2026-10-11

## Context

The internal project name and Python import name are `VisionPy` and `visionpy`.
The PyPI distribution name `visionpy` cannot be used for publication: PyPI returns
an existing unrelated project (0.0.4, published in 2022). GitHub also has a public
account named `VisionPy`, created in 2025. Search results show established projects
with confusingly close names, including VisPy and vizpy.

Registry checks on 2026-10-11 returned:

| Candidate | PyPI project URL | npm package query | Assessment |
| --- | --- | --- | --- |
| `visionpy-framework` | 404 | 404 | Clear descriptive candidate; longer, low ambiguity |
| `visionpy-browser` | 404 | 404 | Explains the execution target; may sound like a browser product |
| `visionpy-web-framework` | 404 | 404 | Most explicit; longest command and distribution name |
| `pybrowser-ui` | 404 | 404 | Avoids the occupied root; weaker continuity with VisionPy |

The npm queries for `@visionpy/protocol` and `@visionpy/runtime-pyodide` also
returned 404. A missing scoped package does not prove ownership or availability of
the `@visionpy` organization. These checks are point-in-time registry observations,
not trademark clearance.

Evidence endpoints:

- <https://pypi.org/project/visionpy/>
- <https://registry.npmjs.org/@visionpy%2fprotocol>
- <https://registry.npmjs.org/@visionpy%2fruntime-pyodide>
- <https://pypi.org/pypi/visionpy-framework/json>
- <https://registry.npmjs.org/visionpy-framework>
- <https://pypi.org/pypi/visionpy-browser/json>
- <https://registry.npmjs.org/visionpy-browser>
- <https://pypi.org/pypi/visionpy-web-framework/json>
- <https://registry.npmjs.org/visionpy-web-framework>
- <https://pypi.org/pypi/pybrowser-ui/json>
- <https://registry.npmjs.org/pybrowser-ui>
- <https://api.github.com/users/visionpy>

## Decision

Keep the repository, Python import, current distribution metadata, and npm scope as
internal working names. All npm packages remain `private: true`. Do not publish the
occupied PyPI distribution or claim the npm scope. Select and legally review a
public identity before adding publication credentials or release workflows.

`visionpy-framework` is the leading technical candidate because it preserves the
import name while distinguishing the distribution. It is not approved for use yet.

## Consequences

M3 can produce and install local wheels and npm tarballs. Public release remains
blocked by identity selection, ownership checks, and trademark review. Renaming the
Python import is a separate compatibility decision and requires explicit approval.
