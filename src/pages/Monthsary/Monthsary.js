import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const Monthsary = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
    checkAdmin();
    fetchPosts();
  }, []);

  const checkAdmin = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('monthsary_posts')
        .select('*')
        .order('monthsary_date', { ascending: false });

      if (!isAdmin) {
        query = query.eq('published', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching monthsary posts:', error);
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

  const getOrdinal = (n) => {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading memories...</p>
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
      {/* Header with Live Counter */}
      <div style={{
        textAlign: 'center',
        padding: '24px 16px 20px',
        marginBottom: '28px',
        background: 'linear-gradient(180deg, var(--border-color), transparent)',
        borderRadius: '16px'
      }}>
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 36px)',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '4px',
          letterSpacing: '1px'
        }}>
          💌 Our Monthsary
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          marginBottom: '12px'
        }}>
          Celebrating our love, month by month
        </p>
        
        {/* Live Counter */}
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-light)',
          display: 'inline-block',
          minWidth: '200px',
          marginBottom: '12px'
        }}>
          <p style={{
            fontSize: '12px',
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
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--pink)',
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
              fontSize: '18px',
              color: 'var(--text-muted)',
              opacity: 0.5
            }}>•</span>
            <div>
              <span style={{
                fontSize: '24px',
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
              fontSize: '18px',
              color: 'var(--text-muted)',
              opacity: 0.5
            }}>•</span>
            <div>
              <span style={{
                fontSize: '24px',
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

        {isAdmin && (
          <Link to="/admin/monthsary/new" style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--pink)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 16px rgba(212, 132, 152, 0.3)'
          }}>
            + Create New Monthsary
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💕</span>
          <h3>No monthsary posts yet</h3>
          <p>Check back soon for new memories!</p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {posts.map((post) => (
            <div key={post.id} style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-light)',
              transition: 'all 0.3s ease'
            }}>
              {post.cover_image_url && (
                <div style={{
                  height: '180px',
                  overflow: 'hidden',
                  background: 'var(--green-dark)'
                }}>
                  <img 
                    src={post.cover_image_url} 
                    alt={post.title} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                </div>
              )}
              <div style={{ padding: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 12px',
                    background: 'var(--pink)',
                    color: '#fff',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                  }}>
                    {post.month_number}{getOrdinal(post.month_number)} Monthsary
                  </span>
                  {!post.published && (
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      background: '#ffa500',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      Draft
                    </span>
                  )}
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>{post.title}</h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  marginBottom: '8px'
                }}>{formatDate(post.monthsary_date)}</p>
                <p style={{
                  color: 'var(--text-muted)',
                  lineHeight: '1.5',
                  fontSize: '14px',
                  marginBottom: '12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>{post.message.substring(0, 120)}...</p>
                <Link to={`/monthsary/${post.id}`} style={{
                  color: 'var(--pink)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 16px',
                  background: 'rgba(212, 132, 152, 0.08)',
                  borderRadius: '20px',
                  transition: 'all 0.3s ease'
                }}>
                  Read More →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Monthsary;