import React, { useState, useEffect } from 'react';

const LoveCounter = ({ startDate = '2025-11-02' }) => {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const START_DATE = new Date(startDate + 'T00:00:00');

  useEffect(() => {
    const updateCounter = () => {
      const now = new Date();
      const diffMs = now - START_DATE;
      
      const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setDays(d);
      setHours(h);
      setMinutes(m);
      setSeconds(s);
    };

    updateCounter();
    const interval = setInterval(updateCounter, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--pink)',
          fontFamily: 'Georgia, serif'
        }}>{days}</span>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'block'
        }}>Days</span>
      </div>
      <span style={{ fontSize: '24px', color: 'var(--text-muted)' }}>:</span>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: '32px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          fontFamily: 'Georgia, serif'
        }}>{String(hours).padStart(2, '0')}</span>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'block'
        }}>Hours</span>
      </div>
      <span style={{ fontSize: '24px', color: 'var(--text-muted)' }}>:</span>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: '32px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          fontFamily: 'Georgia, serif'
        }}>{String(minutes).padStart(2, '0')}</span>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'block'
        }}>Minutes</span>
      </div>
      <span style={{ fontSize: '24px', color: 'var(--text-muted)' }}>:</span>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: '32px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          fontFamily: 'Georgia, serif'
        }}>{String(seconds).padStart(2, '0')}</span>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'block'
        }}>Seconds</span>
      </div>
    </div>
  );
};

export default LoveCounter;