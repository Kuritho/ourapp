import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import FlappyLoveBird from '../../games/FlappyLoveBird/FlappyLoveBird';
import Sudoku from '../../games/Sudoku/Sudoku';
import './Games.css';

const Games = () => {
  const { profile } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [gameScores, setGameScores] = useState(null);

  const games = [
    {
      id: 'flappy',
      name: 'Flappy Love Bird',
      icon: '🐦',
      description: 'Fly through the pipes and earn rewards!',
      color: '#e8a0b4'
    },
    {
      id: 'sudoku',
      name: 'Love Sudoku',
      icon: '🧩',
      description: 'Solve puzzles and win delicious rewards!',
      color: '#4a8a6a'
    }
  ];

  const handleGameSelect = (gameId) => {
    setActiveGame(gameId);
  };

  const handleGameComplete = (result) => {
    setGameScores(result);
  };

  const renderGame = () => {
    switch (activeGame) {
      case 'flappy':
        return (
          <FlappyLoveBird
            playerName={profile?.full_name || 'Player'}
            onGameComplete={handleGameComplete}
          />
        );
      case 'sudoku':
        return (
          <Sudoku
            playerName={profile?.full_name || 'Player'}
            onGameComplete={handleGameComplete}
          />
        );
      default:
        return null;
    }
  };

  if (activeGame) {
    return (
      <div className="games-page game-active">
        <button 
          className="back-to-games"
          onClick={() => setActiveGame(null)}
        >
          ← Back to Games
        </button>
        <div className="game-container">
          {renderGame()}
        </div>
      </div>
    );
  }

  return (
    <div className="games-page">
      <div className="games-header">
        <h1>🎮 Games & Rewards</h1>
        <p>Play, have fun, and earn rewards for our love!</p>
      </div>

      <div className="games-grid">
        {games.map((game) => (
          <div
            key={game.id}
            className="game-select-card"
            onClick={() => handleGameSelect(game.id)}
            style={{ '--game-color': game.color }}
          >
            <div className="game-select-icon">{game.icon}</div>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
            <button className="play-btn">Play Now →</button>
          </div>
        ))}
      </div>

      <div className="games-info">
        <div className="info-card">
          <h4>💖 How it Works</h4>
          <ul>
            <li>Play games to earn rewards</li>
            <li>Flappy Love Bird: Score 500+ for a special reward</li>
            <li>Love Sudoku: Complete puzzles for snacks, food, or restaurants</li>
            <li>All rewards are claimable with a digital receipt</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Games;