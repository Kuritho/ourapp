import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    end_date: '',
    end_time: '',
    location: '',
    category: 'date',
    is_all_day: false,
    is_recurring: false,
    recurring_type: '',
    reminder_minutes: 60,
    is_public: true
  });

  const categories = [
    { value: 'anniversary', label: '🎉 Anniversary', color: '#f43f5e' },
    { value: 'birthday', label: '🎂 Birthday', color: '#f59e0b' },
    { value: 'date', label: '💕 Date', color: '#ec4899' },
    { value: 'trip', label: '✈️ Trip', color: '#3b82f6' },
    { value: 'celebration', label: '🎊 Celebration', color: '#8b5cf6' },
    { value: 'reminder', label: '📌 Reminder', color: '#06b6d4' },
    { value: 'other', label: '📅 Other', color: '#6b7280' }
  ];

  const recurringTypes = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

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
        console.log('Profile ID fetched:', data.id);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch events
  useEffect(() => {
    if (!profileId) return;
    fetchEvents();
  }, [profileId, currentDate]);

  const fetchEvents = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', profileId)
        .gte('event_date', firstDay.toISOString().split('T')[0])
        .lte('event_date', lastDay.toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
      console.log('Events fetched:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setFormData({ 
      ...formData, 
      event_date: date.toISOString().split('T')[0] 
    });
    setShowEventForm(true);
  };

  const handleEventClick = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      event_time: event.event_time || '',
      end_date: event.end_date || '',
      end_time: event.end_time || '',
      location: event.location || '',
      category: event.category || 'date',
      is_all_day: event.is_all_day || false,
      is_recurring: event.is_recurring || false,
      recurring_type: event.recurring_type || '',
      reminder_minutes: event.reminder_minutes || 60,
      is_public: event.is_public !== undefined ? event.is_public : true
    });
    setShowEventForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profileId) {
      alert('Please wait, loading your profile...');
      return;
    }

    if (!formData.title.trim()) {
      alert('Please enter a title for the event');
      return;
    }

    if (!formData.event_date) {
      alert('Please select a date for the event');
      return;
    }

    try {
      const eventData = {
        user_id: profileId,
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        event_date: formData.event_date,
        event_time: formData.event_time || null,
        end_date: formData.end_date || null,
        end_time: formData.end_time || null,
        location: formData.location?.trim() || null,
        category: formData.category,
        is_all_day: formData.is_all_day,
        is_recurring: formData.is_recurring,
        recurring_type: formData.is_recurring ? formData.recurring_type : null,
        reminder_minutes: parseInt(formData.reminder_minutes) || 60,
        is_public: formData.is_public,
        created_by: profileId
      };

      console.log('Saving event data:', eventData);

      let result;
      if (editingEvent) {
        // Update existing event
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        console.log('Event updated:', result);
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select()
          .single();
        if (error) throw error;
        result = data;
        console.log('Event created:', result);
      }

      await fetchEvents();
      setShowEventForm(false);
      setSelectedDate(null);
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        event_date: '',
        event_time: '',
        end_date: '',
        end_time: '',
        location: '',
        category: 'date',
        is_all_day: false,
        is_recurring: false,
        recurring_type: '',
        reminder_minutes: 60,
        is_public: true
      });
      alert(editingEvent ? 'Event updated successfully! 🎉' : 'Event created successfully! 🎉');
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event: ' + error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      await fetchEvents();
      setShowEventForm(false);
      setEditingEvent(null);
      alert('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event: ' + error.message);
    }
  };

  // Calendar rendering helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.event_date === dateStr);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getCategoryColor = (category) => {
    const found = categories.find(c => c.value === category);
    return found ? found.color : '#6b7280';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '0 auto',
      padding: '16px',
      background: 'var(--bg-card)',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-light)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: '700',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>📅</span> Calendar
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Plan and track your special moments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null);
            const today = new Date();
            setFormData({
              ...formData,
              event_date: today.toISOString().split('T')[0]
            });
            setShowEventForm(true);
          }}
          style={{
            padding: '10px 20px',
            background: 'var(--gradient-1)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>+</span> Add Event
        </button>
      </div>

      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '0 4px'
      }}>
        <button
          onClick={() => navigateMonth(-1)}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition)',
            fontSize: '18px'
          }}
        >
          ◀
        </button>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--text-primary)'
        }}>
          {monthName} {year}
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition)',
            fontSize: '18px'
          }}
        >
          ▶
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginBottom: '16px'
      }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={index} style={{
            padding: '8px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '0.5px'
          }}>
            {day}
          </div>
        ))}

        {/* Empty cells for padding */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} style={{ padding: '8px' }} />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const isToday = date.toDateString() === new Date().toDateString();
          const dayEvents = getEventsForDate(date);
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={day}
              onClick={() => handleDateClick(date)}
              style={{
                padding: '6px 4px',
                textAlign: 'center',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: isToday ? '2px solid var(--primary)' : '1px solid transparent',
                position: 'relative',
                minHeight: '56px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.06)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{
                fontSize: '14px',
                fontWeight: isToday ? '700' : '400',
                color: isToday ? 'var(--primary)' : 'var(--text-primary)'
              }}>
                {day}
              </span>
              {dayEvents.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '3px',
                  marginTop: '4px',
                  flexWrap: 'wrap'
                }}>
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: getCategoryColor(event.category),
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{
                      fontSize: '8px',
                      color: 'var(--text-muted)'
                    }}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming Events List */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--border-radius-sm)',
        border: '1px solid var(--border-color)'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          marginBottom: '12px',
          letterSpacing: '0.5px'
        }}>
          📋 Upcoming Events
        </h4>
        {events.length === 0 ? (
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px 0'
          }}>
            No events planned. Start adding your special moments! 💕
          </p>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{
                  width: '4px',
                  height: '40px',
                  borderRadius: '2px',
                  background: getCategoryColor(event.category)
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    {event.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <span>{formatDate(event.event_date)}</span>
                    {event.event_time && (
                      <span>⏰ {formatTime(event.event_time)}</span>
                    )}
                    {event.location && (
                      <span>📍 {event.location}</span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: '20px'
                }}>
                  {categories.find(c => c.value === event.category)?.label.split(' ')[0] || '📅'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
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
            maxWidth: '560px',
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
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'var(--text-primary)'
              }}>
                {editingEvent ? '✏️ Edit Event' : '📅 Create Event'}
              </h3>
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
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

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="What's the event?"
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
                    Category
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
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '4px'
                    }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
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
                      Time
                    </label>
                    <input
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
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
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Where is this happening?"
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details about this event..."
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

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.is_all_day}
                      onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
                    />
                    All Day
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    />
                    Recurring
                  </label>
                </div>

                {formData.is_recurring && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '4px'
                    }}>
                      Recurring Type
                    </label>
                    <select
                      value={formData.recurring_type}
                      onChange={(e) => setFormData({ ...formData, recurring_type: e.target.value })}
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
                      <option value="">Select type</option>
                      {recurringTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  {editingEvent && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(editingEvent.id)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    style={{
                      flex: editingEvent ? 1 : 1,
                      padding: '12px',
                      background: 'var(--gradient-1)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    {editingEvent ? '💾 Update Event' : '✨ Create Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;