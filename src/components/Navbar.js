import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('.mobile-menu-container')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const navLinks = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/monthsary', label: 'Monthsary', icon: '💌' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/gallery', label: 'Gallery', icon: '📸' },
  { to: '/videos', label: 'Videos', icon: '🎥' },
  { to: '/games', label: 'Games', icon: '🎮' },
  { to: '/gcash', label: 'Gcash', icon: '💰' },  // Add this
  { to: '/rewards', label: 'Rewards', icon: '🎁' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

  if (isAdmin) {
    navLinks.push({ to: '/admin', label: 'Admin', icon: '⚙️' });
  }

  // Mobile Navigation with Hamburger Menu
  if (isMobile) {
    return (
      <div className="mobile-menu-container" style={{ position: 'relative' }}>
        {/* Mobile Top Navbar */}
        <nav style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: scrolled ? 'rgba(10, 14, 26, 0.95)' : 'rgba(10, 14, 26, 0.85)',
          backdropFilter: scrolled ? 'blur(16px)' : 'blur(8px)',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'blur(8px)',
          borderBottom: scrolled ? '1px solid var(--border-color)' : '1px solid transparent',
          height: '56px',
          transition: 'all 0.4s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px'
        }}>
          {/* Romantic Text Logo - Mobile */}
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none'
          }}>
            <span style={{
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              letterSpacing: '0.3px'
            }}>
              Brian
            </span>
            <span style={{
              fontSize: '14px',
              color: 'var(--primary)',
              animation: 'pulse 2s ease-in-out infinite',
              display: 'inline-block'
            }}>
              ♥
            </span>
            <span style={{
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              letterSpacing: '0.3px'
            }}>
              Jasmine
            </span>
          </Link>

          {/* Right Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid var(--border-color)',
                fontSize: '16px',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'var(--transition)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Hamburger Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid var(--border-color)',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'var(--transition)',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                width: '40px',
                height: '40px'
              }}
            >
              <span style={{
                display: 'block',
                width: '20px',
                height: '2px',
                background: menuOpen ? 'var(--primary)' : 'var(--text-secondary)',
                borderRadius: '2px',
                transition: 'var(--transition)',
                transform: menuOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none'
              }} />
              <span style={{
                display: 'block',
                width: '20px',
                height: '2px',
                background: menuOpen ? 'var(--primary)' : 'var(--text-secondary)',
                borderRadius: '2px',
                transition: 'var(--transition)',
                opacity: menuOpen ? 0 : 1
              }} />
              <span style={{
                display: 'block',
                width: '20px',
                height: '2px',
                background: menuOpen ? 'var(--primary)' : 'var(--text-secondary)',
                borderRadius: '2px',
                transition: 'var(--transition)',
                transform: menuOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none'
              }} />
            </button>
          </div>
        </nav>

        {/* Mobile Slide-out Menu */}
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '80%',
          background: 'var(--bg-card)',
          zIndex: 999,
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.3)',
          borderLeft: '1px solid var(--border-color)',
          overflowY: 'auto',
          paddingTop: '60px'
        }}>
          {/* Menu Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--gradient-1)',
              border: '2px solid var(--primary)'
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
                  fontSize: '16px',
                  color: '#fff',
                  fontWeight: '600'
                }}>
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div>
              <div style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}>
                {profile?.full_name || 'User'}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}>
                @{profile?.username || 'username'}
              </div>
            </div>
          </div>

          {/* Menu Links */}
          <div style={{
            padding: '8px 0'
          }}>
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'var(--transition)',
                    background: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Menu Footer - Sign Out */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            marginTop: 'auto'
          }}>
            <button
              onClick={signOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'var(--transition)',
                width: '100%',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Overlay */}
        {menuOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 998,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)'
            }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </div>
    );
  }

  // Desktop Navigation
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: scrolled ? 'rgba(10, 14, 26, 0.92)' : 'rgba(10, 14, 26, 0.7)',
      backdropFilter: scrolled ? 'blur(16px)' : 'blur(8px)',
      borderBottom: scrolled ? '1px solid var(--border-color)' : '1px solid transparent',
      height: '68px',
      transition: 'all 0.4s ease'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Romantic Text Logo - Desktop */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none'
        }}>
          <span style={{
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
            background: 'var(--gradient-1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Brian
          </span>
          <span style={{
            fontSize: '18px',
            color: 'var(--primary)',
            animation: 'pulse 2s ease-in-out infinite',
            display: 'inline-block'
          }}>
            ♥
          </span>
          <span style={{
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
            background: 'var(--gradient-1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Jasmine
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px'
        }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: '8px 16px',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  borderRadius: '10px',
                  transition: 'var(--transition)',
                  background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  fontWeight: isActive ? '600' : '400',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.color = 'var(--text-primary)';
                    e.target.style.background = 'rgba(56, 189, 248, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.color = 'var(--text-secondary)';
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>{link.icon}</span>
                {link.label}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '20px',
                    height: '3px',
                    background: 'var(--gradient-1)',
                    borderRadius: '2px'
                  }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Desktop Right Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-color)',
              fontSize: '18px',
              padding: '8px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'var(--transition)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isDark ? '☀️' : '🌙'}
            <span style={{ fontSize: '12px', fontWeight: '500' }}>
              {isDark ? 'Light' : 'Dark'}
            </span>
          </button>

          <button
            onClick={signOut}
            style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-color)',
              fontSize: '16px',
              padding: '8px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'var(--transition)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            🚪
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '12px',
            borderLeft: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--gradient-1)',
              border: '2px solid var(--primary)',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.2)'
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
                  fontSize: '14px',
                  color: '#fff',
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