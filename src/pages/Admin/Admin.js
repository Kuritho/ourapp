import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import './Admin.css';

const Admin = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [monthsaryPosts, setMonthsaryPosts] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [videos, setVideos] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [rewardClaims, setRewardClaims] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [editingReward, setEditingReward] = useState(null);
  const [formData, setFormData] = useState({
    month_number: '',
    title: '',
    message: '',
    monthsary_date: '',
    published: false,
    cover_image_url: ''
  });
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    category: 'snack',
    game_id: '',
    difficulty: '',
    active: true,
    claim_limit: 1,
    expiration_date: ''
  });

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchMonthsaryPosts();
    fetchGallery();
    fetchVideos();
    fetchRewards();
    fetchRewardClaims();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { count: userCount },
        { count: galleryCount },
        { count: videoCount },
        { count: monthsaryCount },
        { count: commentCount },
        { count: gameAttempts },
        { count: rewardClaimsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('gallery').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('monthsary_posts').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('game_attempts').select('*', { count: 'exact', head: true }),
        supabase.from('reward_claims').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        users: userCount || 0,
        gallery: galleryCount || 0,
        videos: videoCount || 0,
        monthsary: monthsaryCount || 0,
        comments: commentCount || 0,
        gameAttempts: gameAttempts || 0,
        rewardClaims: rewardClaimsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMonthsaryPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('monthsary_posts')
        .select('*')
        .order('monthsary_date', { ascending: false });

      if (error) throw error;
      setMonthsaryPosts(data || []);
    } catch (error) {
      console.error('Error fetching monthsary posts:', error);
    }
  };

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const fetchRewardClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_claims')
        .select('*, profiles(full_name), rewards(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewardClaims(data || []);
    } catch (error) {
      console.error('Error fetching reward claims:', error);
    }
  };

  // === MONTHSARY CRUD ===
  const handleCreateMonthsary = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Get the profile ID from the current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        alert('Could not find your profile. Please contact support.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('monthsary_posts')
        .insert({
          month_number: parseInt(formData.month_number),
          title: formData.title,
          message: formData.message,
          monthsary_date: formData.monthsary_date,
          published: formData.published,
          cover_image_url: formData.cover_image_url || null,
          created_by: profileData.id  // Use profile.id, not user.id
        })
        .select()
        .single();

      if (error) throw error;

      setMonthsaryPosts([data, ...monthsaryPosts]);
      setFormData({ 
        month_number: '', 
        title: '', 
        message: '', 
        monthsary_date: '', 
        published: false, 
        cover_image_url: '' 
      });
      setEditingPost(null);
      alert('Monthsary post created successfully! ❤️');
    } catch (error) {
      console.error('Error creating monthsary:', error);
      alert('Error creating monthsary: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMonthsary = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('monthsary_posts')
        .update({
          month_number: parseInt(formData.month_number),
          title: formData.title,
          message: formData.message,
          monthsary_date: formData.monthsary_date,
          published: formData.published,
          cover_image_url: formData.cover_image_url || null
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      setMonthsaryPosts(monthsaryPosts.map(p => 
        p.id === editingPost.id ? { ...p, ...formData, month_number: parseInt(formData.month_number) } : p
      ));
      setFormData({ 
        month_number: '', 
        title: '', 
        message: '', 
        monthsary_date: '', 
        published: false, 
        cover_image_url: '' 
      });
      setEditingPost(null);
      alert('Monthsary post updated successfully! ❤️');
    } catch (error) {
      console.error('Error updating monthsary:', error);
      alert('Error updating monthsary: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonthsary = async (id) => {
    if (!window.confirm('Are you sure you want to delete this monthsary post?')) return;
    try {
      const { error } = await supabase
        .from('monthsary_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMonthsaryPosts(monthsaryPosts.filter(p => p.id !== id));
      alert('Monthsary post deleted successfully');
    } catch (error) {
      console.error('Error deleting monthsary:', error);
      alert('Error deleting monthsary: ' + error.message);
    }
  };

  const handleEditMonthsary = (post) => {
    setEditingPost(post);
    setFormData({
      month_number: post.month_number.toString(),
      title: post.title,
      message: post.message,
      monthsary_date: post.monthsary_date,
      published: post.published,
      cover_image_url: post.cover_image_url || ''
    });
  };

  // === REWARD CRUD ===
  const handleCreateReward = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rewards')
        .insert(rewardForm)
        .select()
        .single();

      if (error) throw error;

      setRewards([data, ...rewards]);
      setRewardForm({ 
        name: '', 
        description: '', 
        category: 'snack', 
        game_id: '', 
        difficulty: '', 
        active: true, 
        claim_limit: 1, 
        expiration_date: '' 
      });
      setEditingReward(null);
      alert('Reward created successfully! 🎁');
    } catch (error) {
      console.error('Error creating reward:', error);
      alert('Error creating reward: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReward = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rewards')
        .update(rewardForm)
        .eq('id', editingReward.id);

      if (error) throw error;

      setRewards(rewards.map(r => 
        r.id === editingReward.id ? { ...r, ...rewardForm } : r
      ));
      setRewardForm({ 
        name: '', 
        description: '', 
        category: 'snack', 
        game_id: '', 
        difficulty: '', 
        active: true, 
        claim_limit: 1, 
        expiration_date: '' 
      });
      setEditingReward(null);
      alert('Reward updated successfully! 🎁');
    } catch (error) {
      console.error('Error updating reward:', error);
      alert('Error updating reward: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReward = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reward?')) return;
    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRewards(rewards.filter(r => r.id !== id));
      alert('Reward deleted successfully');
    } catch (error) {
      console.error('Error deleting reward:', error);
      alert('Error deleting reward: ' + error.message);
    }
  };

  // === REWARD CLAIM MANAGEMENT ===
  const handleClaimStatusUpdate = async (claimId, status) => {
    try {
      const { error } = await supabase
        .from('reward_claims')
        .update({ 
          status, 
          used_at: status === 'used' ? new Date().toISOString() : null 
        })
        .eq('id', claimId);

      if (error) throw error;

      setRewardClaims(rewardClaims.map(c => 
        c.id === claimId ? { ...c, status } : c
      ));
      alert(`Claim marked as ${status}`);
    } catch (error) {
      console.error('Error updating claim:', error);
      alert('Error updating claim: ' + error.message);
    }
  };

  // === USER MANAGEMENT ===
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      alert('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role: ' + error.message);
    }
  };

  // Render functions (same as before)
  const renderMonthsaryForm = () => {
    const isEditing = !!editingPost;
    return (
      <div className="admin-card">
        <h3>{isEditing ? 'Edit Monthsary Post' : 'Create New Monthsary Post'}</h3>
        <form onSubmit={isEditing ? handleUpdateMonthsary : handleCreateMonthsary}>
          <div className="form-group">
            <label>Month Number</label>
            <input
              type="number"
              value={formData.month_number}
              onChange={(e) => setFormData({ ...formData, month_number: e.target.value })}
              required
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Our 1st Monthsary"
            />
          </div>
          <div className="form-group">
            <label>Message (Love Letter)</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows="6"
              placeholder="Write your love letter here..."
            />
          </div>
          <div className="form-group">
            <label>Monthsary Date</label>
            <input
              type="date"
              value={formData.monthsary_date}
              onChange={(e) => setFormData({ ...formData, monthsary_date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Cover Image URL</label>
            <input
              type="text"
              value={formData.cover_image_url}
              onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              />
              Publish
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
            </button>
            {isEditing && (
              <button type="button" onClick={() => {
                setEditingPost(null);
                setFormData({ month_number: '', title: '', message: '', monthsary_date: '', published: false, cover_image_url: '' });
              }} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  const renderRewardForm = () => {
    const isEditing = !!editingReward;
    return (
      <div className="admin-card">
        <h3>{isEditing ? 'Edit Reward' : 'Create New Reward'}</h3>
        <form onSubmit={isEditing ? handleUpdateReward : handleCreateReward}>
          <div className="form-group">
            <label>Reward Name</label>
            <input
              type="text"
              value={rewardForm.name}
              onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
              required
              placeholder="e.g., Chocolate, Jollibee, Pizza"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={rewardForm.description}
              onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
              placeholder="Brief description"
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              value={rewardForm.category}
              onChange={(e) => setRewardForm({ ...rewardForm, category: e.target.value })}
              required
            >
              <option value="flappy">Flappy Bird Reward</option>
              <option value="snack">Snack</option>
              <option value="food">Food</option>
              <option value="restaurant">Restaurant</option>
            </select>
          </div>
          <div className="form-group">
            <label>Difficulty (for Sudoku)</label>
            <select
              value={rewardForm.difficulty}
              onChange={(e) => setRewardForm({ ...rewardForm, difficulty: e.target.value })}
            >
              <option value="">Any</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div className="form-group">
            <label>Claim Limit</label>
            <input
              type="number"
              value={rewardForm.claim_limit}
              onChange={(e) => setRewardForm({ ...rewardForm, claim_limit: parseInt(e.target.value) })}
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Expiration Date (Optional)</label>
            <input
              type="date"
              value={rewardForm.expiration_date}
              onChange={(e) => setRewardForm({ ...rewardForm, expiration_date: e.target.value })}
            />
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={rewardForm.active}
                onChange={(e) => setRewardForm({ ...rewardForm, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Reward' : 'Create Reward'}
            </button>
            {isEditing && (
              <button type="button" onClick={() => {
                setEditingReward(null);
                setRewardForm({ name: '', description: '', category: 'snack', game_id: '', difficulty: '', active: true, claim_limit: 1, expiration_date: '' });
              }} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  // Dashboard rendering
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙️ Admin Dashboard</h1>
        <p>Welcome back, {profile?.full_name || 'Admin'}!</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={activeTab === 'monthsary' ? 'active' : ''} 
          onClick={() => setActiveTab('monthsary')}
        >
          💌 Monthsary
        </button>
        <button 
          className={activeTab === 'gallery' ? 'active' : ''} 
          onClick={() => setActiveTab('gallery')}
        >
          📸 Gallery
        </button>
        <button 
          className={activeTab === 'videos' ? 'active' : ''} 
          onClick={() => setActiveTab('videos')}
        >
          🎥 Videos
        </button>
        <button 
          className={activeTab === 'rewards' ? 'active' : ''} 
          onClick={() => setActiveTab('rewards')}
        >
          🎁 Rewards
        </button>
        <button 
          className={activeTab === 'claims' ? 'active' : ''} 
          onClick={() => setActiveTab('claims')}
        >
          📋 Claims
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            <div className="stat-card">
              <span className="stat-icon">👥</span>
              <div className="stat-info">
                <span className="stat-value">{stats.users}</span>
                <span className="stat-label">Total Users</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💌</span>
              <div className="stat-info">
                <span className="stat-value">{stats.monthsary}</span>
                <span className="stat-label">Monthsary Posts</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📸</span>
              <div className="stat-info">
                <span className="stat-value">{stats.gallery}</span>
                <span className="stat-label">Photos</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎥</span>
              <div className="stat-info">
                <span className="stat-value">{stats.videos}</span>
                <span className="stat-label">Videos</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💬</span>
              <div className="stat-info">
                <span className="stat-value">{stats.comments}</span>
                <span className="stat-label">Comments</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎮</span>
              <div className="stat-info">
                <span className="stat-value">{stats.gameAttempts}</span>
                <span className="stat-label">Games Played</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎁</span>
              <div className="stat-info">
                <span className="stat-value">{stats.rewardClaims}</span>
                <span className="stat-label">Rewards Claimed</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-card full-width">
            <h3>👥 User Management</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} />
                          ) : (
                            <span className="avatar-placeholder">{user.full_name?.charAt(0) || 'U'}</span>
                          )}
                          <span>{user.full_name}</span>
                        </div>
                      </td>
                      <td>@{user.username}</td>
                      <td>{user.user_id}</td>
                      <td>
                        <span className={`role-badge ${user.role === 'admin' ? 'admin' : 'user'}`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                          className="role-select"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'monthsary' && (
          <div className="admin-monthsary">
            {renderMonthsaryForm()}
            
            <div className="admin-card full-width">
              <h3>📋 Existing Monthsary Posts</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthsaryPosts.map(post => (
                      <tr key={post.id}>
                        <td>{post.month_number}{post.month_number === 1 ? 'st' : post.month_number === 2 ? 'nd' : post.month_number === 3 ? 'rd' : 'th'}</td>
                        <td>{post.title}</td>
                        <td>{new Date(post.monthsary_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge ${post.published ? 'published' : 'draft'}`}>
                            {post.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => handleEditMonthsary(post)} className="edit-btn">Edit</button>
                          <button onClick={() => handleDeleteMonthsary(post.id)} className="delete-btn">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="admin-card full-width">
            <h3>📸 Gallery Management</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Caption</th>
                    <th>Category</th>
                    <th>Uploaded By</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {galleryItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <img src={item.image_url} alt={item.caption} className="thumbnail-img" />
                      </td>
                      <td>{item.caption || 'No caption'}</td>
                      <td>{item.category}</td>
                      <td>{item.profiles?.full_name || 'Unknown'}</td>
                      <td>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => {
                          if (window.confirm('Delete this photo?')) {
                            // Delete logic
                          }
                        }} className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="admin-card full-width">
            <h3>🎥 Video Management</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Caption</th>
                    <th>Uploaded By</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map(video => (
                    <tr key={video.id}>
                      <td>{video.title || 'Untitled'}</td>
                      <td>{video.caption || ''}</td>
                      <td>{video.profiles?.full_name || 'Unknown'}</td>
                      <td>{new Date(video.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => {
                          if (window.confirm('Delete this video?')) {
                            // Delete logic
                          }
                        }} className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="admin-rewards">
            {renderRewardForm()}
            
            <div className="admin-card full-width">
              <h3>📋 Existing Rewards</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Difficulty</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map(reward => (
                      <tr key={reward.id}>
                        <td>{reward.name}</td>
                        <td>{reward.category}</td>
                        <td>{reward.difficulty || 'Any'}</td>
                        <td>
                          <span className={`status-badge ${reward.active ? 'active' : 'inactive'}`}>
                            {reward.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => {
                            setEditingReward(reward);
                            setRewardForm(reward);
                          }} className="edit-btn">Edit</button>
                          <button onClick={() => handleDeleteReward(reward.id)} className="delete-btn">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="admin-card full-width">
            <h3>📋 Reward Claims</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reward</th>
                    <th>Status</th>
                    <th>Claimed Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rewardClaims.map(claim => (
                    <tr key={claim.id}>
                      <td>{claim.profiles?.full_name || 'Unknown'}</td>
                      <td>{claim.rewards?.name || 'Unknown'}</td>
                      <td>
                        <span className={`status-badge ${claim.status}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td>{new Date(claim.created_at).toLocaleDateString()}</td>
                      <td>
                        {claim.status === 'claimed' && (
                          <button onClick={() => handleClaimStatusUpdate(claim.id, 'used')} className="edit-btn">
                            Mark Used
                          </button>
                        )}
                        {claim.status !== 'cancelled' && claim.status !== 'used' && (
                          <button onClick={() => handleClaimStatusUpdate(claim.id, 'cancelled')} className="delete-btn">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;