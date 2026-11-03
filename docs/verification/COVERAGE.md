# Verification coverage, final build

Final deployed build: commit 919883a at https://sahara-chi.vercel.app/ (deploy confirmed by content check of the served sahara.js), 2026-11-03, ~22:52-22:57 IST.

## Runs on the final build (all green, against the production URL)

- `WIDTH=390 QUICK=1` - doctor (exact title, boot, zero page errors), entry view of each of the 4 chapters, all 4 encounter flows, nav swipe, keyboard look, notes dialog, opt-in sound, reduced-motion pixel-identity over 700ms. Proof: proof-production-390-quick.json.
- `WIDTH=1365 QUICK=1` - the same set at laptop width. Proof: proof-production-1365-quick.json.
- `WIDTH=390 QUICK=1` local - same set on the same source via the isolated local server. Proof: proof-local-390-quick.json.

QUICK=1 captures the entry view of each chapter; per the skill docs it is explicitly not the four-quadrant proof.

## What was not re-run on the final build

- Full four-quadrant (q0-q3) sweeps. The last full sweep ran locally at 390px on the immediately prior source, which differs only in the oasis-bowl terrain flattening, the oasis camera raise, and caravan placement - camera and terrain shape changes, no interaction, DOM or state-machine changes, so interaction coverage carries over. A full 1365px sweep has not completed on the shadow-mapped build (software-GL render cost vs the runner's 120s window).
- Encounter camera-aim screenshots were re-captured on the final build during both QUICK production runs.

## Known limits (also delivered to the user)

Stylized real-time interpretation, not photorealism; night scene below ambition (fleet backlog); palm crowns slightly sparse at phone size; no physical-device performance benchmark - SwiftShader proves behavior, not phone speed.

## Reproduce

`npm ci && npm run verify` locally; `SAHARA_URL=<deployment> WIDTH=390|1365 [QUICK=1] npm run verify` for a deployed URL. See `.agents/skills/verify-sahara/SKILL.md` and `features/` for the feature map.
