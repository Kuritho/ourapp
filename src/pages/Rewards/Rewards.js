import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import './Rewards.css';

const Rewards = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*, profiles(full_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      claimed: { label: 'Claimed', color: '#4a8a6a' },
      used: { label: 'Used', color: '#8a6a4a' },
      cancelled: { label: 'Cancelled', color: '#8a4a4a' }
    };
    const s = statusMap[status] || statusMap.claimed;
    return <span className="status-badge" style={{ background: s.color }}>{s.label}</span>;
  };

  const handleDownloadReceipt = async (receipt) => {
    // Simple text receipt download
    const text = `
================================
       BRIAN ❤️ JASMINE
          REWARD RECEIPT
================================
Receipt: ${receipt.receipt_number}
Player: ${receipt.profiles?.full_name || 'Player'}
Game: ${receipt.game_name}
Reward: ${receipt.reward_name}
Score/Time: ${receipt.score}
Status: ${receipt.status.toUpperCase()}
Date: ${formatDate(receipt.created_at)}
================================
Congratulations! ❤️
Present this receipt in person
to claim your reward.
================================
    `;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receipt.receipt_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading rewards...</p>
      </div>
    );
  }

  return (
    <div className="rewards-page">
      <div className="rewards-header">
        <h1>🎁 My Rewards</h1>
        <p>All your earned rewards and receipts</p>
      </div>

      {rewards.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎯</span>
          <h3>No rewards yet</h3>
          <p>Play games to earn rewards!</p>
        </div>
      ) : (
        <div className="rewards-list">
          {rewards.map((reward) => (
            <div key={reward.id} className="reward-item">
              <div className="reward-icon">🎯</div>
              <div className="reward-details">
                <h4>{reward.reward_name}</h4>
                <p>{reward.game_name}</p>
                <span className="reward-score">{reward.score}</span>
              </div>
              <div className="reward-status">
                {getStatusBadge(reward.status)}
                <span className="reward-date">{formatDate(reward.created_at)}</span>
              </div>
              <div className="reward-actions">
                <button onClick={() => setSelectedReceipt(reward)} className="view-receipt-btn">
                  View Receipt
                </button>
                <button onClick={() => handleDownloadReceipt(reward)} className="download-btn">
                  ⬇️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReceipt && (
        <div className="receipt-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-receipt" onClick={() => setSelectedReceipt(null)}>✕</button>
            <div className="receipt-content">
              <div className="receipt-header">
                <h2>Brian ❤️ Jasmine</h2>
                <h3>REWARD RECEIPT</h3>
              </div>
              <div className="receipt-body">
                <div className="receipt-row">
                  <span className="receipt-label">Receipt:</span>
                  <span className="receipt-value">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Player:</span>
                  <span className="receipt-value">{selectedReceipt.profiles?.full_name || 'Player'}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Game:</span>
                  <span className="receipt-value">{selectedReceipt.game_name}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Reward:</span>
                  <span className="receipt-value highlight">{selectedReceipt.reward_name}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Score/Time:</span>
                  <span className="receipt-value">{selectedReceipt.score}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Status:</span>
                  <span className="receipt-value">{selectedReceipt.status.toUpperCase()}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Date:</span>
                  <span className="receipt-value">{formatDate(selectedReceipt.created_at)}</span>
                </div>
              </div>
              <div className="receipt-footer">
                <p>Congratulations! ❤️</p>
                <p className="receipt-note">Present this receipt in person to claim your reward.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;