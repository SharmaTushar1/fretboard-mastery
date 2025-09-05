import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, CheckCircle, XCircle } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react"

const GuitarPracticeApp = () => {
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
  const [gameState, setGameState] = useState('idle'); // 'idle', 'playing', 'ended'
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameEndTime, setGameEndTime] = useState(null);
  const timerRef = useRef(null);

  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Standard tuning: Low E (6th) to High E (1st)
  const stringTuning = {
    6: 'E', // Low E
    5: 'A',
    4: 'D',
    3: 'G',
    2: 'B',
    1: 'E'  // High E
  };

  const stringNames = {
    6: '6th (Low E)',
    5: '5th (A)',
    4: '4th (D)',
    3: '3rd (G)',
    2: '2nd (B)',
    1: '1st (High E)'
  };

  const difficultySettings = {
    beginner: { time: 8, maxFret: 5 },
    intermediate: { time: 6, maxFret: 12 },
    advanced: { time: 4, maxFret: 15 },
    expert: { time: 3, maxFret: 22 }
  };

  const getNoteAtFret = (string, fret) => {
    const openNote = stringTuning[string];
    const openNoteIndex = notes.indexOf(openNote);
    const noteIndex = (openNoteIndex + fret) % 12;
    return notes[noteIndex];
  };

  const findNotePossitions = (note, strings) => {
    const positions = [];
    const maxFret = difficultySettings[difficulty].maxFret;
    
    strings.forEach(string => {
      for (let fret = 0; fret <= maxFret; fret++) {
        if (getNoteAtFret(string, fret) === note) {
          positions.push({ string, fret });
        }
      }
    });
    return positions;
  };

  const generateChallenge = () => {
    if (selectedStrings.length === 0) return;
    
    // Start the game if it's not already started
    if (gameState === 'idle') {
      setGameState('playing');
      setGameStartTime(new Date());
    }
    
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const availableStrings = selectedStrings.filter(string => {
      const positions = findNotePossitions(randomNote, [string]);
      return positions.length > 0;
    });
    
    if (availableStrings.length === 0) {
      generateChallenge(); // Try again
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
  };

  const handleStringToggle = (string) => {
    setSelectedStrings(prev => 
      prev.includes(string) 
        ? prev.filter(s => s !== string)
        : [...prev, string].sort((a, b) => b - a)
    );
  };

  const handleCorrect = () => {
    setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    setIsActive(false);
    setAwaitingUserResponse(false);
    setTimeout(() => generateChallenge(), 1500);
  };

  const handleIncorrect = () => {
    setScore(prev => ({ correct: prev.correct, total: prev.total + 1 }));
    setIsActive(false);
    setAwaitingUserResponse(false);
    setTimeout(() => generateChallenge(), 1500);
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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
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

  const getAccuracy = () => {
    return score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🎸 Fretboard Master</h1>
          <div className="flex justify-between items-center text-white/80">
            <div className="text-sm">
              Score: {score.correct}/{score.total} ({getAccuracy()}%)
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Game End Summary */}
        {gameState === 'ended' && (
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">🎉 Game Complete!</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
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
              {getAccuracy() >= 90 ? "🔥 Excellent work!" :
               getAccuracy() >= 75 ? "👏 Great job!" :
               getAccuracy() >= 60 ? "👍 Good effort!" :
               "💪 Keep practicing!"}
            </div>

            <button
              onClick={startNewGame}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play size={20} />
              Start New Game
            </button>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/20">
            <h3 className="text-white font-semibold mb-3">Settings</h3>
            
            {/* Difficulty */}
            <div className="mb-4">
              <label className="text-white/80 text-sm block mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/30"
              >
                <option value="beginner">Beginner (8s, 0-5 frets)</option>
                <option value="intermediate">Intermediate (6s, 0-12 frets)</option>
                <option value="advanced">Advanced (4s, 0-15 frets)</option>
                <option value="expert">Expert (3s, 0-22 frets)</option>
              </select>
            </div>

            {/* String Selection */}
            <div className="mb-4">
              <label className="text-white/80 text-sm block mb-2">Practice Strings</label>
              <div className="grid grid-cols-2 gap-2">
                {[6, 5, 4, 3, 2, 1].map(string => (
                  <button
                    key={string}
                    onClick={() => handleStringToggle(string)}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      selectedStrings.includes(string)
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {stringNames[string]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedStrings([1, 2, 3, 4, 5, 6])}
                className="px-3 py-1 bg-green-500/20 text-green-300 rounded text-sm hover:bg-green-500/30 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={resetScore}
                className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-sm hover:bg-red-500/30 transition-colors"
              >
                Reset Score
              </button>
            </div>
          </div>
        )}

        {/* Main Practice Area */}
        {gameState !== 'ended' && (
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/20">
            {currentNote ? (
              <>
                {/* Current Challenge */}
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-white mb-2">{currentNote}</div>
                  <div className="text-xl text-white/80 mb-4">
                    Play on {stringNames[currentString]}
                  </div>
                  
                  {/* Timer */}
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-blue-400 border-t-transparent transition-all duration-1000 ease-linear"
                      style={{
                        transform: `rotate(${((difficultySettings[difficulty].time - timeLeft) / difficultySettings[difficulty].time) * 360}deg)`
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{timeLeft}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {awaitingUserResponse && (
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={handleCorrect}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} />
                      Got it!
                    </button>
                    <button
                      onClick={handleIncorrect}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={20} />
                      Missed it
                    </button>
                  </div>
                )}

                {/* Show Answer */}
                {(showAnswer || timeLeft === 0) && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <div className="text-center text-white">
                      <div className="text-lg font-semibold mb-2">Answer:</div>
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
                <div className="text-white/60 mb-4">Ready to practice?</div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-3">
              <button
                onClick={generateChallenge}
                disabled={selectedStrings.length === 0}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Play size={20} />
                {currentNote ? 'Next Note' : 'Start Practice'}
              </button>
              
              {isActive && (
                <button
                  onClick={() => {
                    setIsActive(false);
                    setShowAnswer(true);
                    setAwaitingUserResponse(true);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Show Answer
                </button>
              )}

              {gameState === 'playing' && (
                <button
                  onClick={endGame}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  End Game
                </button>
              )}
            </div>

            {selectedStrings.length === 0 && (
              <div className="text-center text-red-300 text-sm mt-3">
                Please select at least one string to practice
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {score.total > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
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
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-black/20 backdrop-blur-md rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2">💡 Practice Tips</h3>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• Start with beginner mode to learn note positions</li>
            <li>• Focus on one or two strings at first</li>
            <li>• Use a metronome while practicing</li>
            <li>• Try to visualize the fretboard in your mind</li>
            <li>• Practice regularly for better muscle memory</li>
          </ul>
        </div>

        {/* Contact/Feedback Button */}
        <div className="mt-6 text-center">
          <a
            href="https://sharmatushar1.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            💬 Suggestions or Feedback?
          </a>
        </div>
      </div>
      <Analytics />
    </div>
  );
};

export default GuitarPracticeApp;