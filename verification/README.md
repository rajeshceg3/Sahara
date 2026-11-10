# Subject-view refinement verification

This is an imagined dune sea, not a map or travel guide. Existing procedural palms, caravan, sandfish, fennec and dunes are preserved. Entry cameras now place caravan/pool/fennec above the bounded story panel. Reset clears active drag and returns to the chapter angle and position. Night sand and ambient light now shift to moonlit blue. The previous full lower-half veil is removed. Fonts and OFL licenses are local.

Executed locally before PR: all four chapters at 390 and 1440 in reduced and normal motion; 320 reduced motion. Real pointer drag then Reset, held entry yaw/pitch, opt-in sound off, 44px targets, 16px detail/navigation floor, no horizontal overflow, encounter/return, navigation swipe changing one chapter, keyboard chapter navigation, dialog Escape and no page errors. Desktop runs are split into two chapters to fit capture runtime. CI runs every chapter at all three widths in both motions.

Pixel contrast: 104 glyph/backdrop samples across all scenes at 390 and 1440, minimum 9.129:1 at solid glyph cores, against the actual underlying pixels. Additional Reset-hover state samples checked separately. Transient orientation animation and arbitrary camera angles excluded.

Ten seconds of actual app audio output captured by teeing its AudioDestination connection, mean -31.1 dB, peak -18.4 dB, no clipping. Subjective listening remains unverified and is tracked separately; do not claim it is audio-quality complete.
