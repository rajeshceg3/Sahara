# Living creatures verification

The caravan, sandfish, fennec and oasis doves are rebuilt as anatomically
referenced procedural creatures: dromedaries with a displaced-sphere barrel and
hump, S-curved necks, lashed eyes, jointed pacing legs, woven blankets with
tassel hems and sagging lead ropes; a banded glossy sandfish that swims the
loose sand with a surface wake and arcs out to breathe; a sitting fennec with
pink-lined ears that swivel independently, scanning head and blinks; laughing
doves with speckled forenecks, two-segment feathered wings, flap-glide cycles,
banked turns and a resident pair feeding at the pool edge. Tapping a creature
now carries the viewer to a respectful watching distance and follows it.

A `?frame=<camel|fennec|sandfish|dove>` query places the camera at watching
distance of a subject for close inspection, and `&clean=1` hides the interface
chrome. Both exist for verification only and do not change the app otherwise.

Executed locally before PR (2026-11-11, real Chromium via Playwright/puppeteer,
SwiftShader WebGL): all four chapters at 390 and 1365 with entry views, real
pointer drag then Reset holding entry yaw/pitch, encounter open/return per
chapter, navigation swipe changing one chapter, keyboard chapter navigation,
dialog Escape, opt-in sound state, no horizontal overflow, 44px targets, 16px
floor, close-up subject frames for camel, fennec, sandfish and dove at 390,
reduced-motion emulation paused default with pixel-identical canvas over 700ms,
no page errors. Scene-gate assertions passed at 320 and 390 in normal motion;
1440 normal-motion and the reduced-motion matrix run in CI.

Two latent bugs found and fixed by this gate: the app's chapter scoping
included `body` in its `[data-chapter]` selection (so `body` received
`aria-current`), and the behavior suite's own selectors matched `body` for the
same reason.

Honest below-bar notes: coats are vertex-colour gradients over canvas fur
grain, not strand fur; at extreme close range geometry reads smooth-stylised
rather than photographic; dove primaries are individual geometry but do not
flex like real feathers. Subjective "alive" judgement rests on the captured
frames, not a claim of indistinguishability.
