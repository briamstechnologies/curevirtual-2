import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Strict validation to prevent hard crash from invalid URL strings (e.g. "undefined")
const isValidUrl = (url) => {
  try {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  } catch {
    return false;
  }
};

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  console.error('❌ Supabase configuration is invalid or missing! URL:', supabaseUrl);
}

export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Upload a license document to Supabase Storage 'license-documents' bucket.
 * Returns a 24h signed URL for admin review.
 * NOTE: This is a client-side helper; the actual production upload path is
 * handled server-side via //registration-requests/submit (multipart).
 *
 * @param {File}   file   - Browser File object
 * @param {string} userId - Authenticated user ID
 * @param {string} role   - 'DOCTOR' | 'PHARMACY' | 'LABORATORY'
 * @returns {Promise<string>} signedUrl valid for 24 hours
 */
export async function uploadLicenseDocument(file, userId, role) {
  if (!supabase) throw new Error('Supabase client not initialized');

  const ext = file.name.split('.').pop();
  const fileName = `${role.toLowerCase()}/${userId}/license.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('license-documents')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: signedData, error: signedError } = await supabase.storage
    .from('license-documents')
    .createSignedUrl(fileName, 86400); // 24 hours

  if (signedError) throw signedError;
  return signedData.signed;
}
