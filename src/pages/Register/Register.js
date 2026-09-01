import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, username, fullName);
      navigate('/login');
    } catch (error) {
      setError(error.message || 'Registration failed');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{
        background: 'rgba(30, 30, 30, 0.8)',
        backdropFilter: 'blur(12px)',
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid rgba(42, 90, 58, 0.3)',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>💕</div>
          <h2 style={{ fontSize: '28px', fontWeight: '400', color: '#f0ece6', marginBottom: '8px' }}>Create Account</h2>
          <p style={{ color: '#b0aca6', fontSize: '14px' }}>Start your love story</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#ff4444',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#b0aca6', fontSize: '14px', fontWeight: '500' }}>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              disabled={loading}
              style={{
                padding: '12px 16px',
                background: 'rgba(10, 10, 10, 0.6)',
                border: '1px solid rgba(42, 90, 58, 0.3)',
                borderRadius: '8px',
                color: '#f0ece6',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#b0aca6', fontSize: '14px', fontWeight: '500' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              disabled={loading}
              style={{
                padding: '12px 16px',
                background: 'rgba(10, 10, 10, 0.6)',
                border: '1px solid rgba(42, 90, 58, 0.3)',
                borderRadius: '8px',
                color: '#f0ece6',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#b0aca6', fontSize: '14px', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              style={{
                padding: '12px 16px',
                background: 'rgba(10, 10, 10, 0.6)',
                border: '1px solid rgba(42, 90, 58, 0.3)',
                borderRadius: '8px',
                color: '#f0ece6',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#b0aca6', fontSize: '14px', fontWeight: '500' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              disabled={loading}
              minLength={6}
              style={{
                padding: '12px 16px',
                background: 'rgba(10, 10, 10, 0.6)',
                border: '1px solid rgba(42, 90, 58, 0.3)',
                borderRadius: '8px',
                color: '#f0ece6',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#b0aca6', fontSize: '14px', fontWeight: '500' }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              disabled={loading}
              style={{
                padding: '12px 16px',
                background: 'rgba(10, 10, 10, 0.6)',
                border: '1px solid rgba(42, 90, 58, 0.3)',
                borderRadius: '8px',
                color: '#f0ece6',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              background: loading ? '#2a5a3a' : 'linear-gradient(135deg, #1a3a2a, #2a5a3a)',
              border: 'none',
              borderRadius: '8px',
              color: '#f0ece6',
              fontSize: '18px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account 💕'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(42, 90, 58, 0.2)' }}>
          <p style={{ color: '#b0aca6', fontSize: '14px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#e8a0b4', textDecoration: 'none', fontWeight: '500' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;