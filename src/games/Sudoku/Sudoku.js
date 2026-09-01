import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const Sudoku = ({ playerName, onGameComplete }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [initialBoard, setInitialBoard] = useState([]);
  const [solution, setSolution] = useState([]);
  const [difficulty, setDifficulty] = useState('easy');
  const [selectedCell, setSelectedCell] = useState(null);
  const [timer, setTimer] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameId, setGameId] = useState(null);

  const difficulties = {
    easy: { cellsToRemove: 30, rewardCategory: 'snack' },
    normal: { cellsToRemove: 45, rewardCategory: 'food' },
    expert: { cellsToRemove: 55, rewardCategory: 'restaurant' }
  };

  // Load game ID
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const { data: gameData, error } = await supabase
          .from('games')
          .select('id')
          .eq('name', 'Love Sudoku')
          .maybeSingle();

        if (error) {
          console.error('Error fetching game:', error);
          setLoading(false);
          return;
        }

        if (!gameData) {
          console.error('Love Sudoku game not found in database');
          setLoading(false);
          return;
        }

        setGameId(gameData.id);
        setLoading(false);
      } catch (error) {
        console.error('Error loading game data:', error);
        setLoading(false);
      }
    };

    loadGameData();
  }, []);

  // Generate valid Sudoku board
  const generateSudoku = useCallback((removeCount) => {
    const baseBoard = Array(9).fill(null).map(() => Array(9).fill(0));
    
    // Fill diagonal 3x3 boxes first
    for (let box = 0; box < 9; box += 3) {
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const idx = Math.floor(Math.random() * nums.length);
          baseBoard[box + i][box + j] = nums[idx];
          nums.splice(idx, 1);
        }
      }
    }

    // Solve the rest using backtracking
    const solveSudoku = (board) => {
      const findEmpty = () => {
        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) return [i, j];
          }
        }
        return null;
      };

      const isValid = (board, row, col, num) => {
        for (let i = 0; i < 9; i++) {
          if (board[row][i] === num) return false;
          if (board[i][col] === num) return false;
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
          for (let j = boxCol; j < boxCol + 3; j++) {
            if (board[i][j] === num) return false;
          }
        }
        return true;
      };

      const solve = (board) => {
        const empty = findEmpty();
        if (!empty) return true;
        const [row, col] = empty;
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        while (nums.length > 0) {
          const idx = Math.floor(Math.random() * nums.length);
          const num = nums[idx];
          nums.splice(idx, 1);
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solve(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      };

      solve(board);
    };

    solveSudoku(baseBoard);
    const solved = baseBoard.map(row => [...row]);

    // Remove cells
    const positions = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        positions.push([i, j]);
      }
    }

    // Shuffle and remove cells
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < removeCount && i < positions.length; i++) {
      const [row, col] = positions[i];
      baseBoard[row][col] = 0;
    }

    return { board: baseBoard, solution: solved };
  }, []);

  // Load rewards for difficulty
  const loadRewards = async (category) => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setAvailableRewards(data || []);
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  // Start new game
  const startNewGame = (diff) => {
    const removeCount = difficulties[diff].cellsToRemove;
    const { board, solution } = generateSudoku(removeCount);
    setBoard(board);
    setInitialBoard(board.map(row => [...row]));
    setSolution(solution);
    setDifficulty(diff);
    setSelectedCell(null);
    setTimer(0);
    setMistakes(0);
    setIsComplete(false);
    setGameStarted(true);
    setShowRewards(false);
    setSelectedReward(null);
    setShowConfirm(false);
    setAvailableRewards([]);
  };

  // Handle cell selection
  const handleCellClick = (row, col) => {
    if (isComplete || !gameStarted) return;
    if (initialBoard[row][col] !== 0) return;
    setSelectedCell([row, col]);
  };

  // Handle number input
  const handleNumberInput = (num) => {
    if (!selectedCell || isComplete || !gameStarted) return;
    const [row, col] = selectedCell;
    if (initialBoard[row][col] !== 0) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = num;
    setBoard(newBoard);

    // Check if complete
    const isBoardComplete = newBoard.every(row => row.every(cell => cell !== 0));
    if (isBoardComplete) {
      setIsComplete(true);
      handleSudokuComplete();
    }
  };

  // Handle Sudoku complete
  const handleSudokuComplete = async () => {
    if (!user || !gameId) return;

    try {
      // Get profile ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        console.error('Profile not found');
        return;
      }

      const { data, error } = await supabase
        .from('game_attempts')
        .insert({
          user_id: profileData.id,
          game_id: gameId,
          difficulty: difficulty,
          completion_time: `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`,
          completed_at: new Date().toISOString(),
          reward_eligible: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving Sudoku completion:', error);
        return;
      }

      // Load rewards for this difficulty
      const category = difficulties[difficulty].rewardCategory;
      await loadRewards(category);
      setShowRewards(true);

      if (onGameComplete) {
        onGameComplete({ 
          difficulty: difficulty,
          time: timer,
          rewards: category
        });
      }
    } catch (error) {
      console.error('Error saving Sudoku completion:', error);
    }
  };

  // Claim reward
  const claimReward = async () => {
    if (!selectedReward || !user || !gameId) return;

    setClaiming(true);
    try {
      // Get profile ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        alert('Profile not found');
        setClaiming(false);
        return;
      }

      // Get the latest game attempt
      const { data: gameAttempt } = await supabase
        .from('game_attempts')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('game_id', gameId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (!gameAttempt) {
        alert('No game attempt found');
        setClaiming(false);
        return;
      }

      // Check if already claimed
      const { data: existingClaim } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('game_attempt_id', gameAttempt.id)
        .maybeSingle();

      if (existingClaim) {
        alert('Reward already claimed for this game!');
        setShowConfirm(false);
        setClaiming(false);
        return;
      }

      const { data: claim, error } = await supabase
        .from('reward_claims')
        .insert({
          user_id: profileData.id,
          reward_id: selectedReward.id,
          game_attempt_id: gameAttempt.id,
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Generate receipt
      const { error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: profileData.id,
          reward_claim_id: claim.id,
          game_name: 'Love Sudoku',
          score: `Difficulty: ${difficulty}, Time: ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`,
          reward_name: selectedReward.name,
          status: 'claimed'
        });

      if (receiptError) throw receiptError;

      setShowConfirm(false);
      setShowRewards(false);
      setClaiming(false);

      if (onGameComplete) {
        onGameComplete({ 
          difficulty: difficulty,
          time: timer,
          reward: selectedReward.name
        });
      }

      alert('🎉 Reward claimed successfully! Check your rewards page.');
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Error claiming reward: ' + error.message);
      setClaiming(false);
    }
  };

  // Timer
  useEffect(() => {
    let interval;
    if (gameStarted && !isComplete && !showRewards) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, isComplete, showRewards]);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Check if cell is valid
  const isValidMove = (row, col, num) => {
    if (num === 0) return true;
    // Check row
    for (let i = 0; i < 9; i++) {
      if (i !== col && board[row][i] === num) return false;
    }
    // Check column
    for (let i = 0; i < 9; i++) {
      if (i !== row && board[i][col] === num) return false;
    }
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if (i !== row && j !== col && board[i][j] === num) return false;
      }
    }
    return true;
  };

  // Render cell
  const renderCell = (row, col) => {
    const value = board[row][col];
    const isInitial = initialBoard[row][col] !== 0;
    const isSelected = selectedCell && selectedCell[0] === row && selectedCell[1] === col;
    const isInvalid = !isInitial && value !== 0 && !isValidMove(row, col, value);

    return (
      <div
        key={`${row}-${col}`}
        style={{
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: isInitial ? '700' : '500',
          background: isSelected ? 'rgba(232, 160, 180, 0.15)' : '#1e1e1e',
          color: isInitial ? '#b0aca6' : isInvalid ? '#ff4444' : '#f0ece6',
          cursor: isInitial ? 'default' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isSelected ? 'inset 0 0 0 2px #e8a0b4' : 'none',
          borderRight: col === 2 || col === 5 ? '2px solid rgba(42, 90, 58, 0.4)' : '1px solid rgba(42, 90, 58, 0.1)',
          borderBottom: row === 2 || row === 5 ? '2px solid rgba(42, 90, 58, 0.4)' : '1px solid rgba(42, 90, 58, 0.1)',
        }}
        onClick={() => handleCellClick(row, col)}
      >
        {value !== 0 ? value : ''}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '500px',
        gap: '16px',
        background: '#1a1a2e',
        borderRadius: '16px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #1e1e1e',
          borderTopColor: '#e8a0b4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#b0aca6' }}>Loading Love Sudoku...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!gameId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '40px'
      }}>
        <p style={{ color: '#e8a0b4', fontSize: '24px' }}>😅 Oops!</p>
        <p style={{ color: '#b0aca6', textAlign: 'center' }}>
          The Sudoku game is not configured yet.<br />
          Please contact the admin to set up the game.
        </p>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <h2 style={{ fontSize: '32px', color: '#f0ece6', marginBottom: '8px' }}>🧩 Love Sudoku</h2>
        <p style={{ color: '#b0aca6', marginBottom: '24px' }}>Choose difficulty to start</p>
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => startNewGame('easy')}
            style={{
              padding: '12px 24px',
              background: '#2a5a3a',
              border: 'none',
              borderRadius: '8px',
              color: '#f0ece6',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Easy 🍫
          </button>
          <button
            onClick={() => startNewGame('normal')}
            style={{
              padding: '12px 24px',
              background: '#8a6a3a',
              border: 'none',
              borderRadius: '8px',
              color: '#f0ece6',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Normal 🍔
          </button>
          <button
            onClick={() => startNewGame('expert')}
            style={{
              padding: '12px 24px',
              background: '#6a2a2a',
              border: 'none',
              borderRadius: '8px',
              color: '#f0ece6',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Expert 🍽️
          </button>
        </div>
        <div style={{ color: '#b0aca6', fontSize: '14px' }}>
          <p>Complete the puzzle to earn rewards!</p>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#e8a0b4' }}>
            Easy → Snacks · Normal → Food · Expert → Restaurant
          </p>
        </div>
      </div>
    );
  }

  if (showRewards) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '28px', color: '#f0ece6', marginBottom: '8px' }}>🎉 Sudoku Complete!</h2>
        <p style={{ color: '#b0aca6' }}>Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</p>
        <p style={{ color: '#b0aca6', marginBottom: '20px' }}>Time: {formatTime(timer)}</p>
        <h3 style={{ color: '#f0ece6', fontWeight: '400', marginBottom: '16px' }}>Choose your reward:</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {availableRewards.map((reward) => (
            <div
              key={reward.id}
              style={{
                background: selectedReward?.id === reward.id ? 'rgba(232, 160, 180, 0.15)' : '#1e1e1e',
                padding: '16px',
                borderRadius: '16px',
                border: selectedReward?.id === reward.id ? '2px solid #e8a0b4' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setSelectedReward(reward)}
            >
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                {difficulty === 'easy' ? '🍫' : difficulty === 'normal' ? '🍔' : '🍽️'}
              </div>
              <h4 style={{ fontSize: '16px', color: '#f0ece6', marginBottom: '4px' }}>{reward.name}</h4>
              <p style={{ fontSize: '12px', color: '#b0aca6' }}>{reward.description}</p>
            </div>
          ))}
        </div>
        {selectedReward && (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #1a3a2a, #2a5a3a)',
              border: 'none',
              borderRadius: '8px',
              color: '#f0ece6',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Select Reward
          </button>
        )}
        {showConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#1e1e1e',
              padding: '32px',
              borderRadius: '16px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              border: '1px solid rgba(42, 90, 58, 0.3)'
            }}>
              <h3 style={{ color: '#f0ece6', marginBottom: '12px' }}>Confirm Selection</h3>
              <p style={{ color: '#b0aca6' }}>You selected:</p>
              <h4 style={{ color: '#e8a0b4', fontSize: '20px', margin: '8px 0 16px' }}>{selectedReward?.name}</h4>
              <p style={{ color: '#b0aca6' }}>Are you sure?</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    padding: '10px 24px',
                    background: 'none',
                    border: '1px solid rgba(42, 90, 58, 0.3)',
                    borderRadius: '8px',
                    color: '#b0aca6',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={claimReward}
                  disabled={claiming}
                  style={{
                    padding: '10px 24px',
                    background: '#e8a0b4',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0a0a0a',
                    fontWeight: '600',
                    cursor: claiming ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: claiming ? 0.6 : 1
                  }}
                >
                  {claiming ? 'Confirming...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isComplete) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <h2 style={{ fontSize: '32px', color: '#f0ece6', marginBottom: '12px' }}>🎉 Sudoku Complete!</h2>
        <p style={{ color: '#b0aca6' }}>Time: {formatTime(timer)}</p>
        <p style={{ color: '#b0aca6', marginBottom: '20px' }}>Mistakes: {mistakes}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowRewards(true)}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #e8a0b4, #c0788a)',
              border: 'none',
              borderRadius: '8px',
              color: '#0a0a0a',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Claim Reward
          </button>
          <button
            onClick={() => startNewGame(difficulty)}
            style={{
              padding: '12px 32px',
              background: 'none',
              border: '1px solid rgba(42, 90, 58, 0.3)',
              borderRadius: '8px',
              color: '#b0aca6',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '0 4px'
      }}>
        <div style={{
          display: 'flex',
          gap: '20px',
          color: '#b0aca6',
          fontSize: '14px'
        }}>
          <span>⏱️ {formatTime(timer)}</span>
          <span>❌ {mistakes}</span>
          <span style={{
            textTransform: 'uppercase',
            fontSize: '11px',
            padding: '2px 10px',
            background: '#1a3a2a',
            borderRadius: '12px',
            color: '#b0aca6'
          }}>{difficulty}</span>
        </div>
        <button
          onClick={() => startNewGame(difficulty)}
          style={{
            background: 'none',
            border: '1px solid rgba(42, 90, 58, 0.3)',
            color: '#b0aca6',
            padding: '6px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '13px'
          }}
        >
          New Game
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
        gap: '1px',
        background: 'rgba(42, 90, 58, 0.2)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid rgba(42, 90, 58, 0.3)',
        aspectRatio: '1'
      }}>
        {board.map((row, i) => (
          row.map((_, j) => renderCell(i, j))
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        marginTop: '16px'
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            style={{
              padding: '12px',
              background: '#1e1e1e',
              border: '1px solid rgba(42, 90, 58, 0.2)',
              borderRadius: '8px',
              color: '#f0ece6',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleNumberInput(0)}
          style={{
            padding: '12px',
            background: '#1e1e1e',
            border: '1px solid rgba(42, 90, 58, 0.2)',
            borderRadius: '8px',
            color: '#ff4444',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Sudoku;