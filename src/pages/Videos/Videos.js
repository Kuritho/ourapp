import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { uploadFile, getPublicUrl, deleteFile } from '../../lib/storage';

const Videos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    caption: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime'];

  useEffect(() => {
    checkAdmin();
    fetchVideos();
  }, []);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    setIsAdmin(data?.role === 'admin');
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum size is 100MB.');
      return;
    }

    if (!ALLOWED_FORMATS.includes(file.type)) {
      alert('Invalid file format. Please upload MP4, WebM, or MOV.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setUploading(true);
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
        setUploading(false);
        return;
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { path } = await uploadFile('videos', selectedFile, fileName);
      const url = getPublicUrl('videos', path);

      // Use profileData.id (the profile's primary key) for user_id
      const { data, error } = await supabase
        .from('videos')
        .insert({
          user_id: profileData.id,
          video_url: url,
          title: formData.title,
          caption: formData.caption
        })
        .select('*, profiles(full_name)')
        .single();

      if (error) throw error;

      setVideos([data, ...videos]);
      setShowUpload(false);
      setSelectedFile(null);
      setFormData({ title: '', caption: '' });
      alert('Video uploaded successfully! 🎥');
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Error uploading video: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    if (video.user_id !== user.id && !isAdmin) return;

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      const path = video.video_url.split('/').pop();
      await deleteFile('videos', `${video.user_id}/${path}`);

      setVideos(videos.filter(v => v.id !== video.id));
      setSelectedVideo(null);
      alert('Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error deleting video: ' + error.message);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="videos-page">
      <div className="videos-header">
        <h1>🎥 Our Videos</h1>
        <p>Capturing our moving memories</p>
        <button onClick={() => setShowUpload(true)} className="upload-btn">
          + Upload Video
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎬</span>
          <h3>No videos yet</h3>
          <p>Start capturing your memories together!</p>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <div
              key={video.id}
              className="video-item"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="video-thumbnail">
                <video
                  src={video.video_url}
                  muted
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    background: '#000'
                  }}
                />
                <div className="play-overlay">▶</div>
              </div>
              <div className="video-info">
                <h4>{video.title || 'Untitled'}</h4>
                {video.caption && <p>{video.caption}</p>}
                <span>{formatDate(video.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Video</h2>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Video (MP4, WebM, MOV - Max 100MB)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Video title"
                />
              </div>
              <div className="form-group">
                <label>Caption</label>
                <textarea
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="What's this video about?"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowUpload(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={uploading || !selectedFile}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVideo && (
        <div className="video-lightbox" onClick={() => setSelectedVideo(null)}>
          <div className="video-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <video
              src={selectedVideo.video_url}
              controls
              autoPlay
              style={{
                width: '100%',
                maxHeight: '70vh',
                background: '#000'
              }}
            />
            <div className="video-lightbox-info">
              <h3>{selectedVideo.title || 'Untitled'}</h3>
              <p>{selectedVideo.caption}</p>
              <span>{formatDate(selectedVideo.created_at)}</span>
              {(selectedVideo.user_id === user.id || isAdmin) && (
                <button onClick={() => handleDelete(selectedVideo)} className="delete-video-btn">
                  🗑️ Delete Video
                </button>
              )}
            </div>
            <button className="close-lightbox" onClick={() => setSelectedVideo(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Videos;