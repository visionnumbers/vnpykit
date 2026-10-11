# Public repository safety checklist

Run this checklist before making the repository public and again before every
release. A local checkpoint commit does not authorize publishing.

## Repository content

- [ ] Run `python scripts/scan-secrets.py` and an independent full-history scanner
  such as Gitleaks after a public remote exists.
- [ ] Inspect `git status --short --ignored` and `git ls-files`; confirm virtual
  environments, caches, `node_modules`, build output, Playwright output, and copied
  Pyodide assets are excluded.
- [ ] Search tracked text for personal absolute paths, private hosts, credentials,
  private email addresses, and internal issue or customer identifiers.
- [ ] Review every file larger than 1 MiB and every binary file.
- [ ] Confirm RFCs, accepted ADRs, contributor policies, and public documentation
  contain no confidential material.

## Legal and dependency review

- [ ] Resolve the outstanding VisionPy name, package-name, domain, and trademark
  checks recorded in ADR-0001 before public branding or publication.
- [ ] Confirm project copyright ownership and replace the placeholder Apache-2.0
  appendix text only if counsel or the owner requires an explicit notice.
- [ ] Review `THIRD_PARTY_NOTICES.md`, dependency licenses, lockfiles, and vendored
  artifact hashes; retain upstream license files and source links.
- [ ] Run `corepack pnpm audit --audit-level high` and the Python dependency audit
  chosen for the release process.

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
- [ ] Select and approve the public distribution/npm identity.
- [ ] Perform manual screen-reader and high-contrast audits on supported platforms.
- [ ] Configure private vulnerability reporting and release provenance before any
  public remote, package publication, or release.
