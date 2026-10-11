# ADR-0007: VN public package identity

- Status: Blocked; no migration authorized by the evidence
- Date: 2026-10-11
- Verification timestamp: 2026-10-11 13:16 UTC

## M3.2 addendum: VNStack and VNPyKit (2026-10-11)

The owner subsequently identified `VNStack` as the preferred identity and
`VNPyKit` as its backup. A new direct verification pass was performed between
14:26 and 14:31 UTC. The detailed endpoint record is preserved in
`docs/m3.2-identity-clearance.md`.

`VNStack` is blocked for migration in the present state:

- exact PyPI JSON and Simple endpoints, the unscoped npm package, and each
  proposed scoped npm package returned 404;
- the exact GitHub account `github.com/vnstack` exists and is not controlled by
  this repository (HTTP 200; created 2014-10-08);
- the npm organization endpoint for `vnstack` returned HTTP 200 rather than
  "scope not found", so control of `@vnstack` has not been established;
- authoritative Verisign RDAP reports `vnstack.com` registered on 2026-07-12,
  expiring 2027-07-12, with Cloudflare nameservers. The domain had no resolvable
  web address during this audit, but registration still prevents treating the
  exact `.com` identity as available;
- no exact-name public GitHub repository or public Python import use was found in
  the reproducible searches, but GitHub code search required authentication and
  the public code-index fallback rate-limited the audit.

`VNPyKit` is technically cleaner but remains an unapproved fallback:

- exact PyPI, unscoped npm, proposed scoped npm package, GitHub account, exact
  repository-name search, and `.com`/`.io`/`.dev` RDAP probes returned no object;
- the npm organization endpoint returned "scope not found"; these negative
  responses do not reserve any name or prove that account creation/publication
  will be accepted;
- the established `vn.py`/VeighNa Python quantitative-trading framework uses the
  `vnpy` import and a large `vnpy/*` GitHub ecosystem. `VNPyKit` is not exact, but
  its first four characters and Python-package meaning create a material search
  and pronunciation confusion risk that the owner must explicitly accept or
  clear;
- official trademark search services were reachable, but their interactive
  searches did not yield a reproducible, authoritative clearance export in this
  unattended audit. No claim of trademark clearance is made.

### M3.2 decision

Keep the current `VisionPy` implementation unchanged. Do not create ADR-0008 and
do not migrate packages until the owner selects a candidate and the selected npm
scope and GitHub owner are demonstrably controlled. For `VNStack`, control or a
different organization/scope and repository owner is mandatory, together with a
decision about the registered `.com`. For `VNPyKit`, the owner must explicitly
accept or professionally clear the `vn.py` similarity and secure the required
accounts. The owner's stated preference is not the explicit identity approval
required by the M3.2 brief.

## Context

The requested preferred identity is VNForge. Migration is permitted only if its
technical registry availability is conclusive and no material ownership or
confusion risk remains. Registry absence does not grant trademark, account, scope,
organization, repository, or domain rights.

All seven candidate strings already satisfy PEP 503 normalization as written.
Official endpoint checks returned 404 for every exact name at both
`https://pypi.org/pypi/<name>/json` and `https://pypi.org/simple/<name>/`, and at
`https://registry.npmjs.org/<name>`. These results establish that no public project
was returned at that time. They do not show whether PyPI would accept an upload,
whether a name is reserved or prohibited, or whether an npm scope is controlled by
VisionNumbers.

Exact-owner GitHub probes at `https://api.github.com/repos/<name>/<name>` returned
404 for all candidates. GitHub search remains necessary because a repository can
use the exact name under another owner. Exact GitHub user probes were 404 for
VNForge, VNPyKit, and VNWarp; probes for VNStack, VNFrame, VNFlow, and VNCraft were
inconclusive after unauthenticated API limiting.

## Recommendation matrix

| Candidate | Exact PyPI/npm | Software and identity evidence | Trademark/domain evidence | Technical fit | Verdict |
| --- | --- | --- | --- | --- | --- |
| `vnforge` | 404 / 404 | Active `JastiTheCoder/VNForge` Python visual-novel compiler; exact name and overlapping game/tool scope | `vnforge.pro` is an active WordPress/software site; official trademark ownership was not conclusively determined | Strong name, severe confusion | **Blocked** |
| `vnpykit` | 404 / 404 | No obvious exact framework found in the searches performed | npm scope ownership, domains, and official trademark status inconclusive | Clear Python association, seven characters | Unverified fallback only |
| `vnstack` | 404 / 404 | Existing academic/software use of `VNStack`; broad infrastructure meaning | Ownership, domains, and official trademark status inconclusive | Suggests a platform more than graphics | Higher confusion risk |
| `vnframe` | 404 / 404 | Existing `vnframe` Python framework/library for VNGameEngine and game creation | Ownership, domains, and official trademark status inconclusive | Direct framework meaning but same field | Reject |
| `vnwarp` | 404 / 404 | No obvious exact framework found in the searches performed | npm scope ownership, domains, and official trademark status inconclusive | Short and extensible | Unverified fallback only |
| `vnflow` | 404 / 404 | Active NRC Canada VNFlow framework and published molecular-design work; additional company/tool uses | Ownership, domains, and official trademark status inconclusive | Good workflow meaning but occupied | Reject |
| `vncraft` | 404 / 404 | Existing VNCraft Minecraft mod and active visual-novel development identity | Ownership, domains, and official trademark status inconclusive | Game-friendly but crowded | Reject |

Search evidence includes `https://github.com/JastiTheCoder/VNForge`,
`https://vnforge.pro/`, `https://github.com/nrc-cnrc/VNFlow`, the published VNFlow
article at `https://pmc.ncbi.nlm.nih.gov/articles/PMC12553153/`, the VNCraft project
at `https://www.curseforge.com/minecraft/mc-mods/vncraft`, and the existing VNFrame
repository at `https://github.com/countd360/vnframe`.

Searches of USPTO TSDR, WIPO Global Brand Database, and EUIPO-indexed web results
did not yield a conclusive legal clearance result. This engineering audit does not
claim trademark clearance. Reliable domain availability was not established for
the alternatives; an active exact-name domain was established for VNForge.

## Decision

VNForge fails the migration gate because exact-name software already exists in a
closely related Python/game-development field and an exact-name software domain is
active. The PyPI/npm 404 results do not cure that material confusion risk.

Do not rename the Python distribution/import, CLI, npm packages, repository,
source, documentation, or generated artifacts. Do not select a fallback
automatically. ADR-0008 is therefore not created. The owner must choose whether to
seek professional clearance or approve a new candidate investigation.

`vncore` remains rejected as directed because of its existing software ecosystem.
