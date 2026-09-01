import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MobileNav = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/', icon: '🏠', label: 'Home' },
    { to: '/monthsary', icon: '💌', label: 'Monthsary' },
    { to: '/gallery', icon: '📸', label: 'Gallery' },
    { to: '/rewards', icon: '🎁', label: 'Rewards' },
    { to: '/profile', icon: '👤', label: 'Profile' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: '⚙️', label: 'Admin' });
  }

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {isActive && <span className="nav-badge" />}
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;