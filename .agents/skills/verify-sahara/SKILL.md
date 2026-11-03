---
name: verify-sahara
description: Drive the Sahara web world with real browser actions, prove scene navigation, look-around, encounters and accessibility modes, and retain visual evidence. Use after UI, interaction, rendering or ecology-copy changes.
---
# Verify the Sahara

Generated following pstack's create-verification-skill workflow (skill kept in `.agents/skills/` per fleet convention). The app is a static web UI, with no account, data seed, database or API. Three.js is local. Browser interaction is the primary verification route.

## Launch

Run `npm ci`, then `npm run verify`. The script starts a private Python HTTP server on 127.0.0.1:4181, launches Chrome, waits for the loading status to disappear and the correct title, drives the app, closes Chrome and stops only the server it started. Chrome must be installed at `/usr/bin/google-chrome`, or pass CHROME_BIN. Python 3 is required. Use a different PORT and EVIDENCE_DIR for concurrent runs. Do not drive somebody else's server. To verify an existing preview, set SAHARA_URL to its exact deployment URL. The script then creates no server and must not stop the remote deployment.

## Doctor

The script requires the exact page title `Sahara - An imagined crossing` and waits for `#status` to detach. It records page errors and fails on any. If this fails, inspect HTTP responses and the browser console before driving further. A 200 response alone is not a usable desert. A WebGL fallback is a failure, not a passing reduced-feature mode.

## Drive

Run `npm run verify`. Read features/README.md first. The script uses real button clicks, pointer drags, keyboard events and browser reduced-motion emulation. It never sets internal scene state. Use WIDTH=390 or WIDTH=1365 to run one viewport at a time if a runner has a short timeout. QUICK=1 captures only the entry view of each scene; it is explicitly not the four-quadrant proof. Keep the normal run for a full pass.

For a cloud browser, open the actual observed preview URL and use the same named buttons. Capture phone and laptop states. Rotate each chapter through four quadrants by dragging the canvas. Inspect the screenshots, not just the assertions. Inspect the encounter after its invitation, including camera placement and text. Use hardware rendering for performance judgment; software Chrome proves behavior but is not a phone-speed benchmark.

## Evidence

Artifacts land in `artifacts/verification` (or EVIDENCE_DIR): per-scene quadrant screenshots at both widths, per-scene encounter screenshots, a reduced-motion capture, and proof.json with the action log. Exercise the real user path, not internal setters; capture the action and the resulting state. A skipped input path stays unverified even when another route works. Inspect screenshots directly and fix/retest visual errors.

## Cleanup

The script's finally block closes its browser and sends SIGTERM only to its own server child. Proof files survive. After a run, confirm proof.json and PNGs still exist. Never delete evidence as cleanup. If interrupted, confirm the child processes have stopped before another run. Remote preview and production deployments remain intact.

## Helpers

`npm run verify` runs scripts/verify.mjs. All helpers are JavaScript modules invoked with Node, not executable shell files. The script supports SAHARA_URL, PORT, EVIDENCE_DIR, WIDTH, QUICK and CHROME_BIN. `npm run check` checks source syntax. Use `/maintain-verification-skill` after feature changes to keep this map current.
