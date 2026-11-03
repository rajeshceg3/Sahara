# Encounters

Meet the caravan, read the wind, watch the sandfish and greet the fennec.

## Sub-features

Invitation buttons; direct creature picking; encounter text; return to the crossing.

## How to get to it (user POV)

Tap the invitation beneath each scene, or tap the creature itself in the world. The invitation then offers a return.

## Driving it with Playwright

Preconditions: the correct Sahara page has loaded with WebGL working.

Run `npm run verify`. It clicks `#encounter` in every scene and captures the result, then clicks again to return. Direct picking uses real coordinate clicks on the canvas with motion paused: the caravan (first light), the sandfish (oasis) and the fennec (night) must open their encounters; decorative doves and shrubs are intentionally not selectable.

## Gotchas

The wind encounter has no creature to aim at; it must still change the text and offer return. Moving targets make raw coordinate clicks flaky: pause ambient motion with the normal control first. Direct picking at every camera angle is not claimed.
