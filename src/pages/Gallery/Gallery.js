import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { uploadFile, getPublicUrl, deleteFile } from '../../lib/storage';
import './Gallery.css';

const Gallery = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [formData, setFormData] = useState({
    caption: '',
    category: 'Special Moments',
    memory_date: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const categories = ['Dates', 'Travel', 'Food', 'Monthsary', 'Special Moments', 'Random', 'Other'];

  useEffect(() => {
    checkAdmin();
    fetchPhotos();
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

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File is too large. Maximum size is 10MB.');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
      }
      setSelectedFile(file);
    }
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
      
      const { path } = await uploadFile('gallery', selectedFile, fileName);
      
      if (!path) {
        throw new Error('Upload failed - no path returned');
      }
      
      const url = getPublicUrl('gallery', path);
      if (!url) {
        throw new Error('Failed to get public URL');
      }

      // Use profileData.id (the profile's primary key) for user_id
      const { data, error } = await supabase
        .from('gallery')
        .insert({
          user_id: profileData.id,
          image_url: url,
          caption: formData.caption,
          category: formData.category,
          memory_date: formData.memory_date || null
        })
        .select('*, profiles(full_name)')
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      setPhotos([data, ...photos]);
      setShowUpload(false);
      setSelectedFile(null);
      setFormData({ caption: '', category: 'Special Moments', memory_date: '' });
      alert('Photo uploaded successfully! 📸');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error uploading photo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    if (photo.user_id !== user.id && !isAdmin) return;

    try {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      // Delete from storage
      const path = photo.image_url.split('/').pop();
      await deleteFile('gallery', `${photo.user_id}/${path}`);

      setPhotos(photos.filter(p => p.id !== photo.id));
      setSelectedPhoto(null);
      alert('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error deleting photo: ' + error.message);
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
        <p>Loading memories...</p>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <h1>📸 Our Gallery</h1>
        <p>Capturing our beautiful moments together</p>
        <button onClick={() => setShowUpload(true)} className="upload-btn">
          + Upload Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📷</span>
          <h3>No photos yet</h3>
          <p>Start creating memories together!</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="gallery-item"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img src={photo.image_url} alt={photo.caption || 'Memory'} />
              <div className="gallery-overlay">
                {photo.caption && <p>{photo.caption}</p>}
                <div className="gallery-meta">
                  <span>{photo.category}</span>
                  <span>{formatDate(photo.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Photo</h2>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Photo (Max 10MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Caption</label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="What's this memory?"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Memory Date</label>
                <input
                  type="date"
                  value={formData.memory_date}
                  onChange={(e) => setFormData({ ...formData, memory_date: e.target.value })}
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

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="lightbox" onClick={() => setSelectedPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.image_url} alt={selectedPhoto.caption || 'Memory'} />
            <div className="lightbox-info">
              <p>{selectedPhoto.caption || 'No caption'}</p>
              <div className="lightbox-meta">
                <span>{selectedPhoto.category}</span>
                <span>{formatDate(selectedPhoto.created_at)}</span>
                <span>by {selectedPhoto.profiles?.full_name || 'Anonymous'}</span>
              </div>
              {(selectedPhoto.user_id === user.id || isAdmin) && (
                <button onClick={() => handleDelete(selectedPhoto)} className="delete-photo-btn">
                  🗑️ Delete Photo
                </button>
              )}
            </div>
            <button className="close-lightbox" onClick={() => setSelectedPhoto(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;