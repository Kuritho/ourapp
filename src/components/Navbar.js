import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/monthsary', label: 'Monthsary', icon: '💌' },
    { to: '/gallery', label: 'Gallery', icon: '📸' },
    { to: '/videos', label: 'Videos', icon: '🎥' },
    { to: '/games', label: 'Games', icon: '🎮' },
    { to: '/rewards', label: 'Rewards', icon: '🎁' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ];

  if (isAdmin) {
    navLinks.push({ to: '/admin', label: 'Admin', icon: '⚙️' });
  }

  // Hide on mobile
  if (window.innerWidth <= 768) {
    return null;
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: scrolled ? 'var(--bg-card)' : 'var(--bg-primary)',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: '1px solid var(--border-color)',
      height: '64px',
      transition: 'all 0.4s ease',
      boxShadow: scrolled ? 'var(--shadow-light)' : 'none'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none'
        }}>
          <span style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            letterSpacing: '0.5px'
          }}>Brian</span>
          <span style={{
            color: 'var(--pink)',
            fontSize: '14px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>❤️</span>
          <span style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            letterSpacing: '0.5px'
          }}>Jasmine</span>
        </Link>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '6px 14px',
                color: location.pathname === link.to ? 'var(--pink)' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '13px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                background: location.pathname === link.to ? 'rgba(212, 132, 152, 0.12)' : 'transparent',
                fontWeight: location.pathname === link.to ? '500' : '400'
              }}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s ease',
              boxShadow: 'var(--shadow-light)'
            }}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={signOut}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease',
              boxShadow: 'var(--shadow-light)'
            }}
          >
            🚪
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingLeft: '12px',
            borderLeft: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--green)',
              border: '2px solid var(--pink)'
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;