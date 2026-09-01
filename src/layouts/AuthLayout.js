import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #0a0a0a, #0a2a1a)',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        pointerEvents: 'none', 
        overflow: 'hidden' 
      }}>
        <div style={{ 
          position: 'absolute', 
          width: '100%', 
          height: '100%', 
          background: 'radial-gradient(ellipse at 30% 50%, #c0788a 0%, transparent 70%)', 
          opacity: 0.05 
        }}></div>
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          fontSize: '200px', 
          opacity: 0.03 
        }}>❤️</div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', color: '#f0ece6', fontWeight: '300', letterSpacing: '2px' }}>Brian ❤️ Jasmine</h1>
          <p style={{ color: '#b0aca6', fontSize: '14px', letterSpacing: '4px', marginTop: '8px' }}>A private love story</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;