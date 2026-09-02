import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MobileNav = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/monthsary', icon: '💌', label: 'Monthsary' },
  { to: '/calendar', icon: '📅', label: 'Calendar' },
  { to: '/gcash', icon: '💰', label: 'Gcash' },  // Add this
  { to: '/gallery', icon: '📸', label: 'Gallery' },
  { to: '/rewards', icon: '🎁', label: 'Rewards' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: '⚙️', label: 'Admin' });
  }

  return (
    <>
      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(10, 14, 26, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-color)',
        display: 'none',
        padding: '6px 0',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '6px 10px',
                textDecoration: 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: '12px',
                transition: 'var(--transition)',
                minWidth: '48px',
                fontSize: '10px',
                position: 'relative',
                background: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                transform: isActive ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <span style={{
                fontSize: '22px',
                transition: 'var(--transition)',
                transform: isActive ? 'scale(1.1)' : 'scale(1)'
              }}>{item.icon}</span>
              <span style={{
                fontSize: '9px',
                letterSpacing: '0.3px',
                fontWeight: isActive ? '600' : '400'
              }}>{item.label}</span>
              {isActive && (
                <>
                  <span style={{
                    position: 'absolute',
                    top: '-1px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '24px',
                    height: '3px',
                    background: 'var(--gradient-1)',
                    borderRadius: '2px'
                  }} />
                  <span style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    height: '100%',
                    background: 'rgba(56, 189, 248, 0.04)',
                    borderRadius: '12px',
                    zIndex: -1
                  }} />
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          nav:last-child {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};

export default MobileNav;