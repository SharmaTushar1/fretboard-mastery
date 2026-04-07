import { E_FORM_DELTAS } from './caged';

/**
 * Heptatonic (3NPS / CAGED-style): same E-form footprint, slid along the neck.
 * Mode index 0–6 maps to position 1–7.
 */
export const HEPTATONIC_POSITION_SLIDES = [0, 2, 4, 5, 7, 9, 11];

export function getHeptatonicBoxDeltas(positionIndex) {
  const slide = HEPTATONIC_POSITION_SLIDES[positionIndex] ?? 0;
  const out = {};
  Object.keys(E_FORM_DELTAS).forEach((k) => {
    const s = Number(k);
    out[s] = E_FORM_DELTAS[s].map((d) => d + slide);
  });
  return out;
}

/** Minor pentatonic box 1 (root on string 6 at anchor fret r). */
const MINOR_PENT_BOX_1 = {
  6: [0, 3],
  5: [2, 5],
  4: [2, 5],
  3: [2, 4],
  2: [3, 5],
  1: [0, 3],
};

/** Major pentatonic box 1 (root on string 6 at anchor fret r). */
const MAJOR_PENT_BOX_1 = {
  6: [0, 2],
  5: [0, 2],
  4: [1, 4],
  3: [1, 3],
  2: [2, 4],
  1: [0, 2],
};

function slideBoxTemplate(template, fretSlide) {
  const out = {};
  [6, 5, 4, 3, 2, 1].forEach((s) => {
    out[s] = (template[s] || []).map((d) => d + fretSlide);
  });
  return out;
}

/** @param {number} boxNum 1–5 */
export function getMinorPentatonicBoxDeltas(boxNum) {
  const i = Math.min(Math.max(boxNum, 1), 5) - 1;
  return slideBoxTemplate(MINOR_PENT_BOX_1, i * 2);
}

/** @param {number} boxNum 1–5 */
export function getMajorPentatonicBoxDeltas(boxNum) {
  const i = Math.min(Math.max(boxNum, 1), 5) - 1;
  return slideBoxTemplate(MAJOR_PENT_BOX_1, i * 2);
}
