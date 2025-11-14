-- Add handle (unique username) field to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS handle VARCHAR(255) UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_handle ON user_profiles(handle);
