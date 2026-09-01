import { supabase } from '../lib/supabaseClient';

export const checkBuckets = async () => {
  const buckets = ['avatars', 'gallery', 'videos', 'monthsary', 'rewards'];
  const results = {};
  
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1 });
      
      results[bucket] = {
        exists: !error,
        error: error ? error.message : null
      };
    } catch (error) {
      results[bucket] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  console.log('Bucket status:', results);
  return results;
};