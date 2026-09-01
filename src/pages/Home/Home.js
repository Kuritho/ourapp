import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const Home = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthsary, setMonthsary] = useState(null);
  const [recentGallery, setRecentGallery] = useState([]);
  const [games, setGames] = useState([]);
  const [relationshipDays, setRelationshipDays] = useState(0);
  const [relationshipHours, setRelationshipHours] = useState(0);
  const [relationshipMinutes, setRelationshipMinutes] = useState(0);

  // Relationship start date: November 2, 2025
  const START_DATE = new Date('2025-11-02T00:00:00');

  // Update counter every minute
  useEffect(() => {
    const updateCounter = () => {
      const now = new Date();
      const diffMs = now - START_DATE;
      
      // Calculate days, hours, minutes
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setRelationshipDays(days);
      setRelationshipHours(hours);
      setRelationshipMinutes(minutes);
    };

    // Update immediately
    updateCounter();
    
    // Update every minute
    const interval = setInterval(updateCounter, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const { data: monthsaryData } = await supabase
        .from('monthsary_posts')
        .select('*')
        .eq('published', true)
        .order('monthsary_date', { ascending: false })
        .limit(1);

      if (monthsaryData && monthsaryData.length > 0) {
        setMonthsary(monthsaryData[0]);
      }

      const { data: galleryData } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (galleryData) setRecentGallery(galleryData);

      const { data: gamesData } = await supabase
        .from('games')
        .select('*')
        .eq('active', true);

      if (gamesData) setGames(gamesData);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your love story...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '16px 0', 
      animation: 'fadeIn 0.5s ease-out',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Hero Section - Mobile Optimized */}
      <div style={{
        textAlign: 'center',
        padding: '32px 16px 28px',
        marginBottom: '28px',
        background: 'linear-gradient(180deg, var(--border-color), transparent)',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '120px',
          opacity: '0.04',
          pointerEvents: 'none',
          fontFamily: 'Georgia, serif'
        }}>❤️</div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          marginBottom: '16px',
          position: 'relative'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--pink)',
            boxShadow: '0 0 30px rgba(212, 132, 152, 0.15)'
          }}>
            <img 
              src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Brian&background=1a3a2a&color=e8a0b4&size=60'} 
              alt="Brian" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <span style={{
            fontSize: '24px',
            color: 'var(--pink)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>❤️</span>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--pink)',
            boxShadow: '0 0 30px rgba(212, 132, 152, 0.15)'
          }}>
            <img 
              src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Jasmine&background=1a3a2a&color=e8a0b4&size=60'} 
              alt="Jasmine" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
        </div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          letterSpacing: '1px',
          color: 'var(--text-primary)',
          marginBottom: '4px'
        }}>
          Brian <span style={{ color: 'var(--pink)' }}>❤️</span> Jasmine
        </h1>
        
        {/* Live Counter */}
        <div style={{
          marginTop: '8px',
          padding: '12px 16px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-light)',
          display: 'inline-block',
          minWidth: '200px'
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
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--pink)',
                fontFamily: 'Georgia, serif'
              }}>{relationshipDays}</span>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: '-4px'
              }}>Days</span>
            </div>
            <span style={{
              fontSize: '20px',
              color: 'var(--text-muted)',
              opacity: 0.5
            }}>•</span>
            <div>
              <span style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                fontFamily: 'Georgia, serif'
              }}>{String(relationshipHours).padStart(2, '0')}</span>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: '-4px'
              }}>Hours</span>
            </div>
            <span style={{
              fontSize: '20px',
              color: 'var(--text-muted)',
              opacity: 0.5
            }}>•</span>
            <div>
              <span style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                fontFamily: 'Georgia, serif'
              }}>{String(relationshipMinutes).padStart(2, '0')}</span>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: '-4px'
              }}>Minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Monthsary - Mobile Optimized */}
      {monthsary && (
        <section style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>💌</span> Latest Monthsary
            </h2>
            <Link to="/monthsary" style={{
              color: 'var(--pink)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              transition: 'all 0.3s ease'
            }}>
              View All →
            </Link>
          </div>
          
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-light)'
          }}>
            <div style={{
              height: '160px',
              background: 'var(--green-dark)',
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
                  fontSize: '48px',
                  opacity: 0.3
                }}>💌</div>
              )}
            </div>
            <div style={{ padding: '16px' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 12px',
                background: 'var(--pink)',
                color: '#fff',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                {monthsary.month_number}{monthsary.month_number === 1 ? 'st' : monthsary.month_number === 2 ? 'nd' : monthsary.month_number === 3 ? 'rd' : 'th'} Monthsary
              </span>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>{monthsary.title}</h3>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                marginBottom: '8px'
              }}>{formatDate(monthsary.monthsary_date)}</p>
              <p style={{
                color: 'var(--text-muted)',
                lineHeight: '1.5',
                fontSize: '14px',
                marginBottom: '12px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>{monthsary.message.substring(0, 100)}...</p>
              <Link to={`/monthsary/${monthsary.id}`} style={{
                color: 'var(--pink)',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                Read More →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recent Gallery - Mobile Optimized */}
      {recentGallery.length > 0 && (
        <section style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>📸</span> Recent Memories
            </h2>
            <Link to="/gallery" style={{
              color: 'var(--pink)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              transition: 'all 0.3s ease'
            }}>
              View All →
            </Link>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {recentGallery.map((item) => (
              <div key={item.id} style={{
                aspectRatio: '1',
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)'
              }}>
                <img 
                  src={item.image_url} 
                  alt={item.caption || 'Memory'} 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover'
                  }} 
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Games Section - Mobile Optimized */}
      {games.length > 0 && (
        <section style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '0 4px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🎮</span> Play Games
            </h2>
            <Link to="/games" style={{
              color: 'var(--pink)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              transition: 'all 0.3s ease'
            }}>
              View All →
            </Link>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            {games.map((game) => (
              <Link to="/games" key={game.id} style={{
                background: 'var(--bg-card)',
                padding: '20px 12px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                textAlign: 'center',
                border: '1px solid var(--border-color)',
                transition: 'all 0.3s ease',
                boxShadow: 'var(--shadow-light)'
              }}>
                <div style={{
                  fontSize: '36px',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  {game.name === 'Flappy Love Bird' ? '🐦' : '🧩'}
                </div>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>{game.name}</h4>
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}>{game.description}</p>
                <span style={{
                  display: 'inline-block',
                  marginTop: '10px',
                  padding: '4px 16px',
                  background: 'var(--pink)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  color: '#fff',
                  fontWeight: '500'
                }}>
                  Play
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;