import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signIn(email, password);
      navigate('/');
    } catch (error) {
      setError(error.message || 'Failed to sign in');
      console.error('Login error:', error);
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
          <div style={{ fontSize: '40px', color: '#e8a0b4', display: 'block', marginBottom: '12px' }}>❤️</div>
          <h2 style={{ fontSize: '28px', fontWeight: '400', color: '#f0ece6', marginBottom: '8px' }}>Welcome Back</h2>
          <p style={{ color: '#b0aca6', fontSize: '14px' }}>Sign in to your love story</p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              placeholder="Enter your password"
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
            {loading ? 'Signing in...' : 'Sign In ❤️'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(42, 90, 58, 0.2)' }}>
          <p style={{ color: '#b0aca6', fontSize: '14px' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#e8a0b4', textDecoration: 'none', fontWeight: '500' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;