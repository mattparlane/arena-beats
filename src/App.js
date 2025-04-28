import React, { useState, useEffect } from 'react';
import songsData from './songs.json';
import './styles.css';

export default function App() {
  const [currentSong, setCurrentSong] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [showPlayer, setShowPlayer] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const MAX_GUESSES = 6;
  const SKIP_INCREMENTS = [1, 2, 4, 7, 11, 16]; // seconds to reveal after each skip

  useEffect(() => {
    // Pick a random song when the component mounts
    const randomIndex = Math.floor(Math.random() * songsData.length);
    setCurrentSong(songsData[randomIndex]);
  }, []);

  const handleGuess = () => {
    if (!userInput.trim() || gameState !== 'playing') return;

    const newGuesses = [...guesses, userInput];
    setGuesses(newGuesses);
    setUserInput('');

    // Check if the guess is correct (case insensitive)
    if (userInput.toLowerCase() === currentSong.name.toLowerCase()) {
      setGameState('won');
      setShowPlayer(true);
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameState('lost');
      setShowPlayer(true);
    }
  };

  const handleSkip = () => {
    if (gameState !== 'playing' || skipCount >= MAX_GUESSES - 1) return;

    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);

    // If they've used all skips, they lose
    if (newSkipCount >= MAX_GUESSES) {
      setGameState('lost');
      setShowPlayer(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleGuess();
    }
  };

  const resetGame = () => {
    const randomIndex = Math.floor(Math.random() * songsData.length);
    setCurrentSong(songsData[randomIndex]);
    setGuesses([]);
    setUserInput('');
    setGameState('playing');
    setShowPlayer(false);
    setSkipCount(0);
  };

  // Function to format the player URL
  const getPlayerUrl = () => {
    if (!currentSong) return '';
    return `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${currentSong.id}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&start_track=0&single_active=true`;
  };

  // Calculate how many seconds to reveal based on skip count
  const getRevealTime = () => {
    if (skipCount === 0) return 1;
    return SKIP_INCREMENTS[skipCount - 1];
  };

  return (
    <div className="heardle-app">
      <header>
        <h1>Porirdle</h1>
        <p>Guess the NZ song from the intro</p>
      </header>

      <div className="game-container">
        {currentSong && (
          <>
            <div className="player-container">
              <iframe
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={getPlayerUrl()}
                title="SoundCloud Player"
                style={{
                  // visibility: 'hidden',
                  display: 'none',
                }}
              ></iframe>

              <div className="player-placeholder">
                <p>Listening to first {getRevealTime()} seconds</p>
                <div className="audio-controls">
                  <button
                    onClick={() => {
                      const iframe = document.querySelector('iframe');
                      const widget = SC.Widget(iframe);
                      widget.bind(SC.Widget.Events.PLAY_PROGRESS, () => {
                        console.log('Started playing');
                        setTimeout(() => {
                          console.log('Pausing');
                          widget.pause();
                        }, getRevealTime() * 1000);
                      });
                      widget.play();
                    }}
                    className="play-button"
                  >
                    Play
                  </button>
                </div>
              </div>
            </div>

            <div className="guess-container">
              {gameState === 'playing' && (
                <div className="input-container">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your guess..."
                    disabled={gameState !== 'playing'}
                  />
                  <button onClick={handleGuess} disabled={!userInput.trim()}>
                    Submit
                  </button>
                  <button onClick={handleSkip} className="skip-button">
                    Skip (+{skipCount < MAX_GUESSES - 1 ? SKIP_INCREMENTS[skipCount] - (skipCount > 0 ? SKIP_INCREMENTS[skipCount - 1] : 0) : 0}s)
                  </button>
                </div>
              )}

              <div className="guesses-list">
                {guesses.map((guess, index) => (
                  <div
                    key={index}
                    className={`guess-item ${
                      guess.toLowerCase() === currentSong?.name.toLowerCase() ? 'correct' : 'incorrect'
                    }`}
                  >
                    {guess}
                  </div>
                ))}
              </div>

              {gameState === 'won' && (
                <div className="result-message success">
                  <h2>Congratulations!</h2>
                  <p>You guessed the song in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!</p>
                  <button onClick={resetGame} className="reset-button">
                    Play Again
                  </button>
                </div>
              )}

              {gameState === 'lost' && (
                <div className="result-message failure">
                  <h2>Game Over</h2>
                  <p>The song was "{currentSong.name}" by {currentSong.artist}</p>
                  <button onClick={resetGame} className="reset-button">
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <footer>
        <p>
          Song count: {songsData.length} |
          Attempts: {MAX_GUESSES}
        </p>
      </footer>
    </div>
  );
}
