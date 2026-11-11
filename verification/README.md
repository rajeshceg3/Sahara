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
1440 normal-motion (chapters split) and the full reduced-motion matrix at 320, 390 and 1440 also executed locally and passed.

Two latent bugs found and fixed by this gate: the app's chapter scoping
included `body` in its `[data-chapter]` selection (so `body` received
`aria-current`), and the behavior suite's own selectors matched `body` for the
same reason.

Honest below-bar notes: coats are vertex-colour gradients over canvas fur
grain, not strand fur; at extreme close range geometry reads smooth-stylised
rather than photographic; dove primaries are individual geometry but do not
flex like real feathers. Subjective "alive" judgement rests on the captured
frames, not a claim of indistinguishability.

## Round 2 (2026-11-11, PR #4, production 72084c2)

Dove wings rebuilt as shaped, overlapping feather geometries (coverts,
secondaries, seven primaries) - the stacked-plate look is gone; perched doves
gained folded wings, a lifted head on a real neck, and a fanned feather tail.
Fennec haunch tucked into a seated line, ears narrowed with a subtle warm
inner-ear glow (subsurface suggestion), sparse alpha-strand fur shell over
body and tail. Head/body tessellation raised for close-ups. Frame-mode
cameras moved to profile views; ?frame=dove watches the perched pool-edge bird.

Executed locally (real Chromium, SwiftShader): behavior suite WIDTH=390
QUICK=1 green; scene-gate full matrix Passed - 320, 390 and 1440 in both
no-preference and reduce (1440 and some reduce cells run split by chapter to
fit the runner). Production verified after deploy: sahara.js md5 matches
main, scene-gate BASE_URL 390 no-preference Passed, close-up frames captured
from the live site.

Honest below-bar notes: creatures remain stylised 3D - folded-wing feather
rows read faintly in dawn light, the fur shell is a halo of guard hairs not
strand fur, and no photographic indistinguishability is claimed.

## Round 2b (2026-11-11, camel anatomy + dove feather follow-up)

Camel: torso reshaped (deeper chest, stronger rear belly tuck, narrower hips,
rounded rump), thicker S-curved neck base rooted deeper in the chest, thighs
blended into the barrel, slimmer knee calluses; the full-torso blanket cover
became a draped saddle cloth with woven stripes, tassel hem and a muted
palette. Dove: feathers extruded to real thickness so rows cast edge shadows,
slimmer streamlined flyer body, folded primaries lie flat on perched birds,
brighter covert contrast.

Executed locally (real Chromium, SwiftShader): behavior suite WIDTH=390
QUICK=1 green; scene-gate full matrix Passed - 320, 390, 1440 in both
no-preference and reduce (1440 split by chapter). Frame captures iterated
visually against reference photos; camel frame shots spaced over the gait so
legs are verified on open sand, not in a dune dip.

Honest below-bar notes: still stylised 3D; the saddle cloth rim is a hard
edge at some angles, and dawn backlight flattens feather contrast.
