/**
 * Heptatonic modes: intervals in semitones from tonic (sorted for pitch-class set).
 * Pentatonic: 5-note rotations from major pentatonic parent.
 */

function modeFromParent(parentAscendingPcs, startIndex) {
  const len = parentAscendingPcs.length;
  const root = parentAscendingPcs[startIndex % len];
  const intervals = [];
  for (let i = 0; i < len; i += 1) {
    const p = parentAscendingPcs[(startIndex + i) % len];
    intervals.push((p - root + 12) % 12);
  }
  return intervals.sort((a, b) => a - b);
}

const MAJOR_PARENT = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR_PARENT = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC_MINOR_PARENT = [0, 2, 3, 5, 7, 8, 11];
const MELODIC_MINOR_PARENT = [0, 2, 3, 5, 7, 9, 11];
const MAJOR_PENT_PARENT = [0, 2, 4, 7, 9];

const MAJOR_MODE_NAMES = [
  'Ionian',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Aeolian',
  'Locrian',
];

const NATURAL_MINOR_MODE_NAMES = [
  'Aeolian (natural minor)',
  'Locrian ♮6',
  'Ionian',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian ♭6',
];

const HARMONIC_MINOR_MODE_NAMES = [
  'Harmonic minor',
  'Locrian ♮6 (♯2)',
  'Ionian ♯5',
  'Dorian ♯4',
  'Phrygian dominant',
  'Lydian ♯2',
  'Altered (Super Locrian ♭♭7)',
];

const MELODIC_MINOR_MODE_NAMES = [
  'Melodic minor',
  'Dorian ♭2',
  'Lydian augmented',
  'Lydian dominant',
  'Mixolydian ♭6',
  'Locrian ♮2',
  'Altered (Super Locrian)',
];

const PENT_MODE_NAMES = [
  'Major pentatonic',
  'Suspended pentatonic',
  'Minor pentatonic',
  'Blues minor pent (no ♮3)',
  'Minor (relative major box)',
];

function buildModes(parent, names, familyId, theoryBase) {
  return names.map((name, i) => ({
    id: `${familyId}-${i}`,
    name,
    intervals: modeFromParent(parent, i),
    theory: {
      ...theoryBase[i],
      title: name,
    },
  }));
}

const majorTheory = [
  { formula: 'W W H W W W H', summary: 'Bright major tonality; Ionian is the major scale.', characteristic: 'Major 3rd and major 7th.' },
  { formula: 'W H W W W H W', summary: 'Minor scale with raised 6th; common in folk and jazz.', characteristic: 'Minor 7th, major 6th.' },
  { formula: 'H W W W H W W', summary: 'Spanish / Flamenco color; minor 2nd from root.', characteristic: '♭2, ♭6.' },
  { formula: 'W W W H W W H', summary: 'Bright, floating; raised 4th avoids resolution pull.', characteristic: '♯4.' },
  { formula: 'W W H W W H W', summary: 'Major with ♭7; dominant / rock feel.', characteristic: '♭7.' },
  { formula: 'W H W W H W W', summary: 'Natural minor sound; relative minor of Ionian.', characteristic: '♭3, ♭6, ♭7.' },
  { formula: 'H W W H W W W', summary: 'Unstable, diminished color; half-dim ii in minor keys.', characteristic: '♭2, ♭5.' },
];

const natMinTheory = majorTheory.map((t, i) => ({
  ...t,
  summary: `${t.summary} (same pitch collection as a major key, rooted on the minor tonic.)`,
}));

const harmTheory = [
  { formula: 'W H W W H WH H', summary: 'Classical minor with leading tone; V is major.', characteristic: '♯7 in minor.' },
  { formula: 'H WH W H W W W', summary: 'Diminished color with natural 6.', characteristic: '♭2, ♯2 tension.' },
  { formula: 'W W H H W W W', summary: 'Major with ♯5; augmented flavor.', characteristic: '♯5.' },
  { formula: 'W H H W W W W', summary: 'Jazz minor-Major IV color.', characteristic: '♯4.' },
  { formula: 'H H W W W W W', summary: 'Spanish / Jewish scales; dominant b9,b13.', characteristic: '♭2, ♭6.' },
  { formula: 'H W W W W W H', summary: 'Very bright; ♯2.', characteristic: '♯2.' },
  { formula: 'W W W W W H H', summary: 'Altered diminished whole-tone region.', characteristic: 'All alterations.' },
];

const melTheory = [
  { formula: 'W H W W W W H', summary: 'Jazz ascending melodic minor; natural 6 and 7 up.', characteristic: 'Major 6th and 7th on minor tonic.' },
  { formula: 'H W W W W H W', summary: 'Phrygian ♮2; susb9 sound.', characteristic: '♭2.' },
  { formula: 'W W W W H W H', summary: 'Lydian with ♯5.', characteristic: '♯4, ♯5.' },
  { formula: 'W W W H W H W', summary: 'Lydian dominant; Mixolydian ♯4.', characteristic: '♯4, ♭7.' },
  { formula: 'W W H W H W W', summary: 'Hindu / Aeolian ♮7.', characteristic: '♭6, ♭7.' },
  { formula: 'W H W H W W W', summary: 'Half-diminished with ♮2.', characteristic: '♭5, ♮2.' },
  { formula: 'H W H W W W W', summary: 'Altered scale; dominant alt.', characteristic: '♭9, ♯9, ♯11, ♭13.' },
];

const pentTheory = [
  { formula: 'W W m3 W', summary: 'No 4th or 7th; very stable; rock and country.', characteristic: 'Root, 2, 3, 5, 6.' },
  { formula: 'W m3 W W', summary: 'No 3rd; open, suspended.', characteristic: 'Root, 2, 4, 5, ♭7.' },
  { formula: 'm3 W W m3', summary: 'Minor pentatonic; blues and rock.', characteristic: 'Root, ♭3, 4, 5, ♭7.' },
  { formula: 'W W m3 W', summary: 'Minor without 2; Phrygian pent flavor.', characteristic: 'Root, ♭3, 5, ♭7.' },
  { formula: 'W m3 W W', summary: 'Major pent from the 5th degree.', characteristic: '5 notes of diatonic set.' },
];

export const SCALE_FAMILIES = [
  {
    id: 'major',
    label: 'Major scale (modes)',
    description: 'Seven modes of the major scale (diatonic).',
    modes: buildModes(MAJOR_PARENT, MAJOR_MODE_NAMES, 'major', majorTheory),
  },
  {
    id: 'naturalMinor',
    label: 'Natural minor (modes)',
    description: 'Seven modes built from the natural minor (Aeolian) collection.',
    modes: buildModes(NATURAL_MINOR_PARENT, NATURAL_MINOR_MODE_NAMES, 'naturalMinor', natMinTheory),
  },
  {
    id: 'harmonicMinor',
    label: 'Harmonic minor (modes)',
    description: 'Seven modes of harmonic minor.',
    modes: buildModes(HARMONIC_MINOR_PARENT, HARMONIC_MINOR_MODE_NAMES, 'harmonicMinor', harmTheory),
  },
  {
    id: 'melodicMinor',
    label: 'Melodic minor (modes)',
    description: 'Seven modes of jazz melodic minor (ascending form).',
    modes: buildModes(MELODIC_MINOR_PARENT, MELODIC_MINOR_MODE_NAMES, 'melodicMinor', melTheory),
  },
  {
    id: 'pentatonic',
    label: 'Pentatonic',
    description: 'Major or minor pentatonic; pick box 1–5 to highlight that region on the neck.',
    modes: PENT_MODE_NAMES.map((name, i) => ({
      id: `pentatonic-${i}`,
      name,
      intervals: modeFromParent(MAJOR_PENT_PARENT, i),
      theory: {
        title: name,
        ...pentTheory[i],
      },
    })),
  },
];

export const TONICS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
