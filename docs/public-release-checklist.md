# Public repository safety checklist

Run this checklist before making the repository public and again before every
release. A local checkpoint commit does not authorize publishing.

## Repository content

- [x] Run `python scripts/scan-secrets.py` and an independent full-history scanner.
  M4: repository scanner passed 144 files; Gitleaks 8.30.1 scanned all six local
  commits with no findings. Repeat after the remote and release commit exist.
- [x] Run the repository scanner after the VNPyKit migration (144 files; passed).
- [ ] Inspect `git status --short --ignored` and `git ls-files`; confirm virtual
  environments, caches, `node_modules`, build output, Playwright output, and copied
  Pyodide assets are excluded.
- [ ] Search tracked text for personal absolute paths, private hosts, credentials,
  private email addresses, and internal issue or customer identifiers.
- [ ] Review every file larger than 1 MiB and every binary file.
- [ ] Confirm RFCs, accepted ADRs, contributor policies, and public documentation
  contain no confidential material.

## Legal and dependency review

- [x] Record the owner-approved VNPyKit engineering identity in ADR-0008.
- [ ] Complete VNPyKit domain and trademark clearance before public publication.
- [ ] Confirm project copyright ownership and replace the placeholder Apache-2.0
  appendix text only if counsel or the owner requires an explicit notice.
- [ ] Review `THIRD_PARTY_NOTICES.md`, dependency licenses, lockfiles, and vendored
  artifact hashes; retain upstream license files and source links.
- [x] Run `corepack pnpm audit --audit-level high` and the Python dependency audit
  chosen for the release process.
- [x] M3.2 local audit: pnpm reported no known vulnerabilities; the clean Python
  environment had no broken requirements and the SDK declares zero runtime
  dependencies.

## Security and release operations

- [ ] Configure a private vulnerability-reporting channel in `SECURITY.md` (for
  example, GitHub private vulnerability reporting) before the repository is public.
- [ ] Enable GitHub secret scanning, push protection, Dependabot alerts, protected
  branches, required CI checks, and least-privilege workflow permissions.
- [ ] Review workflow actions and tool versions, release provenance, and artifact
  checksums. Test from a clean clone.
- [ ] Obtain explicit authorization before creating a remote, pushing, publishing
  packages, or creating a release.

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
- [ ] Demonstrate control of the `@vnpykit` npm scope and the
  `visionnumbers/vnpykit` GitHub target before publication or push.
- [ ] Complete a qualified word-mark search in intended territories and relevant
  software/service classes. Registry and RDAP 404 responses are not trademark
  clearance or reservations.
- [ ] Perform manual screen-reader and high-contrast audits on supported platforms.
- [ ] Configure private vulnerability reporting and release provenance before any
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
- [ ] Demonstrate PyPI and npm ownership. Exact endpoint 404s are evidence of no
  visible project at the check time, not evidence of ownership or reservation.
- [ ] Create and secure `visionnumbers/vnpykit`, configure protected release
  environments and OIDC publishers, and enable private vulnerability reporting.
- [ ] Complete qualified trademark/legal review and every manual accessibility
  item, then obtain explicit authorization for tag/push/publication/release.

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
- [ ] When Actions billing safety is confirmed, run the hardened build-only
  workflow and compare downloaded artifact hashes.
- [ ] Confirm or create the PyPI pending Trusted Publisher. Leave its environment
  blank until `public-alpha-pypi` is actually configured.
- [ ] Complete the authorized npm first publication in dependency order, then
  configure one Trusted Publisher per existing package within the validation
  window.
- [ ] Resolve the private-repository plan limits for branch/environment reviewer
  protection and private vulnerability intake.
- [ ] Complete the manual accessibility and qualified legal/confusion checks and
  obtain explicit tag/publish/release authorization.
