-- 003_video_queue_metadata.sql
-- Add metadata column to video_queue table

ALTER TABLE video_queue ADD COLUMN metadata TEXT;
