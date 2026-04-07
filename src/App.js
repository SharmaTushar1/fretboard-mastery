import React, { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import FretboardPractice from './components/FretboardPractice';
import MelodyPractice from './components/MelodyPractice';
import ChordEarTraining from './components/ChordEarTraining';
import ScalePractice from './components/ScalePractice';

const MODES = [
  { id: 'fretboard', label: 'Fretboard' },
  { id: 'melody', label: 'Melodies' },
  { id: 'chord', label: 'Chords' },
  { id: 'scales', label: 'Scales' },
];

const modeSubtitles = {
  fretboard: 'Find notes fast with timed challenges',
  melody: 'Ear training and short melodies for transcribing',
  chord: 'Identify single chords and progressions by ear',
  scales: 'Scale theory, modes, and interactive fretboard map',
};

const GuitarPracticeApp = () => {
  const [practiceMode, setPracticeMode] = useState('fretboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div
        className={`mx-auto px-1 ${practiceMode === 'scales' ? 'max-w-4xl' : 'max-w-md'}`}
      >
        <header className="text-center mb-4">
          <h1 className="text-3xl font-bold text-white mb-2">Fretboard Master</h1>
          <p className="text-white/60 text-sm mb-4">{modeSubtitles[practiceMode]}</p>

          <nav
            className="flex flex-wrap justify-center gap-2 mb-2"
            aria-label="Practice mode"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPracticeMode(m.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  practiceMode === m.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                aria-pressed={practiceMode === m.id}
                aria-label={`${m.label} practice mode`}
              >
                {m.label}
              </button>
            ))}
          </nav>
        </header>

        {practiceMode === 'fretboard' && <FretboardPractice />}
        {practiceMode === 'melody' && <MelodyPractice />}
        {practiceMode === 'chord' && <ChordEarTraining />}
        {practiceMode === 'scales' && <ScalePractice />}

        <footer className="mt-6 text-center">
          <a
            href="https://sharmatushar1.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            aria-label="Send feedback about the guitar practice app"
          >
            Suggestions or feedback?
          </a>
          <p className="text-white/40 text-xs mt-2">Free guitar practice app</p>
          <p className="text-white/30 text-xs mt-1">
            &copy; {new Date().getFullYear()} Tushar Sharma
          </p>
        </footer>
      </div>
      <Analytics />
    </div>
  );
};

export default GuitarPracticeApp;
