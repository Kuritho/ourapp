import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { uploadFile, getPublicUrl, deleteFile } from '../../lib/storage';

const Gcash = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    transaction_type: 'deposit',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });
  const [spendData, setSpendData] = useState({
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // GCash Account Info
  const GCASH_ACCOUNT = {
    number: '09101410034',
    name: 'Kurt Brian Catulong'
  };

  // Get profile ID and other user
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      try {
        // Get current user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('user_id', user.id)
          .single();
        if (profileError) throw profileError;
        setProfileId(profileData.id);

        // Get the other user (for display purposes)
        const { data: otherUserData, error: otherError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .neq('user_id', user.id)
          .limit(1);

        if (otherError) throw otherError;
        if (otherUserData && otherUserData.length > 0) {
          setOtherUser(otherUserData[0]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (profileId) {
      fetchTransactions();
    }
  }, [profileId]);

  const fetchTransactions = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      // Fetch ALL transactions (joint account)
      const { data, error } = await supabase
        .from('gcash_savings')
        .select('*, contributor:contributor_id (full_name, avatar_url)')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      calculateTotals(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (transactions) => {
    let balance = 0;
    let deposits = 0;
    let spent = 0;
    
    transactions.forEach(t => {
      if (t.transaction_type === 'deposit') {
        deposits += t.amount;
        balance += t.amount;
      } else if (t.transaction_type === 'spent') {
        spent += t.amount;
        balance -= t.amount;
      }
    });
    
    setTotalBalance(balance);
    setTotalDeposits(deposits);
    setTotalSpent(spent);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
      }

      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!profileId) return;
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setUploading(true);
    try {
      let receiptUrl = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `gcash/${profileId}/${Date.now()}.${fileExt}`;
        const { path } = await uploadFile('receipts', receiptFile, fileName);
        receiptUrl = getPublicUrl('receipts', path);
      }

      const { data, error } = await supabase
        .from('gcash_savings')
        .insert({
          user_id: profileId,
          amount: parseFloat(formData.amount),
          transaction_type: 'deposit',
          description: formData.description || null,
          receipt_url: receiptUrl,
          transaction_date: formData.transaction_date,
          contributor_id: profileId
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTransactions();
      setShowAddModal(false);
      setFormData({
        amount: '',
        transaction_type: 'deposit',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      alert(`💰 ${profile?.full_name || 'You'} added ${formatCurrency(parseFloat(formData.amount))} to the savings!`);
    } catch (error) {
      console.error('Error adding deposit:', error);
      alert('Error adding deposit: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSpendSubmit = async (e) => {
    e.preventDefault();
    if (!profileId) return;
    if (!spendData.amount || parseFloat(spendData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(spendData.amount) > totalBalance) {
      alert(`Insufficient balance! You only have ${formatCurrency(totalBalance)} available.`);
      return;
    }

    if (!spendData.description.trim()) {
      alert('Please provide a reason for spending.');
      return;
    }

    setUploading(true);
    try {
      let receiptUrl = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `gcash/${profileId}/${Date.now()}.${fileExt}`;
        const { path } = await uploadFile('receipts', receiptFile, fileName);
        receiptUrl = getPublicUrl('receipts', path);
      }

      const { data, error } = await supabase
        .from('gcash_savings')
        .insert({
          user_id: profileId,
          amount: parseFloat(spendData.amount),
          transaction_type: 'spent',
          description: spendData.description.trim(),
          receipt_url: receiptUrl,
          transaction_date: spendData.transaction_date,
          contributor_id: profileId
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTransactions();
      setShowSpendModal(false);
      setSpendData({
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      alert(`💸 ${profile?.full_name || 'You'} spent ${formatCurrency(parseFloat(spendData.amount))}`);
    } catch (error) {
      console.error('Error recording spending:', error);
      alert('Error recording spending: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    // Only allow deletion if user is the contributor
    if (transaction.contributor_id !== profileId) {
      alert('You can only delete your own transactions.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      if (transaction.receipt_url) {
        const path = transaction.receipt_url.split('/').pop();
        await deleteFile('receipts', `gcash/${profileId}/${path}`);
      }

      const { error } = await supabase
        .from('gcash_savings')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      await fetchTransactions();
      alert('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type) => {
    if (type === 'deposit') return '📥';
    if (type === 'spent') return '💸';
    return '🔄';
  };

  const getTransactionColor = (type) => {
    if (type === 'deposit') return '#4ade80';
    if (type === 'spent') return '#f87171';
    return '#fbbf24';
  };

  const getTransactionLabel = (type) => {
    if (type === 'deposit') return 'Deposit';
    if (type === 'spent') return 'Spent';
    return 'Transfer';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading savings...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0', animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '24px',
        background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.06), transparent)',
        borderRadius: 'var(--border-radius)'
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 36px)',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '4px'
        }}>
          💰 Our Savings
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          Joint savings for Brian & Jasmine's future
        </p>
      </div>

      {/* Joint Account Info */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--border-radius)',
        padding: '16px 20px',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>👫</span>
          <div>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              letterSpacing: '0.5px'
            }}>
              Joint Account
            </p>
            <p style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              Brian <span style={{ color: 'var(--primary)' }}>♥</span> Jasmine
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}>
            <span>👤 {profile?.full_name || 'You'}</span>
            {otherUser && (
              <>
                <span style={{ opacity: 0.3 }}>•</span>
                <span>👤 {otherUser.full_name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* GCash Account Info */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--border-radius)',
        padding: '20px',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-light)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '28px' }}>📱</span>
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>GCash Account</h3>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}>Send money to this account</p>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          background: 'rgba(56, 189, 248, 0.04)',
          padding: '16px',
          borderRadius: 'var(--border-radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Account Name</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>{GCASH_ACCOUNT.name}</div>
          </div>
          <div>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Account Number</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--primary)'
            }}>{GCASH_ACCOUNT.number}</div>
          </div>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--gradient-1)',
          borderRadius: 'var(--border-radius)',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(56, 189, 248, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30%',
            right: '-20%',
            fontSize: '80px',
            opacity: 0.06,
            pointerEvents: 'none'
          }}>💰</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.5px',
              marginBottom: '2px'
            }}>Total Savings</p>
            <p style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#fff',
              fontFamily: 'Georgia, serif'
            }}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--border-radius)',
          padding: '16px',
          border: '1px solid var(--border-color)'
        }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.5px',
            marginBottom: '2px'
          }}>📥 Total Deposits</p>
          <p style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#4ade80',
            fontFamily: 'Georgia, serif'
          }}>
            {formatCurrency(totalDeposits)}
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--border-radius)',
          padding: '16px',
          border: '1px solid var(--border-color)'
        }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.5px',
            marginBottom: '2px'
          }}>💸 Total Spent</p>
          <p style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#f87171',
            fontFamily: 'Georgia, serif'
          }}>
            {formatCurrency(totalSpent)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '14px',
            background: 'var(--gradient-1)',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>+</span> Add Money
        </button>
        <button
          onClick={() => setShowSpendModal(true)}
          style={{
            padding: '14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          💸 Spend Money
        </button>
        <button
          onClick={() => setShowReceiptModal(true)}
          style={{
            padding: '14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          📸 Receipts
        </button>
      </div>

      {/* Transaction History */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--border-radius)',
        padding: '20px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-light)'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📋 Transaction History
          <span style={{
            fontSize: '12px',
            fontWeight: '400',
            color: 'var(--text-muted)',
            marginLeft: 'auto'
          }}>
            {transactions.length} transactions
          </span>
        </h3>

        {transactions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)'
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>💳</span>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No transactions yet</h4>
            <p style={{ fontSize: '14px' }}>Start saving for your future together!</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {transactions.map((transaction) => {
              const isOwn = transaction.contributor_id === profileId;
              return (
                <div key={transaction.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  background: transaction.transaction_type === 'spent' 
                    ? 'rgba(248, 113, 113, 0.05)' 
                    : 'rgba(10, 14, 26, 0.4)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: transaction.transaction_type === 'spent' 
                    ? '1px solid rgba(248, 113, 113, 0.15)' 
                    : '1px solid var(--border-color)',
                  transition: 'var(--transition)'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `rgba(${getTransactionColor(transaction.transaction_type)}, 0.15)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                      }}>
                        {getTransactionLabel(transaction.transaction_type)}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        background: transaction.transaction_type === 'deposit' 
                          ? 'rgba(74, 222, 128, 0.15)' 
                          : 'rgba(248, 113, 113, 0.15)',
                        color: transaction.transaction_type === 'deposit' ? '#4ade80' : '#f87171'
                      }}>
                        {transaction.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: isOwn ? 'rgba(56, 189, 248, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                        color: isOwn ? 'var(--primary)' : '#fbbf24'
                      }}>
                        {isOwn ? '👤 You' : `👤 ${transaction.contributor?.full_name || 'Partner'}`}
                      </span>
                    </div>
                    {transaction.description && (
                      <div style={{
                        fontSize: '13px',
                        color: transaction.transaction_type === 'spent' ? '#f87171' : 'var(--text-muted)',
                        marginTop: '2px',
                        fontStyle: transaction.transaction_type === 'spent' ? 'italic' : 'normal'
                      }}>
                        {transaction.transaction_type === 'spent' ? '💬 ' : ''}{transaction.description}
                      </div>
                    )}
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span>{formatDate(transaction.transaction_date)}</span>
                      {transaction.receipt_url && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--primary)',
                          fontSize: '11px'
                        }}>
                          📎 Receipt
                        </span>
                      )}
                      {transaction.transaction_type === 'spent' && (
                        <span style={{
                          fontSize: '10px',
                          color: 'rgba(248, 113, 113, 0.6)',
                          padding: '2px 8px',
                          background: 'rgba(248, 113, 113, 0.08)',
                          borderRadius: '10px'
                        }}>
                          💸 Expense
                        </span>
                      )}
                    </div>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleDeleteTransaction(transaction)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px 8px',
                        transition: 'var(--transition)'
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Money Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--border-radius)',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow)',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  📥 Add Money
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginTop: '2px'
                }}>
                  Adding to joint savings
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Amount (PHP) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What's this for?"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Upload Receipt (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                  {receiptPreview && (
                    <div style={{
                      marginTop: '8px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxWidth: '150px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <img src={receiptPreview} alt="Receipt preview" style={{ width: '100%', height: 'auto' }} />
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setReceiptFile(null);
                      setReceiptPreview(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--gradient-1)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      transition: 'var(--transition)',
                      opacity: uploading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {uploading ? 'Saving...' : `💾 Add to Savings`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spend Money Modal */}
      {showSpendModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--border-radius)',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow)',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  💸 Spend Money
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginTop: '2px'
                }}>
                  Withdrawing from joint savings
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSpendModal(false);
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(56, 189, 248, 0.05)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}>
                Available Balance: <span style={{
                  fontWeight: '700',
                  color: 'var(--primary)',
                  fontSize: '18px'
                }}>{formatCurrency(totalBalance)}</span>
              </p>
            </div>

            <form onSubmit={handleSpendSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Amount to Spend (PHP) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalBalance}
                    value={spendData.amount}
                    onChange={(e) => setSpendData({ ...spendData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                  {spendData.amount && parseFloat(spendData.amount) > totalBalance && (
                    <div style={{
                      color: '#f87171',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      ⚠️ Insufficient balance! You only have {formatCurrency(totalBalance)}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Reason for Spending *
                  </label>
                  <textarea
                    value={spendData.description}
                    onChange={(e) => setSpendData({ ...spendData, description: e.target.value })}
                    placeholder="Why are you spending this money? (e.g., Groceries, Bills, Date Night, etc.)"
                    required
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={spendData.transaction_date}
                    onChange={(e) => setSpendData({ ...spendData, transaction_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Upload Receipt (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                  {receiptPreview && (
                    <div style={{
                      marginTop: '8px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxWidth: '150px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <img src={receiptPreview} alt="Receipt preview" style={{ width: '100%', height: 'auto' }} />
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSpendModal(false);
                      setReceiptFile(null);
                      setReceiptPreview(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !spendData.amount || parseFloat(spendData.amount) > totalBalance}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: (uploading || !spendData.amount || parseFloat(spendData.amount) > totalBalance) 
                        ? 'var(--text-muted)' 
                        : 'linear-gradient(135deg, #f87171, #ef4444)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (uploading || !spendData.amount || parseFloat(spendData.amount) > totalBalance) 
                        ? 'not-allowed' 
                        : 'pointer',
                      transition: 'var(--transition)',
                      opacity: (uploading || !spendData.amount || parseFloat(spendData.amount) > totalBalance) ? 0.6 : 1
                    }}
                  >
                    {uploading ? 'Processing...' : '💸 Confirm Spending'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipts Modal */}
      {showReceiptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--border-radius)',
            padding: '28px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow)',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  📸 Receipts Gallery
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginTop: '2px'
                }}>
                  All receipts from joint savings
                </p>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {transactions.filter(t => t.receipt_url).length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)'
              }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🖼️</span>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No receipts uploaded</h4>
                <p style={{ fontSize: '14px' }}>Upload receipts when adding or spending money</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '12px'
              }}>
                {transactions.filter(t => t.receipt_url).map((transaction) => {
                  const isOwn = transaction.contributor_id === profileId;
                  return (
                    <div key={transaction.id} style={{
                      borderRadius: 'var(--border-radius-sm)',
                      overflow: 'hidden',
                      border: transaction.transaction_type === 'spent' 
                        ? '2px solid rgba(248, 113, 113, 0.3)' 
                        : '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    onClick={() => window.open(transaction.receipt_url, '_blank')}
                    >
                      <img 
                        src={transaction.receipt_url} 
                        alt={`Receipt ${transaction.id}`} 
                        style={{ 
                          width: '100%', 
                          height: '150px', 
                          objectFit: 'cover',
                          display: 'block'
                        }} 
                      />
                      <div style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 8px',
                          borderRadius: '8px',
                          fontSize: '9px',
                          fontWeight: '600',
                          background: transaction.transaction_type === 'spent' 
                            ? 'rgba(248, 113, 113, 0.15)' 
                            : 'rgba(74, 222, 128, 0.15)',
                          color: transaction.transaction_type === 'spent' ? '#f87171' : '#4ade80'
                        }}>
                          {transaction.transaction_type === 'spent' ? '💸 Spent' : '📥 Deposit'}
                        </span>
                        <br />
                        {formatDate(transaction.transaction_date)}
                        <br />
                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                          {formatCurrency(transaction.amount)}
                        </span>
                        <br />
                        <span style={{
                          fontSize: '10px',
                          color: isOwn ? 'var(--primary)' : '#fbbf24'
                        }}>
                          {isOwn ? '👤 You' : `👤 ${transaction.contributor?.full_name || 'Partner'}`}
                        </span>
                        {transaction.description && (
                          <>
                            <br />
                            <span style={{ 
                              fontSize: '10px', 
                              color: 'var(--text-muted)',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {transaction.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gcash;