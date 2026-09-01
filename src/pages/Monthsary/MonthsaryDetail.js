import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const MonthsaryDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [profileId, setProfileId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAdmin();
    fetchProfile();
    fetchPost();
    fetchComments();
  }, [id]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    setIsAdmin(data?.role === 'admin');
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      setProfileId(data?.id);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('monthsary_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data.published && !isAdmin) {
        navigate('/monthsary');
        return;
      }

      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error);
      navigate('/monthsary');
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }
      
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!user) {
      setError('Please log in to comment');
      return;
    }

    if (!profileId) {
      setError('Profile not found. Please try again.');
      return;
    }

    if (!newComment.trim()) {
      setError('Please enter a comment');
      return;
    }

    setCommentLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: id,
          user_id: profileId,
          comment: newComment.trim()
        })
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        setError('Failed to add comment: ' + error.message);
        return;
      }

      setComments([...comments, data]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) {
      setError('Please enter a comment');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({ comment: editText.trim() })
        .eq('id', commentId);

      if (error) {
        console.error('Error editing comment:', error);
        setError('Failed to edit comment: ' + error.message);
        return;
      }

      setComments(comments.map(c => 
        c.id === commentId ? { ...c, comment: editText.trim() } : c
      ));
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing comment:', error);
      setError('Failed to edit comment. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        setError('Failed to delete comment: ' + error.message);
        return;
      }

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment. Please try again.');
    }
  };

  const startEditing = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.comment);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditText('');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  };

  // Check if user can edit/delete comment
  const canModifyComment = (comment) => {
    if (!user) return false;
    if (isAdmin) return true;
    return comment.user_id === profileId;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading love letter...</p>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 0' }}>
      <Link to="/monthsary" style={{ 
        display: 'inline-block', 
        color: '#b0aca6', 
        textDecoration: 'none', 
        marginBottom: '24px',
        transition: 'all 0.3s ease'
      }}>
        ← Back to Monthsary
      </Link>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          display: 'inline-block', 
          padding: '4px 20px', 
          background: '#e8a0b4', 
          color: '#0a0a0a', 
          borderRadius: '20px', 
          fontSize: '14px', 
          fontWeight: '600', 
          letterSpacing: '0.5px', 
          marginBottom: '12px' 
        }}>
          {post.month_number}{post.month_number === 1 ? 'st' : post.month_number === 2 ? 'nd' : post.month_number === 3 ? 'rd' : 'th'} Monthsary
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '400', color: '#f0ece6', marginBottom: '8px' }}>{post.title}</h1>
        <p style={{ color: '#b0aca6', fontSize: '16px' }}>{formatDate(post.monthsary_date)}</p>
      </div>

      {post.cover_image_url && (
        <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
          <img src={post.cover_image_url} alt={post.title} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ 
        background: '#1e1e1e', 
        padding: '32px', 
        borderRadius: '16px', 
        border: '1px solid rgba(42, 90, 58, 0.2)', 
        marginBottom: '32px' 
      }}>
        <div style={{ color: '#b0aca6', lineHeight: '1.8', fontSize: '16px' }}>
          {post.message.split('\n').map((paragraph, i) => (
            <p key={i} style={{ marginBottom: i < post.message.split('\n').length - 1 ? '16px' : 0 }}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div style={{ 
        background: '#1e1e1e', 
        padding: '32px', 
        borderRadius: '16px', 
        border: '1px solid rgba(42, 90, 58, 0.2)' 
      }}>
        <h3 style={{ fontSize: '22px', fontWeight: '500', color: '#f0ece6', marginBottom: '4px' }}>💬 Comments</h3>
        <p style={{ color: '#b0aca6', fontSize: '14px', marginBottom: '20px' }}>{comments.length} comments</p>

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

        {user ? (
          <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment... ❤️"
              rows="3"
              disabled={commentLoading}
              style={{
                padding: '12px 16px',
                background: 'rgba(10, 10, 10, 0.6)',
                border: '1px solid rgba(42, 90, 58, 0.3)',
                borderRadius: '8px',
                color: '#f0ece6',
                fontSize: '14px',
                resize: 'vertical',
                transition: 'all 0.3s ease'
              }}
            />
            <button 
              type="submit" 
              disabled={commentLoading || !newComment.trim()}
              style={{
                alignSelf: 'flex-end',
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #e8a0b4, #c0788a)',
                border: 'none',
                borderRadius: '8px',
                color: '#0a0a0a',
                fontWeight: '600',
                cursor: commentLoading || !newComment.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: commentLoading || !newComment.trim() ? 0.6 : 1
              }}
            >
              {commentLoading ? 'Posting...' : 'Post Comment ❤️'}
            </button>
          </form>
        ) : (
          <p style={{ 
            color: '#b0aca6', 
            fontSize: '14px', 
            padding: '12px', 
            background: 'rgba(10, 10, 10, 0.4)', 
            borderRadius: '8px', 
            textAlign: 'center', 
            marginBottom: '24px' 
          }}>
            Please <Link to="/login" style={{ color: '#e8a0b4' }}>log in</Link> to comment
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {comments.length === 0 ? (
            <p style={{ color: '#b0aca6', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              No comments yet. Be the first! ❤️
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={{ 
                display: 'flex', 
                gap: '12px', 
                padding: '16px', 
                background: 'rgba(10, 10, 10, 0.4)', 
                borderRadius: '8px' 
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  background: '#0a2a1a', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0 
                }}>
                  {comment.profiles?.avatar_url ? (
                    <img src={comment.profiles.avatar_url} alt={comment.profiles.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '18px', color: '#b0aca6' }}>{comment.profiles?.full_name?.charAt(0) || '👤'}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ color: '#f0ece6', fontWeight: '500', fontSize: '14px' }}>{comment.profiles?.full_name || 'Anonymous'}</span>
                    <span style={{ color: '#b0aca6', fontSize: '12px' }}>{formatTimeAgo(comment.created_at)}</span>
                  </div>
                  {editingComment === comment.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(10, 10, 10, 0.6)',
                          border: '1px solid rgba(42, 90, 58, 0.3)',
                          borderRadius: '6px',
                          color: '#f0ece6',
                          fontSize: '14px'
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleEditComment(comment.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#e8a0b4',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#0a0a0a',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button 
                          onClick={cancelEditing}
                          style={{
                            padding: '4px 12px',
                            background: 'none',
                            border: '1px solid rgba(42, 90, 58, 0.3)',
                            borderRadius: '4px',
                            color: '#b0aca6',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#b0aca6', fontSize: '14px', lineHeight: '1.5', wordWrap: 'break-word' }}>{comment.comment}</p>
                  )}
                  {!editingComment && canModifyComment(comment) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {comment.user_id === profileId && (
                        <button 
                          onClick={() => startEditing(comment)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#b0aca6',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            padding: 0
                          }}
                        >
                          Edit
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff4444',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          padding: 0
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthsaryDetail;