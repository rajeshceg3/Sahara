/* Sahara soundscape: dunes at first light, the white hour, the oasis, the cold night.
 * Wind shaped by terrain, saltation hiss, camel bells, palm rustle and doves at
 * the water, fennec yips and thin night air. All synthesis, no samples. */

import {
  windNoise, whistleWind, lapping, rustle, coos, bells, insects, peeps,
} from '../soundscape/soundscape-layers.js';

const S = 12, SEED = 3117;
const mk = (render, seconds = S) => ({ render, seconds });

export default {
  defaultScene: 'dawn',
  layers: {
    duneWind: mk((c) => windNoise(c, { color: 0.03, gustDepth: 0.45, base: 0.5, seed: SEED + 1 })),
    sandHiss: mk((c) => windNoise(c, { color: 0.6, gustDepth: 0.7, gustRate: 0.15, base: 0.35, seed: SEED + 2 })),
    crestWhistle: mk((c) => whistleWind(c, { fMin: 380, fMax: 980, q: 8, gain: 0.2, seed: SEED + 3 })),
    hardGusts: mk((c) => windNoise(c, { color: 0.05, gustDepth: 0.9, gustRate: 0.1, base: 0.75, seed: SEED + 4 })),
    camelBells: mk((c) => bells(c, { count: 7, f: 760, gain: 0.1, seed: SEED + 5, minGap: 1.1 })),
    oasisWater: mk((c) => lapping(c, { gain: 0.35, period: 2.6, depth: 0.55, seed: SEED + 6 })),
    palmRustle: mk((c) => rustle(c, { gain: 0.3, period: 1.3, depth: 0.8, seed: SEED + 7 })),
    doves: mk((c) => coos(c, { count: 5, f: 540, gain: 0.24, seed: SEED + 8 })),
    nightInsects: mk((c) => insects(c, { f: 3800, pulseHz: 11, gain: 0.03, seed: SEED + 9 })),
    fennecYips: mk((c) => peeps(c, { count: 4, f: 1350, gain: 0.1, seed: SEED + 10 })),
    coldAir: mk((c) => windNoise(c, { color: 0.02, gustDepth: 0.3, base: 0.3, seed: SEED + 11 })),
  },
  scenes: {
    dawn: [
      { layer: 'duneWind', gain: 0.65 }, { layer: 'sandHiss', gain: 0.4 },
      { layer: 'camelBells', gain: 0.7 }, { layer: 'crestWhistle', gain: 0.2 },
    ],
    whiteHour: [
      { layer: 'hardGusts', gain: 0.8 }, { layer: 'sandHiss', gain: 0.7 },
      { layer: 'crestWhistle', gain: 0.8 },
    ],
    oasis: [
      { layer: 'oasisWater', gain: 0.75 }, { layer: 'palmRustle', gain: 0.7 },
      { layer: 'doves', gain: 0.6 }, { layer: 'duneWind', gain: 0.2 },
    ],
    night: [
      { layer: 'coldAir', gain: 0.85 }, { layer: 'nightInsects', gain: 0.8 },
      { layer: 'fennecYips', gain: 0.6 }, { layer: 'sandHiss', gain: 0.1 },
    ],
  },
};
