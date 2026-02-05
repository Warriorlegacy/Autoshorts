import { Video as APIVideo } from '../api/videos';

export interface User {
  id: string;
  email: string;
  name?: string;
  credits_remaining?: number;
  subscription_tier?: string;
}

export type Video = APIVideo;

export interface QueuedVideo {
  id: string;
  videoId: string;
  title: string;
  platforms: string[];
  scheduledAt: string;
  status: 'queued' | 'processing' | 'posted' | 'failed';
  createdAt: string;
}
