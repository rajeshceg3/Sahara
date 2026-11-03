# Motion and sound

Pause the desert's motion, honor reduced-motion settings, and keep sound strictly opt-in.

## Sub-features

Pause/resume control; reduced-motion begins paused; opt-in synthesized wind; honest pressed states.

## How to get to it (user POV)

Use the pause control in the header. A browser requesting reduced motion starts paused with direct, non-inertial look-around. The sound control starts local wind audio only after a tap.

## Driving it with Playwright

Preconditions: the correct Sahara page has loaded with WebGL working.

Run `npm run verify`. It asserts the pause pressed-state, emulates `prefers-reduced-motion: reduce` and requires a pixel-identical canvas over 700ms, and toggles sound while checking `aria-pressed`. Audible output itself is not aurally measured.

## Gotchas

Reduced-motion verification is emulation, not a physical device. Encounter text pauses ambient creature motion by design; resume by returning to the crossing.
