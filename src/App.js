import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import songsData from './songs.json';
import './styles.css';

export default function App() {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [skipCount, setSkipCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playedSongs, setPlayedSongs] = useState([]);
  const MAX_GUESSES = 6;
  const SKIP_INCREMENTS = [1, 2, 4, 7, 11, 16]; // seconds to reveal after each skip
  
  // Create options for react-select from songs data
  const songOptions = songsData.map(song => ({
    value: song.name,
    label: `${song.name} - ${song.artist}`
  }));

  // Load played songs from localStorage on component mount
  useEffect(() => {
    const storedPlayedSongs = localStorage.getItem('playedSongs');
    if (storedPlayedSongs) {
      setPlayedSongs(JSON.parse(storedPlayedSongs));
    }
  }, []);

  // Pick a random unplayed song
  const getRandomUnplayedSong = () => {
    const unplayedSongs = songsData.filter(song => 
      !playedSongs.includes(song.id)
    );
    
    // If all songs have been played, reset the played songs list
    if (unplayedSongs.length === 0) {
      setPlayedSongs([]);
      return songsData[Math.floor(Math.random() * songsData.length)];
    }
    
    const randomIndex = Math.floor(Math.random() * unplayedSongs.length);
    return unplayedSongs[randomIndex];
  };

  useEffect(() => {
    // Pick a random unplayed song when the component mounts
    const songToPlay = getRandomUnplayedSong();
    setCurrentSong(songToPlay);
  }, []);

  useEffect(() => {
    if (isReady) return;

    // Check if the iframe is ready
    const iframe = iframeRef.current;
    if (!iframe) return;

    const widget = SC.Widget(iframe);
    widget.bind(SC.Widget.Events.READY, () => {
      setIsReady(true);
    });

    // Cleanup function to remove the event listener
    return () => {
      if (widget) {
        widget.unbind(SC.Widget.Events.READY);
      }
    };
  });

  // Helper function to remove non-alpha characters
  const normalizeString = (str) => {
    return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
  };

  const handleGuess = () => {
    if ((!selectedOption && !userInput.trim()) || gameState !== 'playing') return;
    
    // Use selected option value if available, otherwise use input text
    const guessValue = selectedOption ? selectedOption.value : userInput;
    const newGuesses = [...guesses, guessValue];
    setGuesses(newGuesses);
    setUserInput('');
    setSelectedOption(null);

    // Check if the guess is correct using normalized strings
    const normalizedGuess = normalizeString(guessValue);
    const normalizedAnswer = normalizeString(currentSong.name);
    
    if (normalizedGuess === normalizedAnswer) {
      setGameState('won');
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameState('lost');
    }
  };

  const handleSkip = () => {
    if (gameState !== 'playing' || skipCount >= MAX_GUESSES - 1) return;

    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);

    // If they've used all skips, they lose
    if (newSkipCount >= MAX_GUESSES) {
      setGameState('lost');
    }
  };

  const giveUp = () => {
    setGameState('lost');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleGuess();
    }
  };

  const resetGame = () => {
    // Add current song to played songs if it exists
    if (currentSong) {
      const newPlayedSongs = [...playedSongs, currentSong.id];
      setPlayedSongs(newPlayedSongs);
      // Save to localStorage
      localStorage.setItem('playedSongs', JSON.stringify(newPlayedSongs));
    }
    
    // Get a new unplayed song
    const newSong = getRandomUnplayedSong();
    setCurrentSong(newSong);
    setGuesses([]);
    setUserInput('');
    setSelectedOption(null);
    setGameState('playing');
    setSkipCount(0);
  };

  // Function to format the player URL
  const getPlayerUrl = () => {
    if (!currentSong) return '';
    return `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${currentSong.id}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&start_track=0&single_active=true`;
  };

  // Calculate how many seconds to reveal based on skip count
  const getRevealTime = () => {
    // if (skipCount === 0) return 1;
    return SKIP_INCREMENTS[skipCount];
  };

  return (
    <div className="heardle-app">
      <header>
        <h1>ArenaBeats</h1>
        <p>Guess the NZ song from the intro</p>
      </header>

      <div className="game-container">
        {currentSong && (
          <>
            <div className="player-container">
              <iframe
                ref={iframeRef}
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={getPlayerUrl()}
                style={{ display: 'none' }}
              ></iframe>

              <div className="player-placeholder">
                <p>
                  Listening to first {getRevealTime()} second
                  {getRevealTime() > 1 ? 's' : ''}
                </p>
                <div className="audio-controls">
                  <button
                    onClick={() => {
                      const iframe = document.querySelector('iframe');
                      const widget = SC.Widget(iframe);
                        widget.seekTo(0);
                        let hasScheduledPause = false;
                        widget.bind(SC.Widget.Events.PLAY_PROGRESS, () => {
                        if (!hasScheduledPause) {
                          hasScheduledPause = true;
                          setTimeout(() => {
                            widget.pause();
                            setIsPlaying(false);
                          }, getRevealTime() * 1000);
                        }
                      });
                      widget.play();
                      setIsPlaying(true);
                    }}
                    className={`play-button ${isPlaying ? 'playing ' : ''}`}
                    disabled={isPlaying || !isReady}
                  >
                    {isPlaying && (
                      <span className="gg-loadbar-sound" />
                    )}
                    {!isPlaying && isReady && (
                      <span className="gg-play-button" />
                    )}
                    {!isReady && <span className="gg-spinner-two-alt" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="guess-container">
              {gameState === 'playing' && (
                <>
                  <div className="input-container">
                    <Select
                      className="react-select-container"
                      classNamePrefix="react-select"
                      options={songOptions}
                      value={selectedOption}
                      onChange={setSelectedOption}
                      onInputChange={(inputValue) => setUserInput(inputValue)}
                      inputValue={userInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleGuess();
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter your guess..."
                      isDisabled={gameState !== 'playing'}
                      isClearable
                      isSearchable
                    />
                    <button onClick={handleGuess} disabled={!selectedOption && !userInput.trim()}>
                      Guess
                    </button>
                    <button
                      onClick={handleSkip}
                      className="skip-button"
                      disabled={skipCount >= MAX_GUESSES - 1}
                    >
                      {skipCount < MAX_GUESSES - 1
                        ? `Skip ${SKIP_INCREMENTS[skipCount]}s`
                        : (
                          <span className="gg-close" />
                        )
                      }
                    </button>
                    <button
                      onClick={giveUp}
                    >
                      Give Up
                    </button>
                  </div>
                  <div className="skip-progress">
                    <div 
                      className="skip-progress-bar" 
                      style={{ width: `${skipCount > 0 ? (SKIP_INCREMENTS[skipCount - 1] / SKIP_INCREMENTS[MAX_GUESSES - 2]) * 100 : 0}%` }}
                    ></div>
                  </div>
                </>
              )}

              <div className="guesses-list">
                {guesses.reverse().map((guess, index) => (
                  <div
                    key={index}
                    className={`guess-item ${
                      normalizeString(guess) === normalizeString(currentSong?.name) ? 'correct' : 'incorrect'
                    }`}
                  >
                    <div>
                      {guess}
                    </div>
                    <div>
                      &times;
                    </div>
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
