import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const FlappyLoveBird = ({ playerName, onGameComplete }) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [gameOverData, setGameOverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameId, setGameId] = useState(null);

  // Game constants
  const GRAVITY = 0.5;
  const JUMP_FORCE = -8;
  const PIPE_WIDTH = 50;
  const PIPE_GAP = 150;
  const PIPE_SPEED = 2;
  const PIPE_SPAWN_INTERVAL = 120;

  // Game variables
  const birdRef = useRef({ x: 150, y: 250, velocity: 0, width: 34, height: 24 });
  const pipesRef = useRef([]);
  const frameCountRef = useRef(0);
  const animationIdRef = useRef(null);
  const gameStateRef = useRef('idle');
  const scoreRef = useRef(0);

  // Load game ID and high scores
  useEffect(() => {
    const loadGameData = async () => {
      try {
        // Get the game ID
        const { data: gameData, error } = await supabase
          .from('games')
          .select('id')
          .eq('name', 'Flappy Love Bird')
          .maybeSingle();

        if (error) {
          console.error('Error fetching game:', error);
          setLoading(false);
          return;
        }

        if (!gameData) {
          console.error('Game not found in database');
          setLoading(false);
          return;
        }

        setGameId(gameData.id);
        await loadScores(gameData.id);
        setLoading(false);
      } catch (error) {
        console.error('Error loading game data:', error);
        setLoading(false);
      }
    };

    const loadScores = async (gameId) => {
      if (!user || !gameId) return;

      try {
        // Get profile ID
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profileData) return;

        // Get user's high score
        const { data: attempts } = await supabase
          .from('game_attempts')
          .select('score')
          .eq('user_id', profileData.id)
          .eq('game_id', gameId)
          .order('score', { ascending: false })
          .limit(1);

        if (attempts && attempts.length > 0) {
          setHighScore(attempts[0].score);
        }

        // Get global best score
        const { data: globalBest } = await supabase
          .from('game_attempts')
          .select('score')
          .eq('game_id', gameId)
          .order('score', { ascending: false })
          .limit(1);

        if (globalBest && globalBest.length > 0) {
          setBestScore(globalBest[0].score);
        }
      } catch (error) {
        console.error('Error loading scores:', error);
      }
    };

    loadGameData();
  }, [user]);

  // Initialize canvas and game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const width = Math.min(rect.width, 600);
      const height = Math.min(width * 0.75, 500);
      
      canvas.width = width;
      canvas.height = height;
      
      birdRef.current = {
        x: width * 0.25,
        y: height * 0.5,
        velocity: 0,
        width: 34,
        height: 24
      };
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game loop
    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationIdRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationIdRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // UPDATE
      if (gameStateRef.current === 'playing') {
        const bird = birdRef.current;
        const pipes = pipesRef.current;

        // Bird physics
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;

        // Pipe spawning
        frameCountRef.current++;
        if (frameCountRef.current % PIPE_SPAWN_INTERVAL === 0) {
          const minY = 50;
          const maxY = canvas.height - PIPE_GAP - 50;
          const gapY = Math.random() * (maxY - minY) + minY;
          
          pipes.push({
            x: canvas.width,
            gapY: gapY,
            width: PIPE_WIDTH,
            gap: PIPE_GAP,
            scored: false
          });
        }

        // Update pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
          const pipe = pipes[i];
          pipe.x -= PIPE_SPEED;

          if (!pipe.scored && pipe.x + pipe.width < bird.x) {
            pipe.scored = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }

          if (pipe.x + pipe.width < 0) {
            pipes.splice(i, 1);
          }
        }

        // Collision detection
        const birdLeft = bird.x - bird.width / 2;
        const birdRight = bird.x + bird.width / 2;
        const birdTop = bird.y - bird.height / 2;
        const birdBottom = bird.y + bird.height / 2;

        if (bird.y > canvas.height - 20 || bird.y < 0) {
          gameOverHandler();
          animationIdRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        for (const pipe of pipes) {
          if (birdRight > pipe.x && birdLeft < pipe.x + pipe.width) {
            if (birdTop < pipe.gapY || birdBottom > pipe.gapY + pipe.gap) {
              gameOverHandler();
              animationIdRef.current = requestAnimationFrame(gameLoop);
              return;
            }
          }
        }
      }

      // RENDER
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#1a1a2e');
      skyGrad.addColorStop(0.5, '#16213e');
      skyGrad.addColorStop(1, '#0f3460');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground
      ctx.fillStyle = '#1a3a2a';
      ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
      ctx.fillStyle = '#2a5a3a';
      ctx.fillRect(0, canvas.height - 20, canvas.width, 5);

      // Draw pipes
      for (const pipe of pipesRef.current) {
        // Top pipe
        ctx.fillStyle = '#2a5a3a';
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
        ctx.fillStyle = '#1a4a2a';
        ctx.fillRect(pipe.x - 5, pipe.gapY - 20, pipe.width + 10, 20);
        
        // Bottom pipe
        ctx.fillStyle = '#2a5a3a';
        ctx.fillRect(pipe.x, pipe.gapY + pipe.gap, pipe.width, canvas.height - pipe.gapY - pipe.gap - 20);
        ctx.fillStyle = '#1a4a2a';
        ctx.fillRect(pipe.x - 5, pipe.gapY + pipe.gap, pipe.width + 10, 20);
      }

      // Draw bird (heart shape)
      const bird = birdRef.current;
      const birdX = bird.x - bird.width / 2;
      const birdY = bird.y - bird.height / 2;
      
      ctx.shadowColor = '#e8a0b4';
      ctx.shadowBlur = 20;
      
      ctx.fillStyle = '#e8a0b4';
      ctx.beginPath();
      ctx.arc(birdX + 17, birdY + 12, 10, 0, Math.PI * 2);
      ctx.arc(birdX + 7, birdY + 12, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(birdX + 12, birdY + 22);
      ctx.quadraticCurveTo(birdX + 2, birdY + 32, birdX + 12, birdY + 38);
      ctx.quadraticCurveTo(birdX + 22, birdY + 32, birdX + 12, birdY + 22);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(birdX + 20, birdY + 10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(birdX + 21, birdY + 9, 2, 0, Math.PI * 2);
      ctx.fill();

      // Score
      ctx.fillStyle = '#f0ece6';
      ctx.font = 'bold 28px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(`❤️ ${scoreRef.current}`, canvas.width / 2, 50);
      ctx.shadowBlur = 0;

      // High scores
      ctx.fillStyle = '#b0aca6';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Your Best: ${highScore}`, 10, 20);
      ctx.textAlign = 'right';
      ctx.fillText(`🏆 Best: ${bestScore}`, canvas.width - 10, 20);

      // Game states
      if (gameStateRef.current === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#f0ece6';
        ctx.font = 'bold 40px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.fillText('💔 Game Over', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.font = '28px sans-serif';
        ctx.fillText(`Score: ${scoreRef.current}`, canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = '#b0aca6';
        ctx.font = '18px sans-serif';
        ctx.fillText('Click or press SPACE to restart', canvas.width / 2, canvas.height / 2 + 60);
      }

      if (gameStateRef.current === 'idle') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#f0ece6';
        ctx.font = 'bold 32px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐦 Flappy Love Bird', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#e8a0b4';
        ctx.font = '20px sans-serif';
        ctx.fillText('❤️ A Love Story Game ❤️', canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = '#b0aca6';
        ctx.font = '16px sans-serif';
        ctx.fillText('Click or press SPACE to start', canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText('🎯 Reach 500 points for a special reward!', canvas.width / 2, canvas.height / 2 + 95);
      }

      if (showReward) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#f0ece6';
        ctx.font = 'bold 34px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 CONGRATULATIONS!', canvas.width / 2, canvas.height / 2 - 80);
        
        ctx.font = '22px sans-serif';
        ctx.fillText(`You reached ${scoreRef.current} points!`, canvas.width / 2, canvas.height / 2 - 25);
        ctx.fillStyle = '#e8a0b4';
        ctx.fillText('✨ You unlocked a special reward! ✨', canvas.width / 2, canvas.height / 2 + 25);
        
        ctx.fillStyle = '#f0ece6';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('👇 Click to Claim Your Reward', canvas.width / 2, canvas.height / 2 + 80);
      }

      animationIdRef.current = requestAnimationFrame(gameLoop);
    };

    const gameOverHandler = async () => {
      if (gameStateRef.current === 'gameover') return;
      
      gameStateRef.current = 'gameover';
      setGameState('gameover');
      
      const currentScore = scoreRef.current;
      if (currentScore >= 500) {
        setShowReward(true);
      }
      
      await saveScore(currentScore);
    };

    const saveScore = async (score) => {
      if (!user || !gameId) return;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profileData) return;

        const { data, error } = await supabase
          .from('game_attempts')
          .insert({
            user_id: profileData.id,
            game_id: gameId,
            score: score,
            completed_at: new Date().toISOString(),
            reward_eligible: score >= 500
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving score:', error);
          return;
        }

        if (score > highScore) {
          setHighScore(score);
        }

        setGameOverData(data);
      } catch (error) {
        console.error('Error saving score:', error);
      }
    };

    gameLoop();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [user, gameId, highScore]);

  // Reset game
  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    birdRef.current = {
      x: canvas.width * 0.25,
      y: canvas.height * 0.5,
      velocity: 0,
      width: 34,
      height: 24
    };
    pipesRef.current = [];
    frameCountRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    gameStateRef.current = 'idle';
    setGameState('idle');
    setShowReward(false);
    setGameOverData(null);
    setRewardClaimed(false);
  }, []);

  // Jump
  const jump = useCallback(() => {
    if (gameStateRef.current === 'idle') {
      gameStateRef.current = 'playing';
      setGameState('playing');
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameStateRef.current === 'playing') {
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameStateRef.current === 'gameover') {
      resetGame();
    }
  }, [resetGame]);

  // Claim reward
  const claimReward = async () => {
    if (!user || !gameOverData || !gameId) {
      alert('No reward data found');
      return;
    }

    try {
      // Check if already claimed
      const { data: existingClaim } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('game_attempt_id', gameOverData.id)
        .maybeSingle();

      if (existingClaim) {
        setRewardClaimed(true);
        setShowReward(false);
        alert('Reward already claimed!');
        return;
      }

      // Get flappy reward
      const { data: rewardData } = await supabase
        .from('rewards')
        .select('*')
        .eq('category', 'flappy')
        .eq('active', true)
        .limit(1);

      if (!rewardData || rewardData.length === 0) {
        alert('No reward configured. Please contact admin.');
        return;
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        alert('Profile not found');
        return;
      }

      // Create claim
      const { data: claim, error } = await supabase
        .from('reward_claims')
        .insert({
          user_id: profileData.id,
          reward_id: rewardData[0].id,
          game_attempt_id: gameOverData.id,
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create receipt
      await supabase
        .from('receipts')
        .insert({
          user_id: profileData.id,
          reward_claim_id: claim.id,
          game_name: 'Flappy Love Bird',
          score: scoreRef.current.toString(),
          reward_name: rewardData[0].name,
          status: 'claimed'
        });

      setRewardClaimed(true);
      setShowReward(false);
      
      if (onGameComplete) {
        onGameComplete({ score: scoreRef.current, reward: rewardData[0].name });
      }

      alert('🎉 Reward claimed successfully! Check your rewards page.');
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Error claiming reward: ' + error.message);
    }
  };

  // Event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (showReward) {
          claimReward();
          return;
        }
        jump();
      }
    };

    const handleClick = (e) => {
      const canvas = canvasRef.current;
      if (canvas && e.target === canvas) {
        if (showReward) {
          claimReward();
          return;
        }
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [jump, showReward, claimReward]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px', 
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
        <p style={{ color: '#b0aca6' }}>Loading Flappy Love Bird...</p>
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
          The game is not configured yet.<br />
          Please contact the admin to set up the game.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative', 
      maxWidth: '600px', 
      margin: '0 auto', 
      background: '#1e1e1e', 
      borderRadius: '16px', 
      overflow: 'hidden', 
      border: '1px solid rgba(42, 90, 58, 0.2)' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 16px', 
        background: 'rgba(0, 0, 0, 0.3)', 
        borderBottom: '1px solid rgba(42, 90, 58, 0.2)' 
      }}>
        <div style={{ color: '#b0aca6', fontSize: '14px' }}>
          <span>❤️ {playerName || 'Player'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => {
              const container = canvasRef.current?.parentElement;
              if (container) {
                if (!document.fullscreenElement) {
                  container.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }
            }} 
            style={{ 
              background: 'rgba(42, 90, 58, 0.3)', 
              border: '1px solid rgba(42, 90, 58, 0.3)', 
              color: '#b0aca6', 
              padding: '4px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '12px', 
              transition: 'all 0.3s ease' 
            }}
          >
            ⛶ Fullscreen
          </button>
        </div>
      </div>

      <div style={{ 
        position: 'relative', 
        width: '100%', 
        background: '#0a0a0a', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: '100%', 
            height: 'auto', 
            display: 'block', 
            background: '#0a0a0a', 
            cursor: 'pointer',
            touchAction: 'none'
          }}
        />
      </div>

      {rewardClaimed && (
        <div style={{ 
          position: 'absolute', 
          bottom: '80px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          background: '#1e1e1e', 
          padding: '16px 24px', 
          borderRadius: '16px', 
          border: '2px solid #e8a0b4', 
          textAlign: 'center', 
          zIndex: 10, 
          maxWidth: '90%' 
        }}>
          <h3 style={{ color: '#f0ece6', marginBottom: '4px' }}>🎉 Reward Claimed!</h3>
          <p style={{ color: '#b0aca6', fontSize: '14px' }}>Check your rewards page to view your receipt.</p>
        </div>
      )}

      <div style={{ 
        padding: '12px 16px', 
        borderTop: '1px solid rgba(42, 90, 58, 0.2)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '8px' 
      }}>
        <p style={{ 
          display: 'flex', 
          gap: '16px', 
          color: '#b0aca6', 
          fontSize: '12px', 
          margin: 0 
        }}>
          <span>🖱️ Click / SPACE = Fly</span>
          <span>⛶ F = Fullscreen</span>
        </p>
        <p style={{ color: '#b0aca6', fontSize: '12px', margin: 0 }}>
          Made with ❤️ for Brian & Jasmine
        </p>
      </div>
    </div>
  );
};

export default FlappyLoveBird;