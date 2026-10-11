# ADR-0003: M2 controlled forms and lifecycle decisions

- Status: Accepted for M2
- Date: 2026-10-11
- Scope: reactive forms, accessibility, bounded updates, and recreation

## Decision

Protocol v1 remains at numeric major `1`. M2 is an additive extension of widget
and event allowlists: `row`, `textInput`, and `checkbox` become renderable;
`submit` joins the canonical event kinds; and form widgets add bounded `required`,
`error`, and button `submit` properties. M1 snapshots remain valid because the new
properties are optional at the validator boundary. Envelopes, uppercase message
discriminators, sequencing, ownership, snapshot-only structure, and property-only
patches are unchanged.

Form controls are controlled components. A `State[str]` supplied as a TextInput
value and a `State[bool]` supplied as Checkbox checked state are updated from the
sanitized browser event, then reconciled through the normal property patch path.
Callbacks receive immutable DOM-free `InputEvent`, `ChangeEvent`, `ClickEvent`, or
`SubmitEvent` values. A Column with `on_submit` renders as a native `form`; a Button
with `submit=True` renders as its submit control. Browser constraint behavior is
retained, and application validation returns bounded plain text rendered through
`textContent`.

The renderer associates native labels with controls, retains controls across
property patches so focus and selection are normally preserved, provides visible
`:focus-visible` styling, exposes an instance-scoped host `focus(nodeId)` helper,
and uses live status/alert regions for startup and failures. It never accepts raw
HTML or arbitrary attributes.

Reactive invalidations use a per-app queue. More than 100 binding evaluations in
one synchronous cycle produces a recoverable `REACTIVITY_LOOP` error and clears
the queue. Browser events also use the existing v1 rate and pending budgets.

`VisionPyAppHandle.recreate()` disposes the current renderer, channel, Worker, and
PyProxy references before creating a new handle with a fresh generation. Each app
continues to own a separate Worker; M2 does not pool interpreters.

## Consequences

- Form state has one Python source of truth while browser typing remains responsive.
- Enter-key submission and label/keyboard behavior use native DOM semantics.
- Validation cannot inject markup, but advanced validation timing and server-side
  validation orchestration remain application concerns.
- The 100-step ceiling prevents synchronous runaway bindings; it is not a CPU,
  memory, or hostile-code sandbox.
- Structural list updates, arbitrary attributes, async callbacks, and Worker pooling
  remain outside protocol v1 and M2.
