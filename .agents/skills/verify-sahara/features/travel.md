# Travel between hours

Travel from first light to the white hour, the oasis and the star river.

## Sub-features

Four tap controls; nav-only swipes; keyboard nav; selected-state honesty.

## How to get to it (user POV)

Use the four hour buttons below the scene. Swipe only on the navigation strip. Arrow keys on a focused chapter button move between chapters.

## Driving it with Playwright

Preconditions: the correct Sahara page has loaded with WebGL working.

Run `npm run verify`. It clicks `[data-chapter]` buttons and captures all scenes. Manually swipe across `nav`, then drag the canvas: only the first should change chapters. Press ArrowRight while a chapter button is focused and require selected chapter and title to change.

## Gotchas

The script verifies click navigation. Nav-only touch swipe remains a separately driven path. Chapters deliberately choose an entry view so each encounter starts near its subject.
