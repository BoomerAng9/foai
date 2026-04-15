function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  gcsBucket: required('GCS_AVATAR_BUCKET'),
  gcsPublicUrl: required('GCS_PUBLIC_URL'), // e.g. https://storage.googleapis.com/<bucket> or CDN
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_KEY'),
  // Vertex AI Vision uses GOOGLE_APPLICATION_CREDENTIALS automatically on Cloud Run
};

export const CHARTER = {
  UPLOAD_SUCCESS: 'Avatar uploaded successfully',
  MODERATION_PASSED: 'Image passed content safety checks',
  MODERATION_REJECTED: 'Please upload a professional photo suitable for a business profile',
  INVALID_FILE: 'Invalid file format. Please upload JPG, PNG, or WebP.',
  FILE_TOO_LARGE: 'File size exceeds 2MB limit.',
  UNAUTHORIZED: 'Authentication required.',
  SERVER_ERROR: 'Technical issue occurred. Please try again later.',
};
