import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const Home = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthsary, setMonthsary] = useState(null);
  const [recentGallery, setRecentGallery] = useState([]);
  const [games, setGames] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [topScores, setTopScores] = useState({});
  const [gcashBalance, setGcashBalance] = useState(0);
  const [relationshipDays, setRelationshipDays] = useState(0);
  const [relationshipHours, setRelationshipHours] = useState(0);
  const [relationshipMinutes, setRelationshipMinutes] = useState(0);
  const [profileId, setProfileId] = useState(null);

  const START_DATE = new Date('2025-11-02T00:00:00');

  // Get profile ID
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        setProfileId(data.id);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [user]);

  // Update counter
  useEffect(() => {
    const updateCounter = () => {
      const now = new Date();
      const diffMs = now - START_DATE;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setRelationshipDays(days);
      setRelationshipHours(hours);
      setRelationshipMinutes(minutes);
    };

    updateCounter();
    const interval = setInterval(updateCounter, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profileId) {
      fetchHomeData();
    }
  }, [profileId]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      // Fetch latest monthsary post
      const { data: monthsaryData } = await supabase
        .from('monthsary_posts')
        .select('*')
        .eq('published', true)
        .order('monthsary_date', { ascending: false })
        .limit(1);

      if (monthsaryData && monthsaryData.length > 0) {
        setMonthsary(monthsaryData[0]);
      }

      // Fetch recent gallery
      const { data: galleryData } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (galleryData) setRecentGallery(galleryData);

      // Fetch games
      const { data: gamesData } = await supabase
        .from('games')
        .select('*')
        .eq('active', true);

      if (gamesData) setGames(gamesData);

      // Fetch upcoming events
      const today = new Date().toISOString().split('T')[0];
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', profileId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5);

      if (eventsData) setUpcomingEvents(eventsData);

      // Fetch Gcash balance (joint account)
      await fetchGcashBalance();

      // Fetch top scores
      await fetchTopScores();
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGcashBalance = async () => {
    try {
      // Fetch ALL transactions (joint account - no user_id filter)
      const { data, error } = await supabase
        .from('gcash_savings')
        .select('amount, transaction_type');

      if (error) throw error;
      
      let balance = 0;
      if (data) {
        data.forEach(t => {
          if (t.transaction_type === 'deposit') {
            balance += t.amount;
          } else if (t.transaction_type === 'spent') {
            balance -= t.amount;
          }
        });
      }
      setGcashBalance(balance);
    } catch (error) {
      console.error('Error fetching Gcash balance:', error);
    }
  };

  const fetchTopScores = async () => {
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
          .limit(3);

        if (flappyScores && flappyScores.length > 0) {
          scores.flappy = flappyScores;
        }
      }

      // Fetch Sudoku top score
      if (sudokuGame) {
        const { data: sudokuScores } = await supabase
          .from('game_attempts')
          .select('score, completion_time, profiles(full_name, avatar_url)')
          .eq('game_id', sudokuGame.id)
          .eq('difficulty', 'expert')
          .order('completion_time', { ascending: true })
          .limit(3);

        if (sudokuScores && sudokuScores.length > 0) {
          scores.sudoku = sudokuScores;
        }
      }

      setTopScores(scores);
    } catch (error) {
      console.error('Error fetching top scores:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatEventDate = (date) => {
    const eventDate = new Date(date);
    const today = new Date();
    
    if (eventDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (eventDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      anniversary: '🎉',
      birthday: '🎂',
      date: '💕',
      trip: '✈️',
      celebration: '🎊',
      reminder: '📌',
      other: '📅'
    };
    return emojis[category] || '📅';
  };

  const getCategoryColor = (category) => {
    const colors = {
      anniversary: '#f43f5e',
      birthday: '#f59e0b',
      date: '#ec4899',
      trip: '#3b82f6',
      celebration: '#8b5cf6',
      reminder: '#06b6d4',
      other: '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your love story...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0', animation: 'fadeIn 0.5s ease-out' }}>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: '40px 20px 32px',
        marginBottom: '32px',
        background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.06), transparent)',
        borderRadius: 'var(--border-radius)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '160px',
          opacity: '0.03',
          pointerEvents: 'none',
          fontFamily: 'Georgia, serif'
        }}>💙</div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '16px',
          position: 'relative'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--primary)',
            boxShadow: '0 0 40px rgba(56, 189, 248, 0.2)',
            transition: 'var(--transition)'
          }}>
            <img 
              src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Brian&background=0ea5e9&color=fff&size=72'} 
              alt="Brian" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <span style={{
            fontSize: '32px',
            color: 'var(--primary)',
            animation: 'float 3s ease-in-out infinite'
          }}>💙</span>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--primary)',
            boxShadow: '0 0 40px rgba(56, 189, 248, 0.2)',
            transition: 'var(--transition)'
          }}>
            <img 
              src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Jasmine&background=0ea5e9&color=fff&size=72'} 
              alt="Jasmine" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
        </div>
        
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: '700',
          letterSpacing: '1px',
          color: 'var(--text-primary)',
          marginBottom: '4px'
        }}>
          Brian <span style={{ color: 'var(--primary)' }}>💙</span> Jasmine
        </h1>

        <div style={{
          marginTop: '12px',
          display: 'inline-block',
          padding: '16px 24px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-light)'
        }}>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginBottom: '4px',
            letterSpacing: '1px'
          }}>
            Together since November 2, 2025
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{
                fontSize: '30px',
                fontWeight: '700',
                color: 'var(--primary)',
                fontFamily: 'Georgia, serif'
              }}>{relationshipDays}</span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: '-4px'
              }}>Days</span>
            </div>
            <span style={{
              fontSize: '20px',
              color: 'var(--text-muted)',
              opacity: 0.3
            }}>•</span>
            <div>
              <span style={{
                fontSize: '30px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                fontFamily: 'Georgia, serif'
              }}>{String(relationshipHours).padStart(2, '0')}</span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: '-4px'
              }}>Hours</span>
            </div>
            <span style={{
              fontSize: '20px',
              color: 'var(--text-muted)',
              opacity: 0.3
            }}>•</span>
            <div>
              <span style={{
                fontSize: '30px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                fontFamily: 'Georgia, serif'
              }}>{String(relationshipMinutes).padStart(2, '0')}</span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: '-4px'
              }}>Minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gcash Joint Savings Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--border-radius)',
        padding: '20px',
        border: '1px solid var(--border-color)',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-light)',
        background: 'linear-gradient(135deg, var(--bg-card), rgba(56, 189, 248, 0.05))'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '32px' }}>💰</span>
            <div>
              <p style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                letterSpacing: '0.5px'
              }}>
                👫 Our Joint Savings
              </p>
              <p style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--primary)',
                fontFamily: 'Georgia, serif'
              }}>
                ₱{gcashBalance.toFixed(2)}
              </p>
              <p style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '2px'
              }}>
                Brian ♥ Jasmine • Both can contribute
              </p>
            </div>
          </div>
          <Link to="/gcash" style={{
            padding: '8px 20px',
            background: 'var(--gradient-1)',
            borderRadius: '20px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            View Details →
          </Link>
        </div>
      </div>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: 'clamp(18px, 2vw, 22px)',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📅</span> Upcoming Events
            </h2>
            <Link to="/calendar" style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
            }}>
              View All →
            </Link>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {upcomingEvents.map((event, index) => (
              <Link 
                to="/calendar" 
                key={event.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  textDecoration: 'none',
                  transition: 'var(--transition)',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `rgba(${getCategoryColor(event.category)}, 0.15)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  {getCategoryEmoji(event.category)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {event.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginTop: '2px'
                  }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: getCategoryColor(event.category),
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {event.category}
                    </span>
                    <span>•</span>
                    <span>{formatEventDate(event.event_date)}</span>
                    {event.event_time && (
                      <>
                        <span>•</span>
                        <span>⏰ {event.event_time}</span>
                      </>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: '18px',
                  color: 'var(--text-muted)',
                  opacity: 0.5
                }}>→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest Monthsary */}
      {monthsary && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: 'clamp(18px, 2vw, 22px)',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💌</span> Latest Monthsary
            </h2>
            <Link to="/monthsary" style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
            }}>
              View All →
            </Link>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'clamp(200px, 30%, 280px) 1fr',
            gap: '20px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--border-radius)',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            transition: 'var(--transition)',
            boxShadow: 'var(--shadow-light)'
          }}>
            <div style={{
              height: '100%',
              minHeight: '200px',
              background: 'var(--bg-secondary)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {monthsary.cover_image_url ? (
                <img 
                  src={monthsary.cover_image_url} 
                  alt={monthsary.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: '64px',
                  opacity: 0.2
                }}>💌</div>
              )}
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 16px',
                background: 'var(--gradient-1)',
                color: '#fff',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                marginBottom: '10px',
                width: 'fit-content'
              }}>
                {monthsary.month_number}{monthsary.month_number === 1 ? 'st' : monthsary.month_number === 2 ? 'nd' : monthsary.month_number === 3 ? 'rd' : 'th'} Monthsary
              </span>
              <h3 style={{
                fontSize: 'clamp(18px, 2vw, 22px)',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>{monthsary.title}</h3>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '14px',
                marginBottom: '10px'
              }}>{formatDate(monthsary.monthsary_date)}</p>
              <p style={{
                color: 'var(--text-muted)',
                lineHeight: '1.6',
                fontSize: '14px',
                marginBottom: '14px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>{monthsary.message.substring(0, 120)}...</p>
              <Link to={`/monthsary/${monthsary.id}`} style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'var(--transition)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                Read More →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recent Gallery */}
      {recentGallery.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: 'clamp(18px, 2vw, 22px)',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📸</span> Recent Memories
            </h2>
            <Link to="/gallery" style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
            }}>
              View All →
            </Link>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {recentGallery.map((item, index) => (
              <div key={item.id} style={{
                aspectRatio: '1',
                borderRadius: 'var(--border-radius-sm)',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                transition: 'var(--transition)',
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                animation: `fadeIn 0.5s ease-out ${index * 0.1 + 0.2}s both`
              }}>
                <img 
                  src={item.image_url} 
                  alt={item.caption || 'Memory'} 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transition: 'var(--transition)'
                  }} 
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Games Section */}
      {games.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: 'clamp(18px, 2vw, 22px)',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🎮</span> Play Games
            </h2>
            <Link to="/games" style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
            }}>
              View All →
            </Link>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {games.map((game, index) => (
              <Link to="/games" key={game.id} style={{
                background: 'var(--bg-card)',
                padding: '28px 20px',
                borderRadius: 'var(--border-radius)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                textAlign: 'center',
                border: '1px solid var(--border-color)',
                transition: 'var(--transition)',
                boxShadow: 'var(--shadow-light)',
                animation: `fadeIn 0.5s ease-out ${index * 0.1 + 0.3}s both`
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '12px',
                  display: 'block'
                }}>
                  {game.name === 'Flappy Love Bird' ? '🐦' : '🧩'}
                </div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '6px'
                }}>{game.name}</h4>
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>{game.description}</p>
                <span style={{
                  display: 'inline-block',
                  marginTop: '14px',
                  padding: '8px 24px',
                  background: 'var(--gradient-1)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: '#fff',
                  fontWeight: '500',
                  transition: 'var(--transition)'
                }}>
                  Play Now →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top Scores Section - Moved to Bottom */}
      {(topScores.flappy || topScores.sudoku) && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: 'clamp(18px, 2vw, 22px)',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🏆</span> Top Scores
            </h2>
            <Link to="/games" style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
            }}>
              View All Games →
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                    }}>Highest Scores</p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {topScores.flappy.map((score, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: index === 0 ? 'rgba(255, 215, 0, 0.08)' : 'rgba(10, 14, 26, 0.4)',
                      borderRadius: '8px',
                      border: index === 0 ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '20px' }}>{getMedal(index)}</span>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--gradient-1)'
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
                    }}>Love Sudoku (Expert)</h4>
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}>Fastest Completion Times</p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {topScores.sudoku.map((score, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: index === 0 ? 'rgba(255, 215, 0, 0.08)' : 'rgba(10, 14, 26, 0.4)',
                      borderRadius: '8px',
                      border: index === 0 ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '20px' }}>{getMedal(index)}</span>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--gradient-1)'
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
                        color: 'var(--secondary)'
                      }}>
                        {score.completion_time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '40px',
        padding: '32px 20px 20px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            <span>Brian</span>
            <span style={{ color: 'var(--primary)', fontSize: '16px' }}>♥</span>
            <span>Jasmine</span>
          </div>
          
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '13px',
            letterSpacing: '0.5px'
          }}>
            Made with <span style={{ color: 'var(--primary)' }}>♥</span> by Brian & Jasmine
          </p>
          
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '12px',
            letterSpacing: '0.5px',
            opacity: 0.7
          }}>
            © 2026 All Rights Reserved.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '4px'
          }}>
            <span style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              letterSpacing: '0.5px',
              opacity: 0.5
            }}>
              💙 A Private Love Story
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;