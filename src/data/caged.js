/**
 * CAGED major-scale style boxes: E-form pattern shifted along the neck.
 * Anchor: tonic's lowest fret on string 6 (within 0..maxFret). Each shape adds a
 * fret offset so five overlapping regions appear (pedagogical approximation).
 */

export const E_FORM_DELTAS = {
  6: [0, 2, 4],
  5: [0, 2, 4],
  4: [1, 2, 4],
  3: [1, 3, 4],
  2: [2, 4],
  1: [0, 2, 4],
};

/** Fret offset from the E-form anchor for each chord shape name */
export const CAGED_SHAPES = [
  { id: 'E', label: 'E shape', fretSlide: 0 },
  { id: 'D', label: 'D shape', fretSlide: 2 },
  { id: 'C', label: 'C shape', fretSlide: 4 },
  { id: 'A', label: 'A shape', fretSlide: 5 },
  { id: 'G', label: 'G shape', fretSlide: 7 },
];

export function getCagedDeltasForShape(shapeId) {
  const meta = CAGED_SHAPES.find((s) => s.id === shapeId) || CAGED_SHAPES[0];
  const sl = meta.fretSlide;
  const out = {};
  Object.keys(E_FORM_DELTAS).forEach((k) => {
    const s = Number(k);
    out[s] = E_FORM_DELTAS[s].map((d) => d + sl);
  });
  return out;
}
