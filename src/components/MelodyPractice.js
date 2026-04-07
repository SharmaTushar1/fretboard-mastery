import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Square, Eye, EyeOff } from 'lucide-react';
import * as Tone from 'tone';
import {
  ensureToneStarted,
  createMelodySynth,
  disposeAudioNode,
  stopTransportAndCancel,
} from '../audio/toneSetup';
import { MELODIES, MELODY_DIFFICULTIES } from '../data/melodies';

function buildPartEvents(notes) {
  let acc = 0;
  return notes.map((n) => {
    const start = acc;
    acc += Tone.Time(n.duration).toSeconds();
    return [start, n];
  });
}

function getMelodyDurationSeconds(notes) {
  return notes.reduce((sum, n) => sum + Tone.Time(n.duration).toSeconds(), 0);
}

const MelodyPractice = () => {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(MELODIES[0]?.id ?? '');
  const [tempoScale, setTempoScale] = useState(1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(null);
  const partRef = useRef(null);
  const playEndTimeoutRef = useRef(null);

  const filteredMelodies = useMemo(() => {
    if (filter === 'all') return MELODIES;
    return MELODIES.filter((m) => m.difficulty === filter);
  }, [filter]);

  const selectedMelody = useMemo(
    () => MELODIES.find((m) => m.id === selectedId) ?? filteredMelodies[0],
    [selectedId, filteredMelodies]
  );

  useEffect(() => {
    if (filteredMelodies.length && !filteredMelodies.some((m) => m.id === selectedId)) {
      setSelectedId(filteredMelodies[0].id);
    }
  }, [filteredMelodies, selectedId]);

  const stopPlayback = useCallback(() => {
    if (playEndTimeoutRef.current) {
      window.clearTimeout(playEndTimeoutRef.current);
      playEndTimeoutRef.current = null;
    }
    stopTransportAndCancel();
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playMelody = useCallback(async () => {
    const melody = selectedMelody;
    if (!melody?.notes?.length) return;

    await ensureToneStarted();
    stopPlayback();

    if (!synthRef.current) {
      synthRef.current = createMelodySynth();
    }

    const bpm = melody.bpm * tempoScale;
    Tone.Transport.bpm.value = bpm;

    const events = buildPartEvents(melody.notes);
    const part = new Tone.Part((time, ev) => {
      synthRef.current.triggerAttackRelease(ev.pitch, ev.duration, time);
    }, events);

    part.loop = false;
    part.start(0);
    partRef.current = part;

    const totalSec = getMelodyDurationSeconds(melody.notes);
    setIsPlaying(true);
    Tone.Transport.start();

    playEndTimeoutRef.current = window.setTimeout(() => {
      playEndTimeoutRef.current = null;
      stopPlayback();
    }, (totalSec + 0.35) * 1000);
  }, [selectedMelody, tempoScale, stopPlayback]);

  useEffect(() => {
    return () => {
      if (playEndTimeoutRef.current) {
        window.clearTimeout(playEndTimeoutRef.current);
        playEndTimeoutRef.current = null;
      }
      stopPlayback();
      disposeAudioNode(synthRef.current);
      synthRef.current = null;
    };
  }, [stopPlayback]);

  const answerText = selectedMelody
    ? selectedMelody.notes.map((n) => `${n.pitch} (${n.duration})`).join(' → ')
    : '';

  return (
    <div>
      <p className="text-amber-200/90 text-xs mb-3 px-1 leading-relaxed border border-amber-500/30 rounded-lg p-2 bg-black/20">
        Educational use only. Short fragments; you are responsible for licensing if you deploy
        publicly.
      </p>

      <section className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
        <label htmlFor="melody-filter" className="text-white/80 text-sm block mb-2">
          Difficulty
        </label>
        <select
          id="melody-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 mb-4"
        >
          {MELODY_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'All levels' : d.charAt(0).toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>

        <label htmlFor="melody-select" className="text-white/80 text-sm block mb-2">
          Melody ({filteredMelodies.length} available)
        </label>
        <select
          id="melody-select"
          value={selectedMelody?.id ?? ''}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setShowAnswer(false);
            stopPlayback();
          }}
          className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30 text-sm"
        >
          {filteredMelodies.map((m) => (
            <option key={m.id} value={m.id}>
              [{m.difficulty}] {m.title}
            </option>
          ))}
        </select>

        <div className="mt-4">
          <label htmlFor="tempo-scale" className="text-white/80 text-sm block mb-2">
            Tempo scale: {tempoScale.toFixed(2)}× (slow practice)
          </label>
          <input
            id="tempo-scale"
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={tempoScale}
            onChange={(e) => setTempoScale(Number(e.target.value))}
            className="w-full"
            aria-label="Tempo scale for melody playback"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={playMelody}
            disabled={isPlaying || !selectedMelody}
            className="flex-1 min-w-[120px] bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            aria-label="Play melody"
          >
            <Play size={20} />
            {isPlaying ? 'Playing…' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => {
              stopPlayback();
              playMelody();
            }}
            disabled={isPlaying || !selectedMelody}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-sm"
            aria-label="Replay melody"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={stopPlayback}
            disabled={!isPlaying}
            className="px-4 py-3 bg-orange-500/30 hover:bg-orange-500/50 disabled:opacity-40 text-white rounded-lg flex items-center gap-2"
            aria-label="Stop playback"
          >
            <Square size={18} />
            Stop
          </button>
        </div>
      </section>

      <section className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-white font-semibold text-lg">Transcribing</h2>
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
            aria-expanded={showAnswer}
            aria-label={showAnswer ? 'Hide answer' : 'Reveal answer'}
          >
            {showAnswer ? <EyeOff size={18} /> : <Eye size={18} />}
            {showAnswer ? 'Hide answer' : 'Reveal answer'}
          </button>
        </div>
        <p className="text-white/60 text-sm mb-3">
          Listen without looking, sketch the notes, then reveal to check. Use slower tempo while
          learning.
        </p>
        {showAnswer && selectedMelody && (
          <div
            className="bg-yellow-500/15 border border-yellow-500/30 rounded-lg p-3 text-white text-sm break-words"
            role="region"
            aria-label="Melody answer"
          >
            <div className="font-semibold text-yellow-200 mb-1">{selectedMelody.title}</div>
            <div className="text-white/90 font-mono text-xs leading-relaxed">{answerText}</div>
            <div className="text-white/50 text-xs mt-2">Base tempo: {selectedMelody.bpm} BPM</div>
          </div>
        )}
      </section>
    </div>
  );
};

export default MelodyPractice;
