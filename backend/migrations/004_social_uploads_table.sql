-- 004_social_uploads_table.sql
-- Social media uploads tracking table

CREATE TABLE IF NOT EXISTS social_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL,
  upload_id TEXT,
  video_id TEXT REFERENCES videos(id) ON DELETE SET NULL,
  queue_item_id TEXT REFERENCES video_queue(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for social_uploads
CREATE INDEX IF NOT EXISTS idx_social_uploads_user_id ON social_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_social_uploads_platform ON social_uploads(platform);
CREATE INDEX IF NOT EXISTS idx_social_uploads_status ON social_uploads(status);
CREATE INDEX IF NOT EXISTS idx_social_uploads_created_at ON social_uploads(created_at);

-- Add metadata column to video_queue if not exists
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS, so we use a workaround
PRAGMA table_info(video_queue);
