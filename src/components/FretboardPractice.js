import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings, CheckCircle, XCircle, Volume2, VolumeX } from 'lucide-react';
import {
  ensureToneStarted,
  createFretboardSynth,
  disposeAudioNode,
} from '../audio/toneSetup';
import { CHROMATIC_SHARP, getNoteAtFret } from '../lib/fretboard';

const FretboardPractice = () => {
  const [selectedStrings, setSelectedStrings] = useState([1, 2, 3, 4, 5, 6]);
  const [currentNote, setCurrentNote] = useState('');
  const [currentString, setCurrentString] = useState('');
  const [currentFret, setCurrentFret] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [difficulty, setDifficulty] = useState('beginner');
  const [showSettings, setShowSettings] = useState(false);
  const [awaitingUserResponse, setAwaitingUserResponse] = useState(false);
  const [gameState, setGameState] = useState('idle');
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameEndTime, setGameEndTime] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const timerRef = useRef(null);
  const synthRef = useRef(null);
  const nextChallengeTimeoutRef = useRef(null);

  const notes = CHROMATIC_SHARP;

  const stringNames = {
    6: '6th (Low E)',
    5: '5th (A)',
    4: '4th (D)',
    3: '3rd (G)',
    2: '2nd (B)',
    1: '1st (High E)',
  };

  const difficultySettings = {
    beginner: { time: 8, maxFret: 5 },
    intermediate: { time: 6, maxFret: 12 },
    advanced: { time: 4, maxFret: 15 },
    expert: { time: 3, maxFret: 22 },
  };

  const findNotePossitions = (note, strings) => {
    const positions = [];
    const maxFret = difficultySettings[difficulty].maxFret;

    strings.forEach((string) => {
      for (let fret = 0; fret <= maxFret; fret += 1) {
        if (getNoteAtFret(string, fret) === note) {
          positions.push({ string, fret });
        }
      }
    });
    return positions;
  };

  const initializeAudio = async () => {
    if (!audioEnabled) return false;
    if (!audioInitialized) {
      try {
        await ensureToneStarted();
        if (!synthRef.current) {
          synthRef.current = createFretboardSynth();
        }
        setAudioInitialized(true);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  };

  const getGuitarOctave = (string, fret) => {
    const stringOctaves = {
      6: 2,
      5: 2,
      4: 3,
      3: 3,
      2: 3,
      1: 4,
    };

    const baseOctave = stringOctaves[string];
    const octaveOffset = Math.floor(fret / 12);
    return baseOctave + octaveOffset;
  };

  const playNote = async (note, string, fret) => {
    if (!audioEnabled) return;

    let isAudioReady = audioInitialized;
    if (!isAudioReady) {
      isAudioReady = await initializeAudio();
    }

    if (synthRef.current && isAudioReady) {
      const octave = getGuitarOctave(string, fret);
      const noteWithOctave = `${note}${octave}`;
      synthRef.current.triggerAttackRelease(noteWithOctave, '0.8n');
    }
  };

  const generateChallenge = async () => {
    if (selectedStrings.length === 0) return;

    let isAudioReady = audioInitialized;
    if (audioEnabled && !isAudioReady) {
      isAudioReady = await initializeAudio();
    }

    if (gameState === 'idle') {
      setGameState('playing');
      setGameStartTime(new Date());
    }

    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const availableStrings = selectedStrings.filter((string) => {
      const positions = findNotePossitions(randomNote, [string]);
      return positions.length > 0;
    });

    if (availableStrings.length === 0) {
      generateChallenge();
      return;
    }

    const randomString = availableStrings[Math.floor(Math.random() * availableStrings.length)];
    const positions = findNotePossitions(randomNote, [randomString]);
    const randomPosition = positions[Math.floor(Math.random() * positions.length)];

    setCurrentNote(randomNote);
    setCurrentString(randomString);
    setCurrentFret(randomPosition.fret);
    setShowAnswer(false);
    setAwaitingUserResponse(false);
    setTimeLeft(difficultySettings[difficulty].time);
    setIsActive(true);

    if (audioEnabled && isAudioReady) {
      setTimeout(() => {
        playNote(randomNote, randomString, randomPosition.fret);
      }, 800);
    }
  };

  const replayCurrentNote = async () => {
    if (currentNote && currentString !== '' && currentFret !== '') {
      let isAudioReady = audioInitialized;
      if (audioEnabled && !isAudioReady) {
        isAudioReady = await initializeAudio();
      }
      if (isAudioReady) {
        await playNote(currentNote, currentString, currentFret);
      }
    }
  };

  const handleStringToggle = (string) => {
    setSelectedStrings((prev) =>
      prev.includes(string)
        ? prev.filter((s) => s !== string)
        : [...prev, string].sort((a, b) => b - a)
    );
  };

  const handleCorrect = () => {
    if (isGeneratingChallenge) return;

    setScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    setIsActive(false);
    setAwaitingUserResponse(false);
    setIsGeneratingChallenge(true);

    nextChallengeTimeoutRef.current = setTimeout(() => {
      setIsGeneratingChallenge(false);
      generateChallenge();
    }, 1500);
  };

  const handleIncorrect = () => {
    if (isGeneratingChallenge) return;

    setScore((prev) => ({ correct: prev.correct, total: prev.total + 1 }));
    setIsActive(false);
    setAwaitingUserResponse(false);
    setIsGeneratingChallenge(true);

    nextChallengeTimeoutRef.current = setTimeout(() => {
      setIsGeneratingChallenge(false);
      generateChallenge();
    }, 1500);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setShowAnswer(true);
      setAwaitingUserResponse(true);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isActive]);

  useEffect(() => {
    return () => {
      disposeAudioNode(synthRef.current);
      synthRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (nextChallengeTimeoutRef.current) clearTimeout(nextChallengeTimeoutRef.current);
    };
  }, []);

  const resetScore = () => {
    setScore({ correct: 0, total: 0 });
  };

  const endGame = () => {
    setGameState('ended');
    setGameEndTime(new Date());
    setIsActive(false);
    setAwaitingUserResponse(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const startNewGame = () => {
    setGameState('idle');
    setScore({ correct: 0, total: 0 });
    setCurrentNote('');
    setCurrentString('');
    setCurrentFret('');
    setTimeLeft(0);
    setIsActive(false);
    setShowAnswer(false);
    setAwaitingUserResponse(false);
    setGameStartTime(null);
    setGameEndTime(null);
    setIsGeneratingChallenge(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (nextChallengeTimeoutRef.current) {
      clearTimeout(nextChallengeTimeoutRef.current);
    }
  };

  const getGameDuration = () => {
    if (!gameStartTime || !gameEndTime) return 0;
    return Math.round((gameEndTime - gameStartTime) / 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAccuracy = () =>
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <>
      <div className="flex justify-between items-center text-white/80 mb-4">
        <div className="text-sm">
          Score: {score.correct}/{score.total} ({getAccuracy()}%)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              audioEnabled
                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
            title={audioEnabled ? 'Audio On - Click to disable' : 'Audio Off - Click to enable'}
            aria-label={audioEnabled ? 'Disable audio' : 'Enable audio'}
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Open settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {gameState === 'ended' && (
        <section
          className="bg-black/30 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20 text-center"
          aria-labelledby="game-results"
        >
          <h2 id="game-results" className="text-2xl font-bold text-white mb-4">
            Guitar Practice Session Complete!
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6" role="group" aria-label="Practice session statistics">
            <div className="bg-green-500/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">{score.correct}</div>
              <div className="text-sm text-white/80">Correct Notes</div>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">{score.total}</div>
              <div className="text-sm text-white/80">Total Attempts</div>
            </div>
            <div className="bg-purple-500/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-400">{getAccuracy()}%</div>
              <div className="text-sm text-white/80">Accuracy</div>
            </div>
            <div className="bg-orange-500/20 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-400">{formatTime(getGameDuration())}</div>
              <div className="text-sm text-white/80">Duration</div>
            </div>
          </div>

          <div className="text-white/60 mb-4">
            {getAccuracy() >= 90
              ? 'Excellent guitar fretboard mastery!'
              : getAccuracy() >= 75
                ? 'Great guitar practice session!'
                : getAccuracy() >= 60
                  ? 'Good guitar note recognition!'
                  : 'Keep practicing your fretboard skills!'}
          </div>

          <button
            type="button"
            onClick={startNewGame}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            aria-label="Start new guitar practice session"
          >
            <Play size={20} />
            Start New Practice Session
          </button>
        </section>
      )}

      {showSettings && (
        <section
          className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/20"
          aria-labelledby="practice-settings"
        >
          <h3 id="practice-settings" className="text-white font-semibold mb-3">
            Guitar Practice Settings
          </h3>

          <div className="mb-4">
            <span className="text-white/80 text-sm block mb-2">Audio Training</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  audioEnabled
                    ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                    : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                }`}
                aria-pressed={audioEnabled}
              >
                {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {audioEnabled ? 'Audio On' : 'Audio Off'}
              </button>
              {audioEnabled && currentNote && (
                <button
                  type="button"
                  onClick={replayCurrentNote}
                  className="px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                  aria-label="Replay current note"
                >
                  Replay
                </button>
              )}
            </div>
            <div className="text-xs text-white/60 mt-1">
              Ear training: Listen to the target note while you find it on the fretboard
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="difficulty-select" className="text-white/80 text-sm block mb-2">
              Guitar Practice Difficulty
            </label>
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30"
              aria-describedby="difficulty-help"
            >
              <option value="beginner">Beginner (8s, frets 0-5)</option>
              <option value="intermediate">Intermediate (6s, frets 0-12)</option>
              <option value="advanced">Advanced (4s, frets 0-15)</option>
              <option value="expert">Expert (3s, frets 0-22)</option>
            </select>
            <div id="difficulty-help" className="text-xs text-white/60 mt-1">
              Choose your guitar skill level for appropriate fretboard challenges
            </div>
          </div>

          <div className="mb-4">
            <span className="text-white/80 text-sm block mb-2">Guitar Strings to Practice</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Select guitar strings for practice">
              {[6, 5, 4, 3, 2, 1].map((string) => (
                <button
                  type="button"
                  key={string}
                  onClick={() => handleStringToggle(string)}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    selectedStrings.includes(string)
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                  aria-pressed={selectedStrings.includes(string)}
                  aria-label={`Toggle ${stringNames[string]} string practice`}
                >
                  {stringNames[string]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedStrings([1, 2, 3, 4, 5, 6])}
              className="px-3 py-1 bg-green-500/20 text-green-300 rounded text-sm hover:bg-green-500/30 transition-colors"
              aria-label="Select all guitar strings for practice"
            >
              Select All Strings
            </button>
            <button
              type="button"
              onClick={resetScore}
              className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-sm hover:bg-red-500/30 transition-colors"
              aria-label="Reset practice score"
            >
              Reset Score
            </button>
          </div>
        </section>
      )}

      {gameState !== 'ended' && (
        <main
          className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/20"
          role="main"
          aria-labelledby="practice-area"
        >
          <h2 id="practice-area" className="sr-only">
            Guitar Fretboard Practice Area
          </h2>

          {currentNote ? (
            <>
              <div className="text-center mb-6">
                <div
                  className="text-6xl font-bold text-white mb-2"
                  role="img"
                  aria-label={`Find note ${currentNote}`}
                >
                  {currentNote}
                </div>
                <div className="text-xl text-white/80 mb-2">
                  Find this note on {stringNames[currentString]}
                </div>

                {audioEnabled && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={replayCurrentNote}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      aria-label="Replay the target note sound"
                    >
                      <Volume2 size={16} />
                      Replay Note
                    </button>
                    <div className="text-xs text-white/50">Listen and learn</div>
                  </div>
                )}

                {!audioEnabled && (
                  <div className="text-center mb-4">
                    <div className="text-xs text-white/50 bg-orange-500/20 rounded-lg px-3 py-2 inline-block">
                      Audio disabled — enable in header to hear notes
                    </div>
                  </div>
                )}

                <div
                  className="relative w-20 h-20 mx-auto mb-4"
                  role="timer"
                  aria-label={`Time remaining: ${timeLeft} seconds`}
                >
                  <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                  <div
                    className="absolute inset-0 rounded-full border-4 border-blue-400 border-t-transparent transition-all duration-1000 ease-linear"
                    style={{
                      transform: `rotate(${
                        ((difficultySettings[difficulty].time - timeLeft) /
                          difficultySettings[difficulty].time) *
                        360
                      }deg)`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{timeLeft}</span>
                  </div>
                </div>
              </div>

              {awaitingUserResponse && (
                <div className="flex gap-3 mb-4" role="group" aria-label="Response options">
                  <button
                    type="button"
                    onClick={handleCorrect}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    aria-label="I found the correct note on the fretboard"
                  >
                    <CheckCircle size={20} />
                    Got it!
                  </button>
                  <button
                    type="button"
                    onClick={handleIncorrect}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    aria-label="I could not find the note"
                  >
                    <XCircle size={20} />
                    Missed it
                  </button>
                </div>
              )}

              {(showAnswer || timeLeft === 0) && (
                <div
                  className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4"
                  role="region"
                  aria-labelledby="answer-reveal"
                >
                  <div className="text-center text-white">
                    <div id="answer-reveal" className="text-lg font-semibold mb-2">
                      Fretboard Answer:
                    </div>
                    <div className="text-2xl font-bold">
                      {currentNote} is at fret {currentFret} on the {stringNames[currentString]}
                    </div>
                    {currentFret === 0 && (
                      <div className="text-sm text-white/80 mt-1">(Open string)</div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="text-white/60 mb-4">Ready to practice guitar fretboard?</div>
              <p className="text-white/50 text-sm mb-4">
                Practice finding notes on your guitar fretboard with timed challenges. Perfect for
                beginners learning note positions and advanced players looking for fun challenges.
              </p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={async () => {
                if (isGeneratingChallenge) return;

                if (nextChallengeTimeoutRef.current) {
                  clearTimeout(nextChallengeTimeoutRef.current);
                  setIsGeneratingChallenge(false);
                }

                if (audioEnabled && !audioInitialized) {
                  await initializeAudio();
                }
                generateChallenge();
              }}
              disabled={selectedStrings.length === 0 || isGeneratingChallenge}
              className="flex-1 min-w-[140px] bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              aria-label={currentNote ? 'Generate next guitar note challenge' : 'Start guitar fretboard practice'}
            >
              <Play size={20} />
              {isGeneratingChallenge ? 'Loading...' : currentNote ? 'Next Note' : 'Start Practice'}
            </button>

            {isActive && (
              <button
                type="button"
                onClick={() => {
                  setIsActive(false);
                  setShowAnswer(true);
                  setAwaitingUserResponse(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                aria-label="Show the correct fretboard position"
              >
                Show Answer
              </button>
            )}

            {gameState === 'playing' && (
              <button
                type="button"
                onClick={endGame}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                aria-label="End current practice session"
              >
                End Session
              </button>
            )}
          </div>

          {selectedStrings.length === 0 && (
            <div className="text-center text-red-300 text-sm mt-3" role="alert">
              Please select at least one guitar string to practice
            </div>
          )}
        </main>
      )}

      {score.total > 0 && (
        <section className="mt-6 grid grid-cols-3 gap-4" aria-labelledby="practice-stats">
          <h3 id="practice-stats" className="sr-only">
            Practice Statistics
          </h3>
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-3 text-center border border-white/20">
            <div className="text-2xl font-bold text-green-400">{score.correct}</div>
            <div className="text-xs text-white/60">Correct</div>
          </div>
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-3 text-center border border-white/20">
            <div className="text-2xl font-bold text-blue-400">{score.total}</div>
            <div className="text-xs text-white/60">Total</div>
          </div>
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-3 text-center border border-white/20">
            <div className="text-2xl font-bold text-purple-400">{getAccuracy()}%</div>
            <div className="text-xs text-white/60">Accuracy</div>
          </div>
        </section>
      )}

      <section className="mt-6 bg-black/20 backdrop-blur-md rounded-lg p-4 border border-white/10" aria-labelledby="practice-tips">
        <h3 id="practice-tips" className="text-white font-semibold mb-2">
          Fretboard practice tips
        </h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li>Start with beginner mode to learn basic note positions</li>
          <li>Focus on one or two strings at first</li>
          <li>Use a metronome for timing</li>
          <li>Visualize the fretboard away from the guitar</li>
          <li>Practice regularly for muscle memory</li>
          <li>Use audio mode for ear training</li>
        </ul>
      </section>
    </>
  );
};

export default FretboardPractice;
