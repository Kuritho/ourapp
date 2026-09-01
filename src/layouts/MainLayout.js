import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MobileNav from '../components/MobileNav';
import Messenger from '../components/Messenger';

const MainLayout = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)'
    }}>
      <Navbar />
      <main style={{ 
        flex: 1, 
        padding: '24px',
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%', 
        marginTop: '76px',
        paddingBottom: '100px'
      }}>
        <Outlet />
      </main>
      <MobileNav />
      {/* Messenger is now rendered here */}
      <Messenger />
    </div>
  );
};

export default MainLayout;