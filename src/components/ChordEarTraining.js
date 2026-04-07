import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Trash2, SkipForward } from 'lucide-react';
import * as Tone from 'tone';
import {
  ensureToneStarted,
  createChordPolySynth,
  disposeAudioNode,
} from '../audio/toneSetup';

const ROOTS_NATURAL = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ROOTS_ALL = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const SEMITONE = {
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

const QUALITIES = {
  major: { label: 'Major', intervals: [0, 4, 7] },
  minor: { label: 'Minor', intervals: [0, 3, 7] },
  dim: { label: 'Dim', intervals: [0, 3, 6] },
  aug: { label: 'Aug', intervals: [0, 4, 8] },
  '7': { label: 'Dom 7', intervals: [0, 4, 7, 10] },
  maj7: { label: 'Maj 7', intervals: [0, 4, 7, 11] },
  m7: { label: 'Min 7', intervals: [0, 3, 7, 10] },
  m7b5: { label: 'Half-dim', intervals: [0, 3, 6, 10] },
  sus4: { label: 'Sus4', intervals: [0, 5, 7] },
  '7sus4': { label: '7 sus4', intervals: [0, 5, 7, 10] },
  add9: { label: 'Add9', intervals: [0, 4, 7, 14] },
  madd9: { label: 'm add9', intervals: [0, 3, 7, 14] },
};

const EASY_SYMBOLS = [
  'C',
  'Dm',
  'Em',
  'F',
  'G',
  'Am',
  'D',
  'E',
  'A',
  'Bm',
  'Cm',
  'Fm',
];

const MEDIUM_SYMBOLS = [
  ...EASY_SYMBOLS,
  'C7',
  'G7',
  'Fmaj7',
  'Am7',
  'Dm7',
  'Em7',
  'Bb',
  'Eb',
  'Ab',
  'Bbm',
  'Cm7',
  'D7',
];

const HARD_SYMBOLS = [
  ...MEDIUM_SYMBOLS,
  'Cm7b5',
  'F#m',
  'B7',
  'Cdim',
  'Caug',
  'F#7',
  'Bm7b5',
  'Ebmaj7',
  'G7sus4',
  'Amadd9',
];

function parseChordSymbol(symbol) {
  if (SEMITONE[symbol] !== undefined) {
    return { root: symbol, qualityKey: 'major' };
  }
  if (symbol.endsWith('m7b5')) {
    return { root: symbol.slice(0, -4), qualityKey: 'm7b5' };
  }
  if (symbol.endsWith('madd9')) {
    return { root: symbol.slice(0, -5), qualityKey: 'madd9' };
  }
  if (symbol.endsWith('maj7')) {
    return { root: symbol.slice(0, -4), qualityKey: 'maj7' };
  }
  if (symbol.endsWith('7sus4')) {
    return { root: symbol.slice(0, -5), qualityKey: '7sus4' };
  }
  if (symbol.endsWith('m7')) {
    return { root: symbol.slice(0, -2), qualityKey: 'm7' };
  }
  if (symbol.endsWith('add9')) {
    return { root: symbol.slice(0, -4), qualityKey: 'add9' };
  }
  if (symbol.endsWith('dim')) {
    return { root: symbol.slice(0, -3), qualityKey: 'dim' };
  }
  if (symbol.endsWith('aug')) {
    return { root: symbol.slice(0, -3), qualityKey: 'aug' };
  }
  if (symbol.endsWith('m') && !symbol.endsWith('m7')) {
    return { root: symbol.slice(0, -1), qualityKey: 'minor' };
  }
  if (symbol.endsWith('7')) {
    return { root: symbol.slice(0, -1), qualityKey: '7' };
  }
  return { root: symbol, qualityKey: 'major' };
}

function symbolToPitches(symbol, baseOctave = 3) {
  const { root, qualityKey } = parseChordSymbol(symbol);
  if (SEMITONE[root] === undefined) return ['C3', 'E3', 'G3'];
  const intervals = QUALITIES[qualityKey]?.intervals ?? QUALITIES.major.intervals;
  const baseMidi = Tone.Frequency(`${root}${baseOctave}`).toMidi();
  return intervals.map((intv) => Tone.Frequency(baseMidi + intv, 'midi').toNote());
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueProgression(pool, len) {
  const copy = shuffle([...pool]);
  const out = [];
  for (let i = 0; i < copy.length && out.length < len; i += 1) {
    if (!out.includes(copy[i])) out.push(copy[i]);
  }
  while (out.length < len) {
    out.push(pickRandom(pool));
  }
  return out.slice(0, len);
}

const ChordEarTraining = () => {
  const [subMode, setSubMode] = useState('single');
  const [difficulty, setDifficulty] = useState('easy');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState(null);

  const [targetChord, setTargetChord] = useState('');
  const [guessRoot, setGuessRoot] = useState('C');
  const [guessQuality, setGuessQuality] = useState('major');

  const [progressionLen] = useState(4);
  const [targetProg, setTargetProg] = useState([]);
  const [userProg, setUserProg] = useState([]);
  const [progPalette, setProgPalette] = useState([]);

  const polyRef = useRef(null);

  const pool = useMemo(() => {
    if (difficulty === 'easy') return EASY_SYMBOLS;
    if (difficulty === 'medium') return MEDIUM_SYMBOLS;
    return HARD_SYMBOLS;
  }, [difficulty]);

  const rootChoices = useMemo(
    () => (difficulty === 'easy' ? ROOTS_NATURAL : ROOTS_ALL),
    [difficulty]
  );

  const qualityChoices = useMemo(() => {
    if (difficulty === 'easy') {
      return ['major', 'minor', 'dim'];
    }
    if (difficulty === 'medium') {
      return ['major', 'minor', '7', 'maj7', 'm7', 'dim'];
    }
    return Object.keys(QUALITIES);
  }, [difficulty]);

  useEffect(() => {
    return () => {
      disposeAudioNode(polyRef.current);
      polyRef.current = null;
    };
  }, []);

  const playSymbols = useCallback(async (symbols, gapSec = 0.45) => {
    await ensureToneStarted();
    if (!polyRef.current) {
      polyRef.current = createChordPolySynth();
    }
    const poly = polyRef.current;
    let t = Tone.now() + 0.05;
    symbols.forEach((sym, idx) => {
      const pitches = symbolToPitches(sym);
      poly.triggerAttackRelease(pitches, '1.2n', t);
      const dur = Tone.Time('1.2n').toSeconds();
      t += dur + (idx < symbols.length - 1 ? gapSec : 0);
    });
  }, []);

  const newSingleRound = useCallback(() => {
    const sym = pickRandom(pool);
    const { root } = parseChordSymbol(sym);
    setTargetChord(sym);
    setFeedback(null);
    setGuessRoot(rootChoices.includes(root) ? root : rootChoices[0]);
    setGuessQuality('major');
  }, [pool, rootChoices]);

  const newProgressionRound = useCallback(() => {
    const prog = uniqueProgression(pool, progressionLen);
    setTargetProg(prog);
    setUserProg([]);
    setFeedback(null);
    const extras = shuffle(pool).filter((c) => !prog.includes(c)).slice(0, 6);
    setProgPalette(shuffle([...prog, ...extras]));
  }, [pool, progressionLen]);

  useEffect(() => {
    if (subMode === 'single') {
      newSingleRound();
    } else {
      newProgressionRound();
    }
  }, [subMode, difficulty, newSingleRound, newProgressionRound]);

  const guessToSymbol = () => {
    const q = guessQuality;
    if (q === 'major') return guessRoot;
    if (q === 'minor') return `${guessRoot}m`;
    if (q === 'dim') return `${guessRoot}dim`;
    if (q === 'aug') return `${guessRoot}aug`;
    if (q === '7') return `${guessRoot}7`;
    if (q === 'maj7') return `${guessRoot}maj7`;
    if (q === 'm7') return `${guessRoot}m7`;
    if (q === 'm7b5') return `${guessRoot}m7b5`;
    if (q === '7sus4') return `${guessRoot}7sus4`;
    if (q === 'sus4') return `${guessRoot}sus4`;
    if (q === 'add9') return `${guessRoot}add9`;
    if (q === 'madd9') return `${guessRoot}madd9`;
    return guessRoot;
  };

  const symbolsMatch = (a, b) => {
    const pa = symbolToPitches(a).join(',');
    const pb = symbolToPitches(b).join(',');
    return pa === pb;
  };

  const submitSingle = () => {
    const g = guessToSymbol();
    const ok = symbolsMatch(g, targetChord);
    setScore((prev) => ({
      correct: prev.correct + (ok ? 1 : 0),
      total: prev.total + 1,
    }));
    setFeedback(ok ? 'Correct!' : `Answer: ${targetChord} (you chose ${g})`);
  };

  const submitProgression = () => {
    if (userProg.length !== progressionLen) {
      setFeedback(`Pick ${progressionLen} chords in order.`);
      return;
    }
    const ok = userProg.every((c, i) => symbolsMatch(c, targetProg[i]));
    setScore((prev) => ({
      correct: prev.correct + (ok ? 1 : 0),
      total: prev.total + 1,
    }));
    setFeedback(
      ok
        ? 'Correct progression!'
        : `Answer: ${targetProg.join(' → ')}`
    );
  };

  const addProgChord = (sym) => {
    if (userProg.length >= progressionLen) return;
    setUserProg((p) => [...p, sym]);
    setFeedback(null);
  };

  const clearProg = () => {
    setUserProg([]);
    setFeedback(null);
  };

  const popProg = () => {
    setUserProg((p) => p.slice(0, -1));
    setFeedback(null);
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div>
      <div className="flex rounded-full bg-black/30 p-1 mb-4 border border-white/20">
        <button
          type="button"
          onClick={() => setSubMode('single')}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
            subMode === 'single' ? 'bg-blue-500 text-white' : 'text-white/70'
          }`}
        >
          Single chord
        </button>
        <button
          type="button"
          onClick={() => setSubMode('progression')}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
            subMode === 'progression' ? 'bg-blue-500 text-white' : 'text-white/70'
          }`}
        >
          Progression
        </button>
      </div>

      <section className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
        <div className="text-white/80 text-sm mb-2">
          Score: {score.correct}/{score.total} ({accuracy}%)
        </div>
        <label htmlFor="chord-difficulty" className="text-white/80 text-sm block mb-2">
          Difficulty
        </label>
        <select
          id="chord-difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30"
        >
          <option value="easy">Easy (triads, common keys)</option>
          <option value="medium">Medium (+ 7ths)</option>
          <option value="hard">Hard (extensions & more roots)</option>
        </select>
      </section>

      {subMode === 'single' && (
        <section className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/20">
          <h2 className="text-white font-semibold mb-3">Identify the chord</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => playSymbols([targetChord])}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              aria-label="Play chord"
            >
              <Play size={18} />
              Play chord
            </button>
            <button
              type="button"
              onClick={newSingleRound}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm"
            >
              <SkipForward size={18} />
              New chord
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="text-white/70 text-xs block mb-1">Root</span>
              <select
                value={guessRoot}
                onChange={(e) => setGuessRoot(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
              >
                {rootChoices.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-white/70 text-xs block mb-1">Quality</span>
              <select
                value={guessQuality}
                onChange={(e) => setGuessQuality(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
              >
                {qualityChoices.map((q) => (
                  <option key={q} value={q}>
                    {QUALITIES[q]?.label ?? q}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={submitSingle}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg mb-3"
          >
            Submit answer
          </button>

          {feedback && (
            <div
              className={`text-sm rounded-lg p-3 ${
                feedback.startsWith('Correct')
                  ? 'bg-green-500/20 text-green-200'
                  : 'bg-amber-500/20 text-amber-100'
              }`}
              role="status"
            >
              {feedback}
            </div>
          )}
        </section>
      )}

      {subMode === 'progression' && (
        <section className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/20">
          <h2 className="text-white font-semibold mb-3">Identify the progression</h2>
          <p className="text-white/60 text-sm mb-3">
            Chords play in order with a short pause. Tap chords below to match that order (
            {progressionLen} chords).
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => playSymbols(targetProg)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              <Play size={18} />
              Play progression
            </button>
            <button
              type="button"
              onClick={newProgressionRound}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm"
            >
              <SkipForward size={18} />
              New progression
            </button>
            <button
              type="button"
              onClick={popProg}
              className="flex items-center gap-2 bg-orange-500/30 text-white px-3 py-2 rounded-lg text-sm"
            >
              Undo last
            </button>
            <button
              type="button"
              onClick={clearProg}
              className="flex items-center gap-2 bg-red-500/30 text-white px-3 py-2 rounded-lg text-sm"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>

          <div className="mb-3">
            <span className="text-white/70 text-xs block mb-2">Your answer (order)</span>
            <div className="flex flex-wrap gap-2 min-h-[44px]">
              {Array.from({ length: progressionLen }).map((_, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/30 text-white font-mono text-sm min-w-[3.5rem] text-center"
                >
                  {userProg[i] ?? '—'}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {progPalette.map((sym, idx) => (
              <button
                key={`${sym}-${idx}`}
                type="button"
                onClick={() => addProgChord(sym)}
                className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm border border-white/20"
              >
                {sym}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={submitProgression}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg mb-3"
          >
            Submit progression
          </button>

          {feedback && (
            <div
              className={`text-sm rounded-lg p-3 ${
                feedback.startsWith('Correct')
                  ? 'bg-green-500/20 text-green-200'
                  : 'bg-amber-500/20 text-amber-100'
              }`}
              role="status"
            >
              {feedback}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ChordEarTraining;
