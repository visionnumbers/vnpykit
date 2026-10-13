# Public repository safety checklist

Run this checklist before making the repository public and again before every
release. A local checkpoint commit does not authorize publishing.

## Repository content

- [x] Run `python scripts/scan-secrets.py` and an independent full-history scanner.
  M4: repository scanner passed 144 files; Gitleaks 8.30.1 scanned all six local
  commits with no findings. The final exposure audit repeated both scans across
  149 tracked files and complete reachable history with no credential finding.
- [x] Run the repository scanner after the VNPyKit migration (144 files; passed).
- [x] Inspect `git status --short --ignored` and `git ls-files`; confirm virtual
  environments, caches, `node_modules`, build output, Playwright output, and copied
  Pyodide assets are excluded.
- [x] Search tracked text for personal absolute paths, private hosts, credentials,
  private email addresses, and internal issue or customer identifiers.
- [x] Review every file larger than 1 MiB and every binary file.
- [x] Confirm RFCs, accepted ADRs, contributor policies, and public documentation
  contain no confidential material.

## Legal and dependency review

- [x] Record the owner-approved VNPyKit engineering identity in ADR-0008.
- [x] Record the preliminary VNPyKit trademark evidence and the owner's explicit
  residual-risk acceptance for this alpha. No formal or worldwide clearance is
  claimed; qualified review remains recommended for later releases.
- [x] Owner confirmed the necessary ownership or licensing and distribution
  rights to release the original source under Apache-2.0, subject to preserving
  applicable third-party licenses and notices.
- [x] Review `THIRD_PARTY_NOTICES.md`, dependency licenses, lockfiles, and vendored
  artifact hashes; retain upstream license files and source links.
- [x] Run `corepack pnpm audit --audit-level high` and the Python dependency audit
  chosen for the release process.
- [x] M3.2 local audit: pnpm reported no known vulnerabilities; the clean Python
  environment had no broken requirements and the SDK declares zero runtime
  dependencies.

## Security and release operations

- [x] Configure a private vulnerability-reporting channel in `SECURITY.md` (for
  example, GitHub private vulnerability reporting) before the repository is public.
- [x] Enable GitHub secret scanning, push protection, Dependabot alerts, protected
  branches, required CI checks, and least-privilege workflow permissions.
- [x] Review workflow actions and tool versions, release provenance, and artifact
  checksums. Test from a clean clone.
- [x] Obtain explicit authorization before creating the remote, pushing,
  publishing packages, and creating the first public-alpha prerelease. Future
  releases still require separate authorization.

## M1 checkpoint audit (2026-10-10)

The working tree scan found no credentials, private URLs, personal absolute paths,
or CodeLab dependencies. Generated directories were ignored. The only source binary
was the 115,486-byte micropip wheel documented in `THIRD_PARTY_NOTICES.md`; its embedded
MPL-2.0 and vendored licenses were verified. Public release remains blocked on the
name/trademark review and creation of a private security contact, but these do not
block a local source checkpoint.

## M3 local artifact audit (2026-10-11)

- [x] Local wheel, sdist, npm tarballs, manifests, and SHA-256 checksums build.
- [x] External consumer installs local CLI/embed tarballs without workspace aliases.
- [x] npm reported zero known vulnerabilities in the 43-package consumer graph.
- [x] Generated production output uses a separate same-origin Worker and restrictive
  CSP; no floating runtime dependency or CDN URL is emitted.
- [x] Registry identity conflicts and candidate names are recorded in ADR-0004.
- [x] Obtain explicit owner selection of VNPyKit and complete the local package,
  import, CLI, npm, runtime, fixture, and documentation migration.
- [x] Demonstrate control of the `@vnpykit` npm scope and the
  `visionnumbers/vnpykit` GitHub target before publication or push.
- [ ] Complete a qualified word-mark search in intended territories and relevant
  software/service classes. Registry and RDAP 404 responses are not trademark
  clearance or reservations.
- [x] Record owner-reported Windows accessibility checks and the explicit
  VoiceOver/Safari waiver for this alpha. Preserve VoiceOver/Safari as **NOT RUN**.
- [x] Configure private vulnerability reporting and release provenance before any
  public remote, package publication, or release.

## M4 public-alpha candidate audit (2026-10-11)

- [x] Verify Python `0.1.0a1`, npm `0.1.0-alpha.1`, and tag `v0.1.0a1`
  consistency in source metadata.
- [x] Build the wheel, sdist, and five public npm tarballs twice with a fixed
  epoch; all seven pairs are byte-identical and checksums are recorded.
- [x] Confirm the CLI tarball embeds the exact final wheel and all npm internal
  dependencies use exact published versions without `workspace:` ranges.
- [x] Pass Ruff, strict mypy, 25 pytest tests, ESLint, workspace typechecks/builds,
  26 Vitest tests, Twine, wheel-content checks, and clean Python/npm installs.
- [x] Pass Axe with no critical/serious findings, the 12/12 external matrix, and
  the final 100-cycle Chromium stress gate.
- [x] Demonstrate owner-confirmed PyPI publisher and npm organization control.
  Exact endpoint 404s are evidence of no
  visible project at the check time, not evidence of ownership or reservation.
- [x] Create and secure `visionnumbers/vnpykit`, configure protected release
  environments and OIDC publishers, and enable private vulnerability reporting.
- [x] Record the alpha-specific owner trademark-risk acceptance and
  VoiceOver/Safari waiver without claiming clearance or a test pass. Explicit
  package-publication and GitHub-release authorization remains required.

## M4.1 registry and release-infrastructure audit (2026-10-12)

- [x] Verify the M4.1 parent on local and remote `main` at
  `496c98817fa83842dda44961b01166a3ce6f9ea7` and preserve ancestry with a
  normal private-repository push.
- [x] Verify GitHub account `visionnumbers`, repository ADMIN access, npm user
  `visionnumbers`, npm `vnpykit` organization owner role, and npm
  `auth-and-writes` 2FA.
- [x] Confirm all five npm package endpoints and both exact PyPI project
  endpoints return 404. Treat this only as absence at check time.
- [x] Pin every GitHub Action to an immutable reviewed SHA, use Ubuntu 24.04,
  isolate OIDC/write permissions, require an exact typed publication phrase,
  and validate workflows with actionlint 1.7.12.
- [x] Rebuild the wheel, sdist, and five npm tarballs twice; pass archive,
  metadata, embedded-wheel, checksum, clean-install, and reproducibility gates.
- [x] Pass Ruff, strict mypy, 25 pytest tests, ESLint, all workspace typechecks
  and builds, 26 Vitest tests, all dependency audits, the independent consumer,
  the 12/12 external matrix, and the 100-cycle stress gate.
- [x] Scan the current repository and all 12 Git commits with Gitleaks 8.30.1;
  no leak was found. No tracked file exceeds 1 MiB and generated outputs remain
  ignored.
- [x] After confirming Actions billing safety, run the hardened non-publishing
  workflow and compare downloaded artifact hashes.
- [x] Confirm the owner-reported PyPI Pending Trusted Publisher is bound to exact
  environment `public-alpha-pypi`.
- [x] Complete the authorized npm first publication in dependency order.
- [ ] Configure one Trusted Publisher per existing npm package for a future
  release and validate the connection within npm's allowed window.
- [x] Resolve the former private-repository limits by making the repository public
  and enabling rulesets, scanning, CodeQL, and private vulnerability intake.
  Release environments still have no required reviewers.
- [x] Record owner acceptance of the alpha accessibility and trademark residual
  risks. Publication and GitHub-release authorization remain separate.

## M4.2 final public-alpha gate (2026-10-12)

- [x] Verify local and remote `main` at
  `395d35cba1635b642a450af859660744fc5ded49` and confirm no remote tag exists.
- [x] Verify zero Dependabot alerts, immutable action pins, read-only workflow
  defaults, and conditional OIDC/write permissions.
- [x] Confirm that a blank PyPI environment is technically compatible because
  the environment constraint is optional.
- [x] Complete non-publishing release run
  [`38249050044`](https://github.com/visionnumbers/vnpykit/actions/runs/38249050044),
  verify all seven manifest hashes and archives, and confirm every publishing
  and GitHub-release job was skipped.
- [x] Review and merge Dependabot PR #3 for `actions/upload-artifact` v7.0.2 at
  immutable SHA `cf430e030ddbb5b0abf93d22962f4752f3646cd9`.
- [x] Repeat the non-publishing artifact verification after the upload-artifact
  update. Run
  [`38263612430`](https://github.com/visionnumbers/vnpykit/actions/runs/38263612430)
  passed at source `9012e379844cba764a96e2e0680ea11283989ce5`; all seven Linux
  hashes matched the accepted manifest and every publishing/release job was
  skipped.
- [x] After making the repository public, enable branch protection/rulesets,
  private vulnerability reporting, secret scanning/push protection, and the
  three exact-tag release environments. No required environment reviewers are
  currently configured.
- [x] Bind the PyPI publisher to `public-alpha-pypi` only after that protected
  environment exists; recheck owner, repository, workflow, project, and
  environment immediately before publication.
- [x] Preserve the owner-reported Windows accessibility result and record the
  explicit alpha waiver. VoiceOver/Safari remains **NOT RUN**, not PASS.
- [x] Retain the owner's no-exact-match search as evidence only; record searched
  registries, territories, classes, marks, dates, and qualified legal review or
  an explicit risk acceptance. Do not claim trademark clearance.
- [x] Complete the separately authorized public visibility and signed tag steps.
- [x] Obtain separate authorization for interactive npm publication, PyPI
  publication, and GitHub prerelease creation; complete the authorized release.

## Final public-exposure audit (2026-10-12)

- [x] Scan all 149 tracked files and complete reachable history for credentials,
  private paths, sensitive configuration, and unintended binaries; repository
  scanner and Gitleaks 8.30.1 passed with no credential finding.
- [x] Record the owner's explicit acceptance that the two historical Git author
  email addresses will become public. Preserve the existing history and author
  metadata; do not rewrite or force-push.
- [x] Verify the GitHub account ID and username for future commits. Configure the
  repository-local Git identity to use the ID-based GitHub noreply address.
- [x] Preserve VoiceOver/Safari as **NOT RUN** and record the owner-approved alpha
  release waiver dated 2026-10-13.
- [x] Preserve the owner's trademark searches as preliminary evidence only; no
  certified legal-clearance claim is made.
- [x] After separately authorized public visibility, immediately enable the
  `main` ruleset, exact required CI checks, private vulnerability reporting,
  secret scanning/push protection, CodeQL, and protected release environments.

## Final alpha sign-off (2026-10-13)

- [x] Verify signed tag `v0.1.0a1` remains at
  `35b14d68a0bd70e1f1f8773e793545dc5feeabe9`.
- [x] Verify tag-ref dry run
  [`38280346291`](https://github.com/visionnumbers/vnpykit/actions/runs/38280346291)
  and all seven artifact hashes.
- [x] Record supplied EUIPO screenshot results separately from owner-reported
  USPTO and India searches; retain preliminary-evidence limitations.
- [x] Record owner acceptance of residual trademark/brand-confusion risk without
  claiming formal legal clearance.
- [x] Record the VoiceOver/Safari waiver while preserving **NOT RUN**.
- [x] Independently verify live Private Vulnerability Reporting, secret scanning,
  push protection, full-SHA enforcement, CodeQL, Dependabot, and branch/tag
  rulesets.
- [x] Merge the post-tag documentation PR. Its contents do not automatically
  appear in the immutable tag.
- [x] Add the post-tag trademark/accessibility disclosure to the GitHub
  prerelease description before announcement.
- [x] Obtain explicit authorization for interactive npm publication, the PyPI
  workflow, and GitHub prerelease creation.

## Post-release consumer verification (2026-10-13)

- [x] Install `vnpykit==0.1.0a1` from public PyPI into a fresh Python 3.12
  virtual environment; verify metadata, import, version, and documented APIs.
- [x] Install all five `@vnpykit/*@0.1.0-alpha.1` packages from public npm with
  Node.js 24; verify exact dependencies, ESM exports, TypeScript declarations,
  and zero npm audit findings.
- [x] Use the published CLI to create and build a starter application.
- [x] Start the generated application and pass a Playwright Chromium smoke test
  covering Worker/Pyodide startup, DOM rendering, reactive form interaction, and
  form submission with zero console errors or failed requests.
- [x] Download the wheel, sdist, and five npm archives from their public
  registries; verify registry integrity metadata and exact agreement with the
  GitHub prerelease `SHA256SUMS`.
- [x] Keep npm dist-tags unchanged by owner decision: `alpha` and `latest` both
  resolve to experimental version `0.1.0-alpha.1`; no stable release exists.
- [x] Preserve VoiceOver/Safari as **NOT RUN** and preserve the preliminary
  trademark evidence and residual-risk acceptance without claiming clearance.
