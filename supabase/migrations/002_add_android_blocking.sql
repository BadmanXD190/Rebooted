-- Add android_blocking_enabled column to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS android_blocking_enabled boolean NOT NULL DEFAULT false;

