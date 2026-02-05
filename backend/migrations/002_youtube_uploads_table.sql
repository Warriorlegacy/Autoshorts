-- 002_youtube_uploads_table.sql
-- YouTube Uploads tracking table

CREATE TABLE IF NOT EXISTS youtube_uploads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  upload_id TEXT NOT NULL,
  video_id TEXT,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT datetime('now'),
  updated_at TIMESTAMP DEFAULT datetime('now')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_youtube_uploads_user_id ON youtube_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_uploads_upload_id ON youtube_uploads(upload_id);
