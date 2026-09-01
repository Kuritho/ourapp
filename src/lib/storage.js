import { supabase } from './supabaseClient';

// Storage bucket names
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  GALLERY: 'gallery',
  VIDEOS: 'videos',
  MONTHSARY: 'monthsary',
  REWARDS: 'rewards'
};

// Upload file to Supabase Storage
export const uploadFile = async (bucket, file, path) => {
  try {
    console.log(`Uploading to bucket: ${bucket}, path: ${path}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (error) {
      console.error('Upload error details:', error);
      throw error;
    }
    
    console.log('Upload successful:', data);
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Get public URL for file
export const getPublicUrl = (bucket, path) => {
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    if (!data || !data.publicUrl) {
      console.error('No public URL returned for:', bucket, path);
      return null;
    }
    
    return data.publicUrl;
  } catch (error) {
    console.error('Get public URL error:', error);
    return null;
  }
};

// Delete file from storage
export const deleteFile = async (bucket, path) => {
  try {
    console.log(`Deleting from bucket: ${bucket}, path: ${path}`);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      console.error('Delete error details:', error);
      throw error;
    }
    
    console.log('Delete successful');
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

// Get signed URL for temporary access
export const getSignedUrl = async (bucket, path, expiresIn = 60) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Signed URL error:', error);
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Signed URL error:', error);
    throw error;
  }
};

// List files in a bucket
export const listFiles = async (bucket, path = '') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);
    
    if (error) {
      console.error('List files error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};

// Check if bucket exists
export const bucketExists = async (bucket) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1 });
    
    if (error) {
      console.error(`Bucket ${bucket} does not exist or is not accessible:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};