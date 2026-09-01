import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Session error:', error);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Fetch profile error:', error);
        return null;
      }

      setProfile(data);
      setIsAdmin(data?.role === 'admin');
      return data;
    } catch (error) {
      console.error('Fetch profile error:', error);
      return null;
    }
  };

  const signUp = async (email, password, username, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
            full_name: fullName || email.split('@')[0]
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      toast.success('Registration successful! Please verify your email.');
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Signin error:', error);
        throw error;
      }

      toast.success('Welcome back! ❤️');
      return data;
    } catch (error) {
      console.error('Signin error:', error);
      toast.error(error.message || 'Invalid login credentials');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      toast.success('Goodbye! See you soon ❤️');
    } catch (error) {
      console.error('Signout error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      toast.success('Password updated successfully!');
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const updateProfile = async (updates) => {
    try {
      // Remove any fields that shouldn't be updated
      const { id, user_id, created_at, updated_at, ...safeUpdates } = updates;
      
      console.log('Updating profile with:', safeUpdates);
      
      const { error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      await fetchProfile(user.id);
      toast.success('Profile updated! ❤️');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      toast.success('Account deleted. We\'ll miss you ❤️');
      return true;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    deleteAccount,
    fetchProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};