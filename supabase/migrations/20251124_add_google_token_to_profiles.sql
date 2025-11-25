-- Add google_refresh_token to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
