import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload receipt file to Supabase Storage bucket 'receipts'
 * Returns the public URL or signed URL.
 */
export async function uploadReceiptToStorage(
  file: File,
  studentId: string
): Promise<{ url: string; path: string; fileType: string } | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop() || 'dat';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${studentId}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError.message);
      return null;
    }

    // Try public URL first
    const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(filePath);
    if (publicData?.publicUrl) {
      return { url: publicData.publicUrl, path: filePath, fileType: file.type };
    }

    // Otherwise create signed URL valid for 7 days
    const { data: signedData, error: signError } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    if (signedData?.signedUrl && !signError) {
      return { url: signedData.signedUrl, path: filePath, fileType: file.type };
    }

    return null;
  } catch (err) {
    console.warn('Storage upload exception:', err);
    return null;
  }
}

/**
 * Get public or signed URL for previewing a receipt
 */
export async function getReceiptPreviewUrl(storagePath: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !storagePath) {
    return null;
  }

  try {
    // 1. Try public URL
    const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }

    // 2. Fall back to signed URL
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(storagePath, 60 * 60 * 24); // 24 hours

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch {
    return null;
  }
}
