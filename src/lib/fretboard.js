/** Standard chromatic spellings (sharps) for open-string computation */
export const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** String number 6 = low E, 1 = high E */
export const STRING_TUNING_OPEN = {
  6: 'E',
  5: 'A',
  4: 'D',
  3: 'G',
  2: 'B',
  1: 'E',
};

const NOTE_TO_PC = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

export function noteNameToPitchClass(name) {
  if (name == null || name === '') return null;
  const n = NOTE_TO_PC[name];
  return n === undefined ? null : n;
}

export function pitchClassToSharpName(pc) {
  return CHROMATIC_SHARP[((pc % 12) + 12) % 12];
}

/**
 * Note name at (stringNum, fret) in standard tuning, using sharp names.
 */
export function getNoteAtFret(stringNum, fret) {
  const openName = STRING_TUNING_OPEN[stringNum];
  const openPc = noteNameToPitchClass(openName);
  if (openPc === null) return 'C';
  const pc = (openPc + fret) % 12;
  return pitchClassToSharpName(pc);
}

/**
 * Lowest fret 0..maxFret on string 6 where pitch class matches tonic (for CAGED anchor).
 */
export function rootFretOnString6(tonicName, maxFret = 15) {
  const target = noteNameToPitchClass(tonicName);
  if (target === null) return 0;
  const openPc = noteNameToPitchClass(STRING_TUNING_OPEN[6]);
  for (let f = 0; f <= maxFret; f += 1) {
    if ((openPc + f) % 12 === target) return f;
  }
  return 0;
}

/**
 * Build set of pitch classes (0-11) from intervals (semitones from tonic).
 */
export function pitchClassesFromIntervals(intervals) {
  const set = new Set();
  intervals.forEach((i) => set.add(((i % 12) + 12) % 12));
  return set;
}

/**
 * @returns {Map<string, Set<string>>} key "s-f" -> Set of roles e.g. 'scale'|'root'|'caged'
 */
/** Octave for standard tuning (approximate, matches common charts). */
export function getGuitarOctaveForCell(stringNum, fret) {
  const base = { 6: 2, 5: 2, 4: 3, 3: 3, 2: 3, 1: 4 };
  const o = base[stringNum];
  if (o === undefined) return 4;
  return o + Math.floor(fret / 12);
}

export function computeCellFlags({
  tonicName,
  intervals,
  maxFret,
  cagedShapeDeltas,
  rootFretAnchor,
}) {
  const tonicPc = noteNameToPitchClass(tonicName);
  const scalePcs = pitchClassesFromIntervals(intervals);
  const cells = new Map();

  const strings = [6, 5, 4, 3, 2, 1];
  strings.forEach((s) => {
    for (let f = 0; f <= maxFret; f += 1) {
      const name = getNoteAtFret(s, f);
      const pc = noteNameToPitchClass(name);
      if (!scalePcs.has(pc)) continue;
      const key = `${s}-${f}`;
      const flags = new Set(['scale']);
      if (tonicPc !== null && pc === tonicPc) flags.add('root');
      cells.set(key, flags);
    }
  });

  if (cagedShapeDeltas && rootFretAnchor !== undefined) {
    const r = rootFretAnchor;
    strings.forEach((s) => {
      const deltas = cagedShapeDeltas[s];
      if (!deltas || !Array.isArray(deltas)) return;
      deltas.forEach((df) => {
        const f = r + df;
        if (f < 0 || f > maxFret) return;
        const key = `${s}-${f}`;
        if (!cells.has(key)) {
          cells.set(key, new Set(['caged']));
        } else {
          cells.get(key).add('caged');
        }
      });
    });
  }

  return cells;
}
