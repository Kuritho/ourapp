import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const Messenger = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [showMessenger, setShowMessenger] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileId, setProfileId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get current user's profile ID and other user
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) {
        console.log('No user logged in');
        return;
      }

      try {
        console.log('Fetching profile for user:', user.id);
        
        // Get current user's profile ID
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }

        console.log('Profile found:', profileData);
        setProfileId(profileData.id);

        // Get the other user (Brian or Jasmine)
        const { data: otherUserData, error: otherError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, user_id')
          .neq('user_id', user.id)
          .limit(1);

        if (otherError) {
          console.error('Error fetching other user:', otherError);
          return;
        }

        if (otherUserData && otherUserData.length > 0) {
          console.log('Other user found:', otherUserData[0]);
          setOtherUser(otherUserData[0]);
        } else {
          console.log('No other user found');
        }
      } catch (error) {
        console.error('Error in fetchUsers:', error);
      }
    };

    fetchUsers();
  }, [user]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!user || !otherUser || !profileId) {
        console.log('Missing data for loading messages:', { user: !!user, otherUser: !!otherUser, profileId: !!profileId });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('Loading messages between:', profileId, otherUser.id);
        
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id (id, full_name, avatar_url),
            receiver:receiver_id (id, full_name, avatar_url)
          `)
          .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        console.log('Messages loaded:', data?.length || 0);
        setMessages(data || []);

        // Mark unread messages as read
        const unreadMessages = data?.filter(m => 
          m.receiver_id === profileId && !m.is_read
        ) || [];

        if (unreadMessages.length > 0) {
          console.log('Marking messages as read:', unreadMessages.length);
          await supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .in('id', unreadMessages.map(m => m.id));
        }

        setUnreadCount(0);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [user, otherUser, profileId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user || !otherUser || !profileId) return;

    console.log('Setting up realtime subscription for messages');
    
    const subscription = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Get the new message with sender/receiver info
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:sender_id (id, full_name, avatar_url),
              receiver:receiver_id (id, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching new message:', error);
            return;
          }

          console.log('New message data:', data);

          // Only add message if it involves the current user
          if (data.sender_id === profileId || data.receiver_id === profileId) {
            setMessages(prev => [...prev, data]);
            
            // If the message is for the current user and chat is closed, increment unread count
            if (data.receiver_id === profileId && !showMessenger && !data.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, [user, otherUser, profileId, showMessenger]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUser || !profileId) {
      console.log('Cannot send message - missing data:', { 
        hasMessage: !!newMessage.trim(), 
        hasUser: !!user, 
        hasOtherUser: !!otherUser, 
        hasProfileId: !!profileId 
      });
      return;
    }

    setSending(true);
    try {
      console.log('Sending message:', newMessage.trim());
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: profileId,
          receiver_id: otherUser.id,
          message: newMessage.trim(),
          is_read: false
        })
        .select(`
          *,
          sender:sender_id (id, full_name, avatar_url),
          receiver:receiver_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
        setSending(false);
        return;
      }

      console.log('Message sent:', data);
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    const today = new Date();
    const msgDate = new Date(date);
    
    if (msgDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return msgDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleMessenger = () => {
    setShowMessenger(!showMessenger);
    if (!showMessenger) {
      setUnreadCount(0);
      markAllAsRead();
    }
  };

  const markAllAsRead = async () => {
    if (!user || !profileId) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('receiver_id', profileId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Don't render if no other user or not logged in
  if (!user || !otherUser) {
    console.log('Messenger not rendered - missing user or otherUser');
    return null;
  }

  console.log('Rendering Messenger with:', { 
    showMessenger, 
    unreadCount, 
    messagesCount: messages.length,
    otherUser: otherUser?.full_name 
  });

  return (
    <>
      {/* Messenger Toggle Button */}
      <button
        onClick={toggleMessenger}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          zIndex: 999,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e8a0b4, #c0788a)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(212, 132, 152, 0.4)',
          cursor: 'pointer',
          fontSize: '28px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          touchAction: 'manipulation'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 6px 30px rgba(212, 132, 152, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(212, 132, 152, 0.4)';
        }}
      >
        💬
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#ff4444',
            color: '#fff',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-primary)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Messenger Window */}
      {showMessenger && (
        <div style={{
          position: 'fixed',
          bottom: '150px',
          right: '20px',
          width: 'min(380px, 92vw)',
          maxHeight: '65vh',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #e8a0b4, #c0788a)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#fff',
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                {otherUser?.avatar_url ? (
                  <img src={otherUser.avatar_url} alt={otherUser.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#c0788a'
                  }}>
                    {otherUser?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  fontSize: '15px'
                }}>{otherUser?.full_name || 'User'}</div>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#4ade80',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}></span>
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={toggleMessenger}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '4px 8px',
                touchAction: 'manipulation',
                opacity: 0.8,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.8'}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            minHeight: '200px',
            maxHeight: '400px',
            background: 'var(--bg-primary)'
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: '14px'
              }}>
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                textAlign: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '48px' }}>💕</span>
                <p style={{ fontSize: '16px', fontWeight: '500' }}>No messages yet</p>
                <p style={{ fontSize: '13px' }}>Say hello to your love!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = msg.sender_id === profileId;
                const showDate = index === 0 || 
                  new Date(msg.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div style={{
                        textAlign: 'center',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        padding: '8px 0',
                        margin: '4px 0'
                      }}>
                        {formatDate(msg.created_at)}
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        maxWidth: '80%',
                        padding: '10px 16px',
                        borderRadius: '16px',
                        background: isOwn ? 'linear-gradient(135deg, #e8a0b4, #d48498)' : 'var(--bg-card)',
                        color: isOwn ? '#fff' : 'var(--text-primary)',
                        border: isOwn ? 'none' : '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-light)',
                        wordWrap: 'break-word'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>{msg.message}</div>
                        <div style={{
                          fontSize: '10px',
                          opacity: 0.7,
                          marginTop: '4px',
                          textAlign: 'right'
                        }}>
                          {formatTime(msg.created_at)}
                          {isOwn && (
                            <span style={{ marginLeft: '6px' }}>
                              {msg.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '10px',
            background: 'var(--bg-card)',
            flexShrink: 0
          }}>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s ease',
                minHeight: '44px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--pink)';
                e.target.style.boxShadow = '0 0 0 3px rgba(212, 132, 152, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              style={{
                padding: '10px 20px',
                background: (sending || !newMessage.trim()) ? 'var(--text-muted)' : 'linear-gradient(135deg, #e8a0b4, #c0788a)',
                border: 'none',
                borderRadius: '24px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (sending || !newMessage.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: (sending || !newMessage.trim()) ? 0.5 : 1,
                minWidth: '60px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </>
  );
};

export default Messenger;
