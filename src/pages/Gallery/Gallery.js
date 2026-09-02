import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { uploadFile, getPublicUrl, deleteFile } from '../../lib/storage';

const Gallery = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [formData, setFormData] = useState({
    caption: '',
    category: 'Special Moments',
    memory_date: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [profileId, setProfileId] = useState(null);

  const fileInputRef = useRef(null);
  const categories = ['Dates', 'Travel', 'Food', 'Monthsary', 'Special Moments', 'Random', 'Other'];

  // Get profile ID
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        setProfileId(data.id);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [user]);

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
        .order('group_id', { ascending: false })
        .order('display_order', { ascending: true });

      if (error) throw error;

      const grouped = {};
      data?.forEach(item => {
        const groupId = item.group_id || item.id;
        if (!grouped[groupId]) {
          grouped[groupId] = {
            id: groupId,
            items: [],
            created_at: item.created_at,
            caption: item.caption,
            category: item.category,
            memory_date: item.memory_date,
            profiles: item.profiles
          };
        }
        grouped[groupId].items.push(item);
      });

      const groupsArray = Object.values(grouped).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      setGroups(groupsArray);
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    // Validate file size (max 10MB each)
    const invalidFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`⚠️ ${invalidFiles.length} file(s) are too large. Maximum size is 10MB per file.`);
      return;
    }

    // Validate file types
    const invalidTypes = files.filter(f => !f.type.startsWith('image/'));
    if (invalidTypes.length > 0) {
      alert(`⚠️ ${invalidTypes.length} file(s) are not images. Please upload only image files.`);
      return;
    }

    setSelectedFiles(files);
    
    // Create previews
    const previews = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result);
        if (previews.length === files.length) {
          setFilePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const fakeEvent = { target: { files: files } };
      handleFileSelect(fakeEvent);
    }
  };

  const removeFile = (index) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...filePreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setSelectedFiles(newFiles);
    setFilePreviews(newPreviews);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !user || !profileId) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const groupId = crypto.randomUUID ? crypto.randomUUID() : 
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const uploadedUrls = [];
      let completed = 0;

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${groupId}/${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
        const { path } = await uploadFile('gallery', file, fileName);
        const url = getPublicUrl('gallery', path);
        uploadedUrls.push(url);
        
        completed++;
        setUploadProgress(Math.round((completed / selectedFiles.length) * 100));
      }

      const insertData = uploadedUrls.map((url, index) => ({
        user_id: profileId,
        image_url: url,
        caption: formData.caption,
        category: formData.category,
        memory_date: formData.memory_date || null,
        group_id: groupId,
        display_order: index
      }));

      const { data, error } = await supabase
        .from('gallery')
        .insert(insertData)
        .select();

      if (error) throw error;

      await fetchPhotos();
      setShowUpload(false);
      setSelectedFiles([]);
      setFilePreviews([]);
      setFormData({ caption: '', category: 'Special Moments', memory_date: '' });
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert(`✅ ${uploadedUrls.length} photo(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Error uploading photos: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this entire album?')) return;

    try {
      const groupPhotos = photos.filter(p => p.group_id === groupId);
      
      for (const photo of groupPhotos) {
        const path = photo.image_url.split('/').pop();
        await deleteFile('gallery', `${user.id}/${groupId}/${path}`);
      }

      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('group_id', groupId);

      if (error) throw error;

      await fetchPhotos();
      setSelectedGroup(null);
      alert('Album deleted successfully');
    } catch (error) {
      console.error('Error deleting album:', error);
      alert('Error deleting album: ' + error.message);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      const path = photo.image_url.split('/').pop();
      await deleteFile('gallery', `${user.id}/${photo.group_id}/${path}`);

      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      await fetchPhotos();
      if (selectedGroup) {
        const updatedGroup = groups.find(g => g.id === selectedGroup.id);
        if (updatedGroup && updatedGroup.items.length === 0) {
          setSelectedGroup(null);
        }
      }
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

  const openLightbox = (group) => {
    setSelectedGroup(group);
    setSelectedPhoto(group.items[0]);
  };

  const navigatePhoto = (direction) => {
    if (!selectedGroup) return;
    const currentIndex = selectedGroup.items.findIndex(p => p.id === selectedPhoto.id);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < selectedGroup.items.length) {
      setSelectedPhoto(selectedGroup.items[newIndex]);
    }
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      'Dates': '💕',
      'Travel': '✈️',
      'Food': '🍽️',
      'Monthsary': '💌',
      'Special Moments': '✨',
      'Random': '🎲',
      'Other': '📌'
    };
    return emojis[category] || '📸';
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
          📸 Our Gallery
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          Capturing our beautiful moments together
        </p>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            marginTop: '12px',
            padding: '10px 24px',
            background: 'var(--gradient-1)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'var(--transition)',
            boxShadow: '0 4px 16px rgba(56, 189, 248, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📤</span> Upload Photos
          <span style={{
            fontSize: '11px',
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: '400'
          }}>
            Multiple
          </span>
        </button>
      </div>

      {/* Gallery Grid */}
      {groups.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📷</span>
          <h3>No photos yet</h3>
          <p>Start creating memories together! You can upload multiple photos at once.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {groups.map((group, index) => (
            <div
              key={group.id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                transition: 'var(--transition)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-light)',
                animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
              }}
              onClick={() => openLightbox(group)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'var(--shadow-light)';
              }}
            >
              {/* Grid Preview */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: group.items.length >= 2 ? '1fr 1fr' : '1fr',
                gridTemplateRows: group.items.length >= 3 ? '1fr 1fr' : '1fr',
                gap: '2px',
                aspectRatio: '1',
                background: 'var(--bg-secondary)'
              }}>
                {group.items.slice(0, 4).map((photo, idx) => (
                  <div key={photo.id} style={{
                    overflow: 'hidden',
                    background: 'var(--bg-secondary)',
                    position: 'relative',
                    gridRow: idx === 0 && group.items.length === 3 ? '1 / 3' : 'auto',
                    gridColumn: idx === 0 && group.items.length === 3 ? '1 / 2' : 'auto'
                  }}>
                    <img
                      src={photo.image_url}
                      alt={photo.caption || 'Memory'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'var(--transition)'
                      }}
                    />
                    {idx === 3 && group.items.length > 4 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: '700'
                      }}>
                        +{group.items.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Info */}
              <div style={{ padding: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 12px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    color: 'var(--primary)',
                    fontWeight: '500'
                  }}>
                    {getCategoryEmoji(group.category)} {group.category}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)'
                  }}>
                    {group.items.length} photo{group.items.length > 1 ? 's' : ''}
                  </span>
                </div>
                {group.caption && (
                  <p style={{
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {group.caption}
                  </p>
                )}
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '12px'
                }}>
                  {formatDate(group.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal - COMPLETE UPDATED VERSION */}
      {showUpload && (
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
                  📸 Upload Photos
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginTop: '2px'
                }}>
                  Select multiple photos at once
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setSelectedFiles([]);
                  setFilePreviews([]);
                  setUploadProgress(0);
                  if (fileInputRef.current) fileInputRef.current.value = '';
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

            <form onSubmit={handleUpload}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* File Input with Multiple Indicator */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    <span>Select Photos</span>
                    <span style={{
                      fontSize: '11px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      color: 'var(--primary)'
                    }}>
                      📁 Multiple files allowed
                    </span>
                  </label>
                  <div
                    style={{
                      border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '12px',
                      padding: isDragging ? '40px 20px' : '30px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      background: isDragging ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.02)'
                    }}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      id="file-input"
                    />
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>
                      {isDragging ? '📥' : '🖼️'}
                    </span>
                    <p style={{ 
                      color: isDragging ? 'var(--primary)' : 'var(--text-secondary)', 
                      fontSize: '14px',
                      fontWeight: isDragging ? '600' : '400'
                    }}>
                      {isDragging ? 'Drop your photos here!' : 'Drag & drop or click to select photos'}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                      📸 Multiple photos allowed • Max 10MB each
                    </p>
                    <div style={{
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: 'var(--text-muted)'
                    }}>
                      <span>Supported: JPG, PNG, WEBP, GIF</span>
                    </div>
                  </div>
                </div>

                {/* Selected Files Counter */}
                {selectedFiles.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(56, 189, 248, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)'
                    }}>
                      📎 {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)'
                    }}>
                      {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1)} MB total
                    </span>
                  </div>
                )}

                {/* File Previews */}
                {filePreviews.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '8px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '8px',
                    background: 'rgba(10, 14, 26, 0.4)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {filePreviews.map((preview, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        group: 'group'
                      }}>
                        <img src={preview} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: 'rgba(0,0,0,0.6)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                          }}
                        >
                          ✕
                        </button>
                        <span style={{
                          position: 'absolute',
                          bottom: '2px',
                          left: '2px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: '9px',
                          padding: '1px 6px',
                          borderRadius: '3px'
                        }}>
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Caption */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    📝 Caption <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>(Shared for all photos)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.caption}
                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                    placeholder="What's this memory?"
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

                {/* Category */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    🏷️ Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{getCategoryEmoji(cat)} {cat}</option>
                    ))}
                  </select>
                </div>

                {/* Memory Date */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    📅 Memory Date
                  </label>
                  <input
                    type="date"
                    value={formData.memory_date}
                    onChange={(e) => setFormData({ ...formData, memory_date: e.target.value })}
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

                {/* Upload Progress */}
                {uploading && (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.05)',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginBottom: '4px'
                    }}>
                      <span>📤 Uploading {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''}...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        background: 'var(--gradient-1)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpload(false);
                      setSelectedFiles([]);
                      setFilePreviews([]);
                      setUploadProgress(0);
                      if (fileInputRef.current) fileInputRef.current.value = '';
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
                    disabled={uploading || selectedFiles.length === 0}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: (uploading || selectedFiles.length === 0) ? 'var(--text-muted)' : 'var(--gradient-1)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (uploading || selectedFiles.length === 0) ? 'not-allowed' : 'pointer',
                      transition: 'var(--transition)',
                      opacity: (uploading || selectedFiles.length === 0) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {uploading ? (
                      'Uploading...'
                    ) : (
                      <>
                        📤 Upload {selectedFiles.length > 0 ? selectedFiles.length : ''} {selectedFiles.length === 1 ? 'Photo' : selectedFiles.length > 1 ? 'Photos' : 'Photos'}
                      </>
                    )}
                  </button>
                </div>

                {/* Help Text */}
                <p style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: '4px'
                }}>
                  💡 Tip: You can select multiple photos by holding Ctrl (Windows) or Cmd (Mac) while clicking
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedGroup && selectedPhoto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '16px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            background: 'var(--bg-card)',
            borderRadius: 'var(--border-radius)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)'
          }}>
            <button
              onClick={() => {
                setSelectedGroup(null);
                setSelectedPhoto(null);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              ✕
            </button>

            {selectedGroup.items.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto(-1)}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '32px',
                    padding: '12px 16px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  ◀
                </button>
                <button
                  onClick={() => navigatePhoto(1)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '32px',
                    padding: '12px 16px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  ▶
                </button>
              </>
            )}

            <img
              src={selectedPhoto.image_url}
              alt={selectedPhoto.caption || 'Memory'}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                display: 'block'
              }}
            />

            <div style={{
              padding: '16px 20px',
              background: 'rgba(10, 14, 26, 0.9)',
              backdropFilter: 'blur(8px)'
            }}>
              {selectedGroup.caption && (
                <p style={{
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>
                  {selectedGroup.caption}
                </p>
              )}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}>
                <span>{getCategoryEmoji(selectedGroup.category)} {selectedGroup.category}</span>
                <span>•</span>
                <span>{formatDate(selectedPhoto.created_at)}</span>
                {selectedGroup.memory_date && (
                  <>
                    <span>•</span>
                    <span>📅 {formatDate(selectedGroup.memory_date)}</span>
                  </>
                )}
                <span>•</span>
                <span>
                  {selectedGroup.items.indexOf(selectedPhoto) + 1} / {selectedGroup.items.length}
                </span>
              </div>
              {(selectedPhoto.user_id === profileId || isAdmin) && (
                <button
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '6px',
                    color: '#f87171',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  🗑️ Delete Photo
                </button>
              )}
              {selectedGroup.items.length > 1 && (selectedGroup.items[0].user_id === profileId || isAdmin) && (
                <button
                  onClick={() => handleDeleteGroup(selectedGroup.id)}
                  style={{
                    marginTop: '8px',
                    marginLeft: '8px',
                    padding: '4px 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '6px',
                    color: '#f87171',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  🗑️ Delete Album
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;