import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import * as Tone from 'tone';
import { SCALE_FAMILIES, TONICS } from '../data/scales';
import { CAGED_SHAPES, getCagedDeltasForShape } from '../data/caged';
import {
  getMajorPentatonicBoxDeltas,
  getMinorPentatonicBoxDeltas,
  getHeptatonicBoxDeltas,
} from '../data/neckBoxes';
import {
  noteNameToPitchClass,
  pitchClassesFromIntervals,
  rootFretOnString6,
  getGuitarOctaveForCell,
  getNoteAtFret,
} from '../lib/fretboard';
import { ensureToneStarted, createMelodySynth, disposeAudioNode } from '../audio/toneSetup';
import FretboardDiagram from './FretboardDiagram';

const MAX_FRET = 15;

const PENT_MAJOR_INTERVALS = [0, 2, 4, 7, 9];
const PENT_MINOR_INTERVALS = [0, 3, 5, 7, 10];

const PENT_MAJOR_THEORY = {
  formula: 'W W m3 W',
  summary: 'No 4th or 7th; very stable; rock and country.',
  characteristic: 'Root, 2, 3, 5, 6.',
};
const PENT_MINOR_THEORY = {
  formula: 'm3 W W m3',
  summary: 'Minor pentatonic; blues and rock.',
  characteristic: 'Root, ♭3, 4, 5, ♭7.',
};

const CAGED_MAJOR_FAMILY = {
  id: 'cagedMajor',
  label: 'CAGED (major)',
  description: 'Ionian (major) scale with a highlighted CAGED box you choose.',
  modes: [
    {
      id: 'ionian',
      name: 'Ionian (major)',
      intervals: [0, 2, 4, 5, 7, 9, 11],
      theory: {
        title: 'CAGED overview',
        formula: 'C · A · G · E · D movable shapes',
        summary:
          'Five open major chord shapes become movable barre patterns. Each connects to the next up the neck.',
        characteristic: 'Learn one key in all five shapes to unlock the whole fretboard.',
      },
    },
  ],
};

const FAMILIES = [...SCALE_FAMILIES, CAGED_MAJOR_FAMILY];

/**
 * @param {Object} opts
 * @param {string} opts.tonic
 * @param {number[]} opts.intervals
 * @param {number} opts.maxFret
 * @param {Record<number, number[]> | null} opts.boxDeltas stringNum -> fret offsets from string-6 root anchor
 */
function makeGetCellMeta({ tonic, intervals, maxFret, boxDeltas }) {
  const tonicPc = noteNameToPitchClass(tonic);
  const scalePcs = pitchClassesFromIntervals(intervals);
  const r = rootFretOnString6(tonic, maxFret);

  return (s, f) => {
    const pc = noteNameToPitchClass(getNoteAtFret(s, f));
    const inScale = pc !== null && scalePcs.has(pc);
    const isRoot = pc !== null && tonicPc !== null && pc === tonicPc;
    let inActiveBox = false;
    if (boxDeltas && boxDeltas[s]) {
      inActiveBox = boxDeltas[s].some((df) => {
        const nf = r + df;
        return nf === f && nf >= 0 && nf <= maxFret;
      });
    }
    return { inScale, isRoot, inActiveBox };
  };
}

const ScalePractice = () => {
  const [familyId, setFamilyId] = useState(FAMILIES[0].id);
  const [modeIndex, setModeIndex] = useState(0);
  const [tonic, setTonic] = useState('C');
  const [pentVariant, setPentVariant] = useState('major');
  const [pentBox, setPentBox] = useState(1);
  const [cagedShapeId, setCagedShapeId] = useState('E');
  const [theoryOpen, setTheoryOpen] = useState(true);
  const synthRef = useRef(null);

  const family = useMemo(() => FAMILIES.find((f) => f.id === familyId) || FAMILIES[0], [familyId]);
  const mode = family.modes[Math.min(modeIndex, family.modes.length - 1)] || family.modes[0];

  const isPentatonic = familyId === 'pentatonic';
  const isCagedOnly = familyId === 'cagedMajor';

  const intervals = useMemo(() => {
    if (isPentatonic) {
      return pentVariant === 'major' ? PENT_MAJOR_INTERVALS : PENT_MINOR_INTERVALS;
    }
    return mode.intervals;
  }, [isPentatonic, pentVariant, mode]);

  const theory = useMemo(() => {
    if (isPentatonic) {
      const base = pentVariant === 'major' ? PENT_MAJOR_THEORY : PENT_MINOR_THEORY;
      const title = pentVariant === 'major' ? 'Major pentatonic' : 'Minor pentatonic';
      return {
        title,
        ...base,
        summary: `${base.summary} Box ${pentBox} marks one classic five-fret region (root on string 6 at the key’s low position).`,
      };
    }
    return mode.theory;
  }, [isPentatonic, pentVariant, pentBox, mode]);

  const boxDeltas = useMemo(() => {
    if (isPentatonic) {
      return pentVariant === 'major'
        ? getMajorPentatonicBoxDeltas(pentBox)
        : getMinorPentatonicBoxDeltas(pentBox);
    }
    if (isCagedOnly) {
      return getCagedDeltasForShape(cagedShapeId);
    }
    return getHeptatonicBoxDeltas(modeIndex);
  }, [isPentatonic, isCagedOnly, pentVariant, pentBox, cagedShapeId, modeIndex]);

  const getCellMeta = useMemo(
    () => makeGetCellMeta({ tonic, intervals, maxFret: MAX_FRET, boxDeltas }),
    [tonic, intervals, boxDeltas]
  );

  useEffect(() => {
    setModeIndex(0);
  }, [familyId]);

  useEffect(() => {
    return () => disposeAudioNode(synthRef.current);
  }, []);

  const playScale = useCallback(async () => {
    await ensureToneStarted();
    if (!synthRef.current) {
      synthRef.current = createMelodySynth();
    }
    const synth = synthRef.current;
    const sorted = [...intervals].sort((a, b) => a - b);
    const r = rootFretOnString6(tonic, MAX_FRET);
    const oct = getGuitarOctaveForCell(6, r);
    const tonicMidi = Tone.Frequency(`${tonic}${oct}`).toMidi();
    let t = Tone.now() + 0.08;
    sorted.forEach((iv) => {
      const note = Tone.Frequency(tonicMidi + iv, 'midi').toNote();
      synth.triggerAttackRelease(note, '8n', t);
      t += 0.22;
    });
    sorted.slice(0, -1).reverse().forEach((iv) => {
      const note = Tone.Frequency(tonicMidi + iv, 'midi').toNote();
      synth.triggerAttackRelease(note, '8n', t);
      t += 0.22;
    });
  }, [intervals, tonic]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <section className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="scale-family" className="text-white/80 text-sm block mb-1">
              Scale family
            </label>
            <select
              id="scale-family"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
            >
              {FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-white/50 text-xs mt-1">{family.description}</p>
          </div>

          <div>
            <label htmlFor="scale-tonic" className="text-white/80 text-sm block mb-1">
              Key (tonic)
            </label>
            <select
              id="scale-tonic"
              value={tonic}
              onChange={(e) => setTonic(e.target.value)}
              className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
            >
              {TONICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isPentatonic && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pent-variant" className="text-white/80 text-sm block mb-1">
                Pentatonic type
              </label>
              <select
                id="pent-variant"
                value={pentVariant}
                onChange={(e) => setPentVariant(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
              >
                <option value="major">Major pentatonic</option>
                <option value="minor">Minor pentatonic</option>
              </select>
            </div>
            <div>
              <label htmlFor="pent-box" className="text-white/80 text-sm block mb-1">
                Box (position)
              </label>
              <select
                id="pent-box"
                value={pentBox}
                onChange={(e) => setPentBox(parseInt(e.target.value, 10))}
                className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
              >
                {[1, 2, 3, 4, 5].map((b) => (
                  <option key={b} value={b}>
                    Box {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!isCagedOnly && !isPentatonic && (
          <div className="mt-3">
            <label htmlFor="scale-mode" className="text-white/80 text-sm block mb-1">
              Mode (position 1–7 on the neck)
            </label>
            <select
              id="scale-mode"
              value={modeIndex}
              onChange={(e) => setModeIndex(parseInt(e.target.value, 10))}
              className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
            >
              {family.modes.map((m, i) => (
                <option key={m.id} value={i}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          {isCagedOnly && (
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="caged-shape" className="text-white/80 text-xs block mb-1">
                CAGED shape (highlighted region)
              </label>
              <select
                id="caged-shape"
                value={cagedShapeId}
                onChange={(e) => setCagedShapeId(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
              >
                {CAGED_SHAPES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={playScale}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            aria-label="Play scale up and down"
          >
            <Play size={18} />
            Play scale
          </button>
        </div>
      </section>

      <section className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
        <button
          type="button"
          onClick={() => setTheoryOpen(!theoryOpen)}
          className="flex items-center justify-between w-full text-left text-white font-semibold mb-2"
          aria-expanded={theoryOpen}
        >
          Theory: {theory.title}
          {theoryOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {theoryOpen && (
          <div className="text-white/80 text-sm space-y-2 border-t border-white/10 pt-3">
            {theory.formula && (
              <p>
                <span className="text-white/50">Pattern / formula: </span>
                {theory.formula}
              </p>
            )}
            {theory.summary && <p>{theory.summary}</p>}
            {theory.characteristic && (
              <p className="text-cyan-200/90">
                <span className="text-white/50">Sound: </span>
                {theory.characteristic}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/20">
        <h2 className="text-white font-semibold text-sm mb-2">Fretboard map</h2>
        <p className="text-white/50 text-xs mb-2">
          Amber = tonic. Lighter cells = other scale tones in the key. Cyan ring = active box / position.
          Open strings are fret 0. Labels use sharp names.
        </p>
        <FretboardDiagram maxFret={MAX_FRET} getCellMeta={getCellMeta} />
      </section>
    </div>
  );
};

export default ScalePractice;
