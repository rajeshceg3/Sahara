# Desert notes

An honest note about what this world is, plus its sources.

## Sub-features

Modal dialog; Escape and backdrop close; source links; narrow-screen layout.

## How to get to it (user POV)

Open the info control in the header. Read. Close with the button, Escape or the backdrop.

## Driving it with Playwright

Preconditions: the correct Sahara page has loaded with WebGL working.

Run `npm run verify`. It opens `About this desert`, requires the dialog, then requires Escape to close it. Inspect the capture: text must stay readable at 390px and the three sources must be real links.

## Gotchas

The dialog is the only place instructions live; scene text stays invitation-based. Sources are factual references, not endorsements of the artwork's geography.
