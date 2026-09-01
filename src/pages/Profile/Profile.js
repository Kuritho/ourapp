import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { uploadFile, getPublicUrl, deleteFile } from '../../lib/storage';

const Profile = () => {
  const { user, profile, updateProfile, signOut, deleteAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    birthday: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    highScore: 0,
    rewardsEarned: 0,
    rewardsClaimed: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        birthday: profile.birthday || ''
      });
      setAvatarPreview(profile.avatar_url || '');
    }
    loadStats();
    loadRecentActivity();
  }, [profile]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Games played
      const { data: gameAttempts } = await supabase
        .from('game_attempts')
        .select('*')
        .eq('user_id', user.id);

      // High score
      const { data: highScore } = await supabase
        .from('game_attempts')
        .select('score')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1);

      // Rewards earned
      const { data: rewardsEarned } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('user_id', user.id);

      setStats({
        gamesPlayed: gameAttempts?.length || 0,
        highScore: highScore?.[0]?.score || 0,
        rewardsEarned: rewardsEarned?.length || 0,
        rewardsClaimed: rewardsEarned?.filter(r => r.status === 'claimed').length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    if (!user) return;

    try {
      // Get recent game attempts
      const { data: attempts } = await supabase
        .from('game_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(3);

      // Get recent reward claims
      const { data: claims } = await supabase
        .from('reward_claims')
        .select('*, rewards(name)')
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false })
        .limit(3);

      const activities = [];

      if (attempts) {
        attempts.forEach(a => {
          if (a.completed_at) {
            activities.push({
              type: 'game',
              title: `Played ${a.game_id || 'a game'}`,
              score: a.score ? `Score: ${a.score}` : '',
              date: a.completed_at
            });
          }
        });
      }

      if (claims) {
        claims.forEach(c => {
          if (c.claimed_at) {
            activities.push({
              type: 'reward',
              title: `Claimed ${c.rewards?.name || 'a reward'}`,
              date: c.claimed_at
            });
          }
        });
      }

      // Sort by date and take latest 5
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return null;

    try {
      // Get the profile ID from the current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Could not find your profile');
      }

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { path } = await uploadFile('avatars', avatarFile, fileName);
      const url = getPublicUrl('avatars', path);
      
      // Update profile with new avatar
      await updateProfile({ avatar_url: url });
      
      setAvatarFile(null);
      return url;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let avatarUrl = avatarPreview;
      if (avatarFile) {
        avatarUrl = await handleUploadAvatar();
      }

      // Only send fields that should be updated
      const updates = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        bio: formData.bio.trim(),
        birthday: formData.birthday || null,
        avatar_url: avatarUrl
      };

      await updateProfile(updates);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      // Error already handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDate(date);
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ 
        textAlign: 'center', 
        padding: '30px 20px', 
        background: 'linear-gradient(180deg, rgba(26, 58, 42, 0.3), transparent)', 
        borderRadius: '16px', 
        marginBottom: '30px' 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            position: 'relative', 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '3px solid #e8a0b4', 
            boxShadow: '0 0 30px rgba(232, 160, 180, 0.1)', 
            marginBottom: '16px' 
          }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt={profile?.full_name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#0a2a1a', 
                fontSize: '48px', 
                color: '#b0aca6' 
              }}>
                {profile?.full_name?.charAt(0) || '👤'}
              </div>
            )}
            {editMode && (
              <label style={{ 
                position: 'absolute', 
                bottom: 0, 
                right: 0, 
                background: '#e8a0b4', 
                padding: '8px', 
                borderRadius: '50%', 
                cursor: 'pointer', 
                fontSize: '16px', 
                transition: 'all 0.3s ease', 
                border: '2px solid #0a0a0a' 
              }}>
                📷
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '500', color: '#f0ece6', marginBottom: '4px' }}>{profile?.full_name || 'User'}</h1>
          <p style={{ color: '#b0aca6', fontSize: '14px' }}>@{profile?.username || 'username'}</p>
          <p style={{ color: '#b0aca6', fontSize: '12px', marginTop: '4px' }}>Joined {formatDate(profile?.created_at)}</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px', 
          marginTop: '20px', 
          padding: '0 20px' 
        }}>
          <div style={{ background: '#1e1e1e', padding: '16px', borderRadius: '16px', border: '1px solid rgba(42, 90, 58, 0.2)' }}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: '600', color: '#f0ece6' }}>{stats.gamesPlayed}</span>
            <span style={{ display: 'block', fontSize: '12px', color: '#b0aca6', marginTop: '4px' }}>Games Played</span>
          </div>
          <div style={{ background: '#1e1e1e', padding: '16px', borderRadius: '16px', border: '1px solid rgba(42, 90, 58, 0.2)' }}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: '600', color: '#f0ece6' }}>{stats.highScore}</span>
            <span style={{ display: 'block', fontSize: '12px', color: '#b0aca6', marginTop: '4px' }}>High Score</span>
          </div>
          <div style={{ background: '#1e1e1e', padding: '16px', borderRadius: '16px', border: '1px solid rgba(42, 90, 58, 0.2)' }}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: '600', color: '#f0ece6' }}>{stats.rewardsEarned}</span>
            <span style={{ display: 'block', fontSize: '12px', color: '#b0aca6', marginTop: '4px' }}>Rewards Earned</span>
          </div>
          <div style={{ background: '#1e1e1e', padding: '16px', borderRadius: '16px', border: '1px solid rgba(42, 90, 58, 0.2)' }}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: '600', color: '#f0ece6' }}>{stats.rewardsClaimed}</span>
            <span style={{ display: 'block', fontSize: '12px', color: '#b0aca6', marginTop: '4px' }}>Rewards Claimed</span>
          </div>
        </div>
      </div>

      {!editMode ? (
        <div style={{ display: 'grid', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: '#1e1e1e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(42, 90, 58, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#f0ece6' }}>About Me</h2>
              <button onClick={() => setEditMode(true)} style={{ 
                background: 'none', 
                border: '1px solid rgba(42, 90, 58, 0.3)', 
                color: '#b0aca6', 
                padding: '6px 16px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                transition: 'all 0.3s ease', 
                fontSize: '13px' 
              }}>
                ✏️ Edit Profile
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(42, 90, 58, 0.1)' }}>
                <span style={{ color: '#b0aca6', fontSize: '14px' }}>Full Name</span>
                <span style={{ color: '#f0ece6', fontSize: '14px' }}>{profile?.full_name || 'Not set'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(42, 90, 58, 0.1)' }}>
                <span style={{ color: '#b0aca6', fontSize: '14px' }}>Username</span>
                <span style={{ color: '#f0ece6', fontSize: '14px' }}>@{profile?.username || 'Not set'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(42, 90, 58, 0.1)' }}>
                <span style={{ color: '#b0aca6', fontSize: '14px' }}>Email</span>
                <span style={{ color: '#f0ece6', fontSize: '14px' }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(42, 90, 58, 0.1)' }}>
                <span style={{ color: '#b0aca6', fontSize: '14px' }}>Bio</span>
                <span style={{ color: '#f0ece6', fontSize: '14px', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{profile?.bio || 'No bio yet'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: '#b0aca6', fontSize: '14px' }}>Birthday</span>
                <span style={{ color: '#f0ece6', fontSize: '14px' }}>{profile?.birthday ? formatDate(profile.birthday) : 'Not set'}</span>
              </div>
            </div>
          </div>

          {recentActivity.length > 0 && (
            <div style={{ background: '#1e1e1e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(42, 90, 58, 0.2)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#f0ece6', marginBottom: '16px' }}>Recent Activity</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentActivity.map((activity, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '10px 12px', 
                    background: 'rgba(10, 10, 10, 0.4)', 
                    borderRadius: '8px' 
                  }}>
                    <span style={{ fontSize: '20px' }}>{activity.type === 'game' ? '🎮' : '🎁'}</span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#f0ece6', fontSize: '14px' }}>{activity.title}</span>
                      {activity.score && <span style={{ color: '#e8a0b4', fontSize: '13px' }}>{activity.score}</span>}
                      <span style={{ color: '#b0aca6', fontSize: '12px', marginLeft: 'auto' }}>{formatDateAgo(activity.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={signOut} style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'none', 
              border: '1px solid rgba(42, 90, 58, 0.3)', 
              borderRadius: '8px', 
              color: '#b0aca6', 
              fontSize: '16px', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease' 
            }}>
              🚪 Sign Out
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'none', 
              border: '1px solid rgba(255, 68, 68, 0.3)', 
              borderRadius: '8px', 
              color: '#ff4444', 
              fontSize: '16px', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease' 
            }}>
              🗑️ Delete Account
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: '#1e1e1e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(42, 90, 58, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#f0ece6' }}>Edit Profile</h2>
              <button onClick={() => setEditMode(false)} style={{ 
                background: 'none', 
                border: '1px solid rgba(42, 90, 58, 0.3)', 
                color: '#b0aca6', 
                padding: '6px 16px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                transition: 'all 0.3s ease', 
                fontSize: '13px' 
              }}>
                Cancel
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#b0aca6', fontSize: '13px', fontWeight: '500' }}>Full Name</label>
                <input
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(10, 10, 10, 0.6)',
                    border: '1px solid rgba(42, 90, 58, 0.3)',
                    borderRadius: '8px',
                    color: '#f0ece6',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#b0aca6', fontSize: '13px', fontWeight: '500' }}>Username</label>
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(10, 10, 10, 0.6)',
                    border: '1px solid rgba(42, 90, 58, 0.3)',
                    borderRadius: '8px',
                    color: '#f0ece6',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#b0aca6', fontSize: '13px', fontWeight: '500' }}>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  rows="3"
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(10, 10, 10, 0.6)',
                    border: '1px solid rgba(42, 90, 58, 0.3)',
                    borderRadius: '8px',
                    color: '#f0ece6',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#b0aca6', fontSize: '13px', fontWeight: '500' }}>Birthday</label>
                <input
                  name="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleChange}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(10, 10, 10, 0.6)',
                    border: '1px solid rgba(42, 90, 58, 0.3)',
                    borderRadius: '8px',
                    color: '#f0ece6',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <button type="submit" disabled={loading} style={{ 
                padding: '12px', 
                background: loading ? '#2a5a3a' : 'linear-gradient(135deg, #1a3a2a, #2a5a3a)', 
                border: 'none', 
                borderRadius: '8px', 
                color: '#f0ece6', 
                fontSize: '16px', 
                fontWeight: '500', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                transition: 'all 0.3s ease', 
                opacity: loading ? 0.6 : 1 
              }}>
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e1e1e',
            padding: '32px',
            borderRadius: '16px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            border: '1px solid rgba(42, 90, 58, 0.3)'
          }}>
            <h3 style={{ color: '#f0ece6', marginBottom: '12px' }}>⚠️ Delete Account</h3>
            <p style={{ color: '#b0aca6', marginBottom: '4px' }}>Are you sure you want to delete your account?</p>
            <p style={{ color: '#ff4444', fontWeight: '500', marginTop: '8px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{
                padding: '10px 24px',
                background: 'none',
                border: '1px solid rgba(42, 90, 58, 0.3)',
                borderRadius: '8px',
                color: '#b0aca6',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} style={{
                padding: '10px 24px',
                background: '#ff4444',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;