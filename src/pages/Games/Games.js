import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import FlappyLoveBird from '../../games/FlappyLoveBird/FlappyLoveBird';
import Sudoku from '../../games/Sudoku/Sudoku';

const Games = () => {
  const { user, profile } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [gameScores, setGameScores] = useState(null);
  const [topScores, setTopScores] = useState({});
  const [loading, setLoading] = useState(true);

  const games = [
    {
      id: 'flappy',
      name: 'Flappy Love Bird',
      icon: '🐦',
      description: 'Fly through the pipes and earn rewards!',
      color: '#38bdf8',
      reward: '500 points = Special Reward ❤️'
    },
    {
      id: 'sudoku',
      name: 'Love Sudoku',
      icon: '🧩',
      description: 'Solve puzzles and win delicious rewards!',
      color: '#2dd4bf',
      reward: 'Complete to earn snacks, food, or restaurants!'
    }
  ];

  useEffect(() => {
    fetchTopScores();
  }, []);

  const fetchTopScores = async () => {
    setLoading(true);
    try {
      // Get Flappy Love Bird ID
      const { data: flappyGame } = await supabase
        .from('games')
        .select('id')
        .eq('name', 'Flappy Love Bird')
        .single();

      // Get Love Sudoku ID
      const { data: sudokuGame } = await supabase
        .from('games')
        .select('id')
        .eq('name', 'Love Sudoku')
        .single();

      const scores = {};

      // Fetch Flappy top score
      if (flappyGame) {
        const { data: flappyScores } = await supabase
          .from('game_attempts')
          .select('score, profiles(full_name, avatar_url)')
          .eq('game_id', flappyGame.id)
          .order('score', { ascending: false })
          .limit(5);

        if (flappyScores && flappyScores.length > 0) {
          scores.flappy = flappyScores;
        }
      }

      // Fetch Sudoku top scores for each difficulty
      if (sudokuGame) {
        const { data: sudokuScores } = await supabase
          .from('game_attempts')
          .select('score, difficulty, completion_time, profiles(full_name, avatar_url)')
          .eq('game_id', sudokuGame.id)
          .order('completion_time', { ascending: true })
          .limit(5);

        if (sudokuScores && sudokuScores.length > 0) {
          scores.sudoku = sudokuScores;
        }
      }

      setTopScores(scores);
    } catch (error) {
      console.error('Error fetching top scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameSelect = (gameId) => {
    setActiveGame(gameId);
  };

  const handleGameComplete = (result) => {
    setGameScores(result);
    // Refresh top scores after game completion
    fetchTopScores();
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const getDifficultyLabel = (difficulty) => {
    if (!difficulty) return 'Any';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
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
      <div style={{ padding: '0' }}>
        <button 
          onClick={() => setActiveGame(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '12px 0',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}
        >
          ← Back to Games
        </button>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--border-radius)',
          overflow: 'hidden',
          minHeight: '500px',
          border: '1px solid var(--border-color)'
        }}>
          {renderGame()}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading games...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '32px',
        background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.06), transparent)',
        borderRadius: 'var(--border-radius)'
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 36px)',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          🎮 Games & Rewards
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '16px'
        }}>
          Play, have fun, and earn rewards for our love!
        </p>
      </div>

      {/* Top Scores Section */}
      {(topScores.flappy || topScores.sudoku) && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: 'clamp(18px, 2vw, 22px)',
            fontWeight: '600',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            padding: '0 4px'
          }}>
            <span>🏆</span> Leaderboard
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {/* Flappy Love Bird Top Scores */}
            {topScores.flappy && topScores.flappy.length > 0 && (
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--border-radius)',
                padding: '20px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-light)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px'
                }}>
                  <span style={{ fontSize: '28px' }}>🐦</span>
                  <div>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>Flappy Love Bird</h4>
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}>Top 5 Highest Scores</p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {topScores.flappy.map((score, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 12px',
                      background: index < 3 ? `rgba(255, 215, 0, ${0.08 - index * 0.02})` : 'rgba(10, 14, 26, 0.4)',
                      borderRadius: '8px',
                      border: index === 0 ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '18px', minWidth: '30px' }}>{getMedal(index)}</span>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--gradient-1)',
                        flexShrink: 0
                      }}>
                        {score.profiles?.avatar_url ? (
                          <img src={score.profiles.avatar_url} alt={score.profiles.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#fff',
                            fontWeight: '600'
                          }}>
                            {score.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: 'var(--text-primary)'
                        }}>
                          {score.profiles?.full_name || 'Anonymous'}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--primary)'
                      }}>
                        {score.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Love Sudoku Top Scores */}
            {topScores.sudoku && topScores.sudoku.length > 0 && (
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--border-radius)',
                padding: '20px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-light)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px'
                }}>
                  <span style={{ fontSize: '28px' }}>🧩</span>
                  <div>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>Love Sudoku</h4>
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}>Fastest Completion Times</p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {topScores.sudoku.map((score, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 12px',
                      background: index < 3 ? `rgba(255, 215, 0, ${0.08 - index * 0.02})` : 'rgba(10, 14, 26, 0.4)',
                      borderRadius: '8px',
                      border: index === 0 ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '18px', minWidth: '30px' }}>{getMedal(index)}</span>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--gradient-1)',
                        flexShrink: 0
                      }}>
                        {score.profiles?.avatar_url ? (
                          <img src={score.profiles.avatar_url} alt={score.profiles.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#fff',
                            fontWeight: '600'
                          }}>
                            {score.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: 'var(--text-primary)'
                        }}>
                          {score.profiles?.full_name || 'Anonymous'}
                        </div>
                        {score.difficulty && (
                          <div style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)'
                          }}>
                            {getDifficultyLabel(score.difficulty)}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: 'var(--secondary)'
                      }}>
                        {score.completion_time || `${score.score}pts`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Games Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {games.map((game) => (
          <div
            key={game.id}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--border-radius)',
              padding: '32px 24px',
              textAlign: 'center',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: 'var(--shadow-light)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = game.color;
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-light)';
            }}
            onClick={() => handleGameSelect(game.id)}
          >
            <div style={{
              fontSize: '56px',
              marginBottom: '12px',
              display: 'block'
            }}>
              {game.icon}
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              {game.name}
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '12px'
            }}>
              {game.description}
            </p>
            <div style={{
              display: 'inline-block',
              padding: '4px 16px',
              background: `rgba(56, 189, 248, 0.08)`,
              borderRadius: '20px',
              fontSize: '12px',
              color: 'var(--primary)',
              marginBottom: '16px'
            }}>
              {game.reward}
            </div>
            <button
              style={{
                padding: '10px 32px',
                background: `linear-gradient(135deg, ${game.color}, ${game.color}dd)`,
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'var(--transition)',
                width: '100%'
              }}
            >
              Play Now →
            </button>
          </div>
        ))}
      </div>

      {/* How it Works Section */}
      <div style={{
        marginTop: '32px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--border-radius)',
        padding: '24px',
        border: '1px solid var(--border-color)'
      }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💖 How it Works
        </h4>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <li style={{
            padding: '12px',
            background: 'rgba(56, 189, 248, 0.04)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}>
            <span style={{ fontSize: '20px' }}>🐦</span>
            Flappy Love Bird: Score 500+ for a special reward
          </li>
          <li style={{
            padding: '12px',
            background: 'rgba(56, 189, 248, 0.04)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}>
            <span style={{ fontSize: '20px' }}>🧩</span>
            Love Sudoku: Complete puzzles for snacks, food, or restaurants
          </li>
          <li style={{
            padding: '12px',
            background: 'rgba(56, 189, 248, 0.04)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}>
            <span style={{ fontSize: '20px' }}>🎁</span>
            All rewards are claimable with a digital receipt
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Games;