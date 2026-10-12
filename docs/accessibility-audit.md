# Accessibility audit checklist

Automated M2/M3 coverage verifies semantic labels, native text/checkbox controls,
required and invalid state, status/alert roles, visible focus, focus preservation,
keyboard Tab order, Enter submission, and React/Vue mount cleanup in Chromium,
Firefox, and WebKit. M4 adds an Axe scan for WCAG 2.0/2.1 A and AA rules; its
actual result is recorded in the M4 acceptance report after execution.

M4 automated result (2026-10-11): PASS on Chromium 156.0.8078.4 with Axe 4.13.0;
zero critical or serious findings after correcting the demo scratch mount to use
a valid named `region`. This automated result does not complete the manual items.

GitHub's Linux Chromium run on 2026-10-12 exposed a platform-specific `GrayText`
value with only 3.94:1 contrast. Muted and status text now use a Canvas-relative
72% color mix with a `CanvasText` fallback; the focused Axe rerun passed locally.

The following manual release checks require platform assistive technology and are
not represented as completed automated tests:

- [ ] NVDA with current Firefox on Windows: labels, validation alert, status update,
  form submission, and logical reading order.
- [ ] VoiceOver with current Safari on macOS: the same form and status flow.
- [ ] Windows High Contrast: focus ring, validation state, text, checkbox, and
  button remain perceivable without relying only on color.
- [ ] Browser zoom at 200% and 400%: no clipped controls or lost information.
- [ ] Reduced-motion preference: no essential behavior depends on animation.
- [ ] Two embedded instances: screen-reader navigation does not merge ownership or
  announce updates from the wrong application.

Record browser, operating-system, assistive-technology versions, findings, and any
waivers before a public release. These pending manual checks block public release,
but do not invalidate the automated M3 implementation acceptance.
