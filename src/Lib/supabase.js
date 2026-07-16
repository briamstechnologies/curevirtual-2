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

const client = (isValidUrl(supabaseUrl) && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabase = client || new Proxy({}, {
  get(target, prop) {
    if (prop === 'isPlaceholder') return true;
    throw new Error(
      "Supabase client is not initialized. Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your frontend environment variables."
    );
  }
});

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
  return signedData.signedUrl || signedData.signed;
}

/**
 * Upload a laboratory report to Supabase Storage 'license-documents' bucket.
 * Returns a long-term signed URL (1 year) for access by patients and doctors.
 *
 * @param {File}   file      - Browser File object
 * @param {string} labUserId - Logged-in lab user ID
 * @returns {Promise<string>} signedUrl valid for 1 year
 */
export async function uploadLabReport(file, labUserId) {
  if (!supabase) throw new Error('Supabase client not initialized');

  const ext = file.name.split('.').pop();
  const fileName = `lab-reports/${labUserId}/${Date.now()}_report.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('license-documents')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: signedData, error: signedError } = await supabase.storage
    .from('license-documents')
    .createSignedUrl(fileName, 31536000); // 1 year

  if (signedError) throw signedError;
  return signedData.signedUrl || signedData.signed;
}

