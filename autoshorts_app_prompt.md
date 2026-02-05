# AutoShorts: AI Video Generator & Scheduler - Complete App Specification

## Project Overview
Build a full-stack web application that generates short-form videos (30-60 seconds) from text or images using Gemini AI and renders them with Remotion. The app should support YouTube Shorts and Instagram Reels with automated scheduling and posting capabilities.

---

## Tech Stack Requirements

### Core Technologies
- **Frontend**: React 18+ with TypeScript
- **Video Rendering**: Remotion 4.x
- **AI Integration**: Google Gemini API (gemini-pro-vision for image analysis, gemini-pro for text generation)
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL for user data, video metadata, and queue management
- **Storage**: AWS S3 or similar for video assets and rendered outputs
- **Authentication**: OAuth 2.0 (Google, Email)
- **Scheduling**: Node-cron or Bull Queue for job scheduling
- **Social Media APIs**: YouTube Data API v3, Instagram Graph API

### Additional Dependencies
- TailwindCSS for styling
- Framer Motion for UI animations
- React Query for server state management
- Zustand for client state management
- Axios for API calls
- FFmpeg for video processing/compression

---

## Core Features & Implementation Details

### 1. Authentication & Onboarding
**User Flow:**
- Landing page with Google OAuth and Email sign-in
- First-time users see a simple onboarding modal explaining the app
- Redirect to dashboard after authentication

**Technical Implementation:**
```typescript
// Auth endpoints needed
POST /api/auth/google
POST /api/auth/email
GET /api/auth/verify
POST /api/auth/logout
```

### 2. Dashboard (Home Screen)
**UI Components:**
- **Header**: App logo, notification bell, user avatar
- **Credit Usage Card**: 
  - Shows `X/30` monthly credits with progress bar
  - Displays time until next reset
  - "Upgrade Plan" link
- **Next Post Schedule Card**:
  - Shows next scheduled post time (e.g., "7:00 PM")
  - Platform icons (YouTube/Instagram)
  - Status badge (Scheduled/Queued/Processing)
- **Detailed Usage Section**:
  - Percentage bar showing credit consumption
  - Link to subscription upgrade page
- **Connected Accounts Grid**:
  - Cards for YouTube and Instagram with connection status
  - Active/Inactive indicators
  - "Manage" button to connect/disconnect
- **Recent Activity List**:
  - Last 5 videos with thumbnails
  - Title, timestamp, platform icons
  - Status badges (Scheduled, Posted, Failed, Draft)
  - "View All" link to library
- **Floating Action Button** (bottom right):
  - Blue circular button with "+" icon
  - Opens video creation flow

**Design Specifications:**
- Use a clean, modern aesthetic with a light color scheme
- Primary color: Deep Blue (#0000FF or #0010FF)
- Secondary color: Purple gradient accents for premium features
- Card-based layout with soft shadows
- Typography: Use "DM Sans" or "Plus Jakarta Sans" for headings, "Inter" for body text
- Spacing: 16px base unit, 24px between major sections
- Border radius: 12px for cards, 24px for buttons

### 3. Video Creation Flow

#### Step 1: Create New Video Screen
**Form Fields:**
1. **Select Niche** (Dropdown):
   - Options: Technology, Gaming, Education, Comedy, Motivation, Science, Finance, Health, Travel, Food, etc.
   - Include search/filter functionality
   - Description text: "The main topic category for your generated content"

2. **Voiceover Language** (Dropdown):
   - Options: English (US), English (UK), Spanish, French, German, Hindi, Japanese, etc.
   - Show flag icons next to language names
   - Voice preview button (plays 2-3 second sample)

3. **Duration** (Toggle Buttons):
   - Two options: "30 Seconds" | "60 Seconds"
   - Default: 30 Seconds

4. **Visual Style** (Dropdown or Card Selection):
   - Options: Cinematic Realism, Animated Graphics, Stock Footage, AI Art, Minimalist, Documentary, etc.
   - Show thumbnail preview for each style
   - Description of what each style includes

5. **Content Source** (Tabs):
   - **Generate from Niche**: AI creates topic automatically
   - **Custom Prompt**: User enters specific topic/instructions
   - **Upload Image**: Image-to-video generation

**Generate Button:**
- Large, prominent blue button at bottom
- Text: "✨ Generate Video"
- Shows loading state with progress indicator

**Technical Implementation:**
```typescript
// API endpoint
POST /api/videos/generate
{
  niche: string,
  language: string,
  duration: 30 | 60,
  visualStyle: string,
  contentSource: {
    type: 'auto' | 'prompt' | 'image',
    data: string | File
  }
}

// Gemini Integration Process:
// 1. If auto: Use Gemini to generate engaging topic based on niche
// 2. Generate script using Gemini (with hooks, facts, call-to-action)
// 3. Generate image prompts for each scene (5-8 scenes for 30s, 10-15 for 60s)
// 4. Use Gemini vision for image-to-video to analyze and create narrative
// 5. Return structured data for Remotion rendering
```

#### Step 2: Generation Process
**UI Display:**
- Show progress modal with steps:
  1. "Analyzing your request..." (10%)
  2. "Generating script..." (30%)
  3. "Creating visual assets..." (60%)
  4. "Rendering video..." (85%)
  5. "Finalizing..." (100%)
- Animated loading indicator
- Estimated time remaining
- "Cancel" button (saves as draft)

#### Step 3: Review Result Screen
**Layout:**
- **Video Player** (center, vertical 9:16 format):
  - Custom video player with play/pause, scrubbing
  - Full-screen option
  - Video duration display (e.g., "0:58")
  - "View Full Screen" link
  - Generated timestamp ("Generated 2 minutes ago")

- **Auto Title** (editable text field):
  - AI-generated title with character count (max 100)
  - Edit icon
  - "Auto-generated" badge with magic wand icon

- **Caption** (editable textarea):
  - AI-generated caption with hooks and hashtags
  - Character counter (max 2200 for Instagram, 5000 for YouTube)
  - "Auto-generated" badge

- **Hashtags Section**:
  - Auto-generated hashtags as removable pills
  - "Suggest more" button to get additional hashtags from Gemini
  - Add custom hashtag input field

**Action Buttons:**
- **Regenerate** (outline button):
  - Creates new version with same parameters
  - Deducts 1 credit
- **Add to Queue** (primary blue button):
  - Opens scheduling modal

**Technical Implementation:**
```typescript
// Remotion Composition Structure
import { Composition } from 'remotion';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ShortVideo"
        component={ShortVideo}
        durationInFrames={1800} // 60 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

// ShortVideo Component should handle:
// - Scene transitions with animations
// - Text overlays (captions, facts)
// - Background music/audio
// - Voiceover synchronization
// - Visual effects based on style selection
```

### 4. Queue & Scheduling System

#### Queue Management Screen
**Layout:**
- **Auto-post Settings Card** (top):
  - Toggle: "Auto-post daily"
  - Time picker: Default 7:00 PM local time
  - "Edit" button

- **View Toggle**: List View | Calendar View

- **Upcoming Section**:
  - Shows next 3 scheduled posts
  - Each card shows:
    - Video thumbnail
    - Title
    - Scheduled date/time
    - Platform icons (YouTube, Instagram)
    - Status badge
    - Three-dot menu (Edit, Reschedule, Remove, View Details)

- **Past 7 Days Section**:
  - Posted videos with performance metrics
  - Click for detailed analytics

**Scheduling Modal:**
- **Date & Time Picker**
- **Platform Selection** (multi-select):
  - YouTube Shorts (checkbox)
  - Instagram Reels (checkbox)
  - Show if platform is connected/disconnected
- **Publish Settings**:
  - Public/Private/Unlisted (YouTube)
  - Feed/Reels (Instagram)
  - Playlist selection (YouTube)
- **Confirm button**

**Technical Implementation:**
```typescript
// Queue database schema
interface VideoQueue {
  id: string;
  userId: string;
  videoId: string;
  scheduledAt: Date;
  platforms: ('youtube' | 'instagram')[];
  status: 'queued' | 'processing' | 'posted' | 'failed';
  metadata: {
    title: string;
    caption: string;
    hashtags: string[];
    settings: PlatformSettings;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Cron job for posting
// Check every 5 minutes for videos scheduled within next 5 minutes
// Process and post to respective platforms
// Update status and send notification
```

### 5. Library (Past Videos)
**Features:**
- Grid view of all generated videos (past and drafts)
- Filter by: Status (All, Posted, Scheduled, Failed, Draft), Platform, Date Range
- Search by title
- Sort by: Date, Title, Performance
- Bulk actions: Delete, Re-queue, Export

**Video Card:**
- Thumbnail
- Title
- Date
- Platform icons
- Status badge
- Performance metrics (views, likes - if posted)
- Quick actions: View, Edit, Delete, Re-post

### 6. Social Media Integration

#### Connect Accounts Screen
**YouTube Connection:**
- Card showing YouTube icon
- Connection status indicator
- Description: "Sync your Shorts and schedule uploads automatically directly to your channel"
- "Connect YouTube" button (OAuth flow)
- If connected: Show connected channel name, subscriber count, "Disconnect" button

**Instagram Connection:**
- Card showing Instagram icon
- Connection status indicator
- Description: "Sync your Reels and schedule uploads automatically"
- "Connect Instagram" button (Facebook Login + Instagram permissions)
- If connected: Show username @username, "Account @autoshorts_ai is active. Ready to post", "Disconnect" button

**Security Note:**
- Lock icon with text: "SECURE CONNECTION"
- "We only ask for permission to upload videos. Your personal data is never shared."

**Technical Implementation:**
```typescript
// OAuth endpoints
GET /api/social/youtube/auth
GET /api/social/youtube/callback
POST /api/social/youtube/disconnect
GET /api/social/youtube/channels

GET /api/social/instagram/auth
GET /api/social/instagram/callback
POST /api/social/instagram/disconnect

// Posting endpoints
POST /api/social/youtube/upload
POST /api/social/instagram/upload

// Use official APIs:
// - YouTube Data API v3 for uploads
// - Instagram Graph API for Reels posting
// Store refresh tokens securely
```

### 7. Subscription & Billing

#### Subscription Plans Screen
**Header:**
- "Unlock the full power of AutoShorts"
- "Choose the plan that fits your content needs"

**Plan Toggle:** Monthly | Yearly (-20%)

**Plans:**
1. **Starter** (₹999/mo):
   - 30 videos/month
   - Auto-scheduling
   - Standard Support
   - Watermark on videos (small logo)
   - "Upgrade" button

2. **Pro** (₹2,999/mo) - MOST POPULAR badge:
   - 120 videos/month
   - No Watermark
   - Priority Support
   - HD Export (1080p)
   - Advanced analytics
   - Custom branding
   - "Upgrade" button (primary style)

3. **Agency** (₹7,999/mo):
   - Unlimited videos
   - Team Access (up to 5 users)
   - Dedicated Manager
   - API Access
   - White-label option
   - "Upgrade" button

**Current Usage Display** (bottom):
- "Credits used: 5/10"
- Progress bar
- "Free Trial" badge

**Payment Integration:**
- Razorpay/Stripe integration
- Support INR and USD
- Monthly/Yearly billing
- Auto-renewal with email reminders

### 8. Settings & Profile
**Sections:**
- **Account**: Name, Email, Password change
- **Preferences**:
  - Default niche
  - Default language
  - Default duration
  - Default visual style
  - Auto-post time
- **Connected Accounts**: Manage YouTube/Instagram
- **Notifications**: Email, Push preferences
- **Subscription**: Current plan, Billing history, Cancel subscription
- **API Keys**: For Agency plan users

---

## Remotion Video Generation Architecture

### Video Composition Structure
```typescript
// Scene-based composition
interface VideoScene {
  id: string;
  startFrame: number;
  durationFrames: number;
  type: 'intro' | 'content' | 'outro';
  background: {
    type: 'image' | 'video' | 'gradient' | 'generated';
    source: string;
    effects?: Effect[];
  };
  text?: {
    content: string;
    position: Position;
    animation: Animation;
    style: TextStyle;
  };
  audio?: {
    voiceover?: string;
    backgroundMusic?: string;
    soundEffects?: string[];
  };
  transitions?: Transition;
}

// Main Video Component
const ShortVideo: React.FC<{
  scenes: VideoScene[];
  metadata: VideoMetadata;
}> = ({ scenes, metadata }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {scenes.map((scene) => (
        <Scene
          key={scene.id}
          scene={scene}
          frame={frame}
          fps={fps}
        />
      ))}
      <AudioTrack scenes={scenes} />
    </AbsoluteFill>
  );
};
```

### Gemini Integration for Content Generation

**Script Generation Prompt Template:**
```
You are a viral short-form video script writer. Create an engaging {duration}-second video script about {topic} in the {niche} category.

Requirements:
- Hook viewer in first 2 seconds
- Include 3-5 fascinating facts or insights
- Use simple, conversational language
- End with a call-to-action (like, follow, comment)
- Format as JSON with scenes

Output format:
{
  "title": "string",
  "hook": "string",
  "scenes": [
    {
      "duration": number,
      "narration": "string",
      "visualDescription": "string",
      "textOverlay": "string"
    }
  ],
  "caption": "string",
  "hashtags": ["string"]
}
```

**Image Generation Prompts:**
```typescript
// For each scene, generate a detailed image prompt
const generateImagePrompt = (scene: Scene, style: VisualStyle) => {
  return `Create a high-quality, ${style} image for a video scene. 
  Scene description: ${scene.visualDescription}
  Style requirements: ${getStyleRequirements(style)}
  Format: Vertical 9:16 aspect ratio, vibrant colors, no text
  Mood: ${scene.mood}`;
};

// Then use Gemini's Imagen or DALL-E 3 for generation
// Or use Pexels/Unsplash API for stock footage
```

### Video Rendering Pipeline
```typescript
// Backend rendering process
async function renderVideo(videoId: string) {
  try {
    // 1. Fetch video data and scenes from database
    const videoData = await db.videos.findById(videoId);
    
    // 2. Download/prepare all assets (images, audio, fonts)
    await prepareAssets(videoData.scenes);
    
    // 3. Render video using Remotion Lambda or local server
    const { renderId } = await renderMedia({
      composition: 'ShortVideo',
      serveUrl: getServeUrl(),
      inputProps: videoData,
      codec: 'h264',
      outputFormat: 'mp4',
      frameRange: [0, videoData.durationInFrames],
    });
    
    // 4. Wait for render completion
    const result = await waitForRenderCompletion(renderId);
    
    // 5. Upload to S3
    const videoUrl = await uploadToS3(result.outputFile, videoId);
    
    // 6. Update database with video URL
    await db.videos.update(videoId, { 
      status: 'completed',
      url: videoUrl 
    });
    
    // 7. Generate thumbnail
    const thumbnail = await generateThumbnail(result.outputFile);
    await uploadToS3(thumbnail, `${videoId}_thumb`);
    
    return { success: true, videoUrl };
  } catch (error) {
    await db.videos.update(videoId, { 
      status: 'failed',
      error: error.message 
    });
    throw error;
  }
}
```

---

## Design System Specifications

### Color Palette
```css
:root {
  /* Primary */
  --primary-blue: #0010FF;
  --primary-blue-light: #3347FF;
  --primary-blue-dark: #0000CC;
  
  /* Secondary */
  --purple: #7C3AED;
  --purple-light: #A78BFA;
  
  /* Neutral */
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-500: #6B7280;
  --gray-700: #374151;
  --gray-900: #111827;
  
  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;
  
  /* Status */
  --status-scheduled: #FEF3C7;
  --status-posted: #D1FAE5;
  --status-failed: #FEE2E2;
  --status-draft: #E5E7EB;
}
```

### Typography Scale
```css
/* Headings */
.text-h1 { font-size: 32px; font-weight: 700; line-height: 1.2; }
.text-h2 { font-size: 24px; font-weight: 600; line-height: 1.3; }
.text-h3 { font-size: 20px; font-weight: 600; line-height: 1.4; }

/* Body */
.text-body { font-size: 16px; font-weight: 400; line-height: 1.5; }
.text-small { font-size: 14px; font-weight: 400; line-height: 1.5; }
.text-caption { font-size: 12px; font-weight: 400; line-height: 1.4; }

/* Special */
.text-button { font-size: 16px; font-weight: 600; letter-spacing: 0.02em; }
```

### Component Patterns

**Button Styles:**
```tsx
// Primary Button
<button className="bg-primary-blue text-white px-6 py-3 rounded-full 
  hover:bg-primary-blue-dark transition-all duration-200 
  shadow-lg hover:shadow-xl transform hover:scale-105">
  Generate Video
</button>

// Secondary Button
<button className="bg-gray-100 text-gray-900 px-6 py-3 rounded-full 
  hover:bg-gray-200 transition-all duration-200">
  Cancel
</button>

// Icon Button
<button className="w-12 h-12 rounded-full bg-primary-blue text-white 
  flex items-center justify-center shadow-lg hover:shadow-xl 
  transform hover:scale-110 transition-all">
  <PlusIcon />
</button>
```

**Card Component:**
```tsx
<div className="bg-white rounded-xl shadow-sm hover:shadow-md 
  transition-shadow duration-200 p-6 border border-gray-100">
  {/* Card content */}
</div>
```

**Status Badge:**
```tsx
const statusColors = {
  scheduled: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
};

<span className={`px-3 py-1 rounded-full text-xs font-medium 
  ${statusColors[status]}`}>
  {status.toUpperCase()}
</span>
```

### Animation Guidelines
```tsx
// Page transitions (Framer Motion)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Page content */}
</motion.div>

// Card hover effect
<motion.div
  whileHover={{ scale: 1.02, y: -4 }}
  transition={{ duration: 0.2 }}
>
  {/* Card content */}
</motion.div>

// Button click feedback
<motion.button
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.05 }}
>
  Click me
</motion.button>
```

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  credits_remaining INT DEFAULT 10,
  credits_reset_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  caption TEXT,
  hashtags TEXT[],
  niche VARCHAR(100),
  language VARCHAR(50),
  duration INT, -- in seconds
  visual_style VARCHAR(100),
  status VARCHAR(50) DEFAULT 'generating', -- generating, completed, failed
  video_url TEXT,
  thumbnail_url TEXT,
  scenes JSONB, -- stores scene data
  metadata JSONB, -- stores additional info
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Queue
CREATE TABLE video_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  platforms TEXT[], -- ['youtube', 'instagram']
  status VARCHAR(50) DEFAULT 'queued', -- queued, processing, posted, failed
  platform_ids JSONB, -- stores posted video IDs from each platform
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Connected Accounts
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'youtube', 'instagram'
  platform_user_id VARCHAR(255),
  platform_username VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL, -- 'starter', 'pro', 'agency'
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
  billing_period VARCHAR(20), -- 'monthly', 'yearly'
  amount DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'INR',
  next_billing_date TIMESTAMP,
  payment_provider VARCHAR(50), -- 'razorpay', 'stripe'
  payment_provider_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics (optional for future)
CREATE TABLE video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  watch_time_seconds INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints Reference

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/profile
```

### Videos
```
POST   /api/videos/generate          # Generate new video
GET    /api/videos                   # List user's videos
GET    /api/videos/:id               # Get specific video
PUT    /api/videos/:id               # Update video metadata
DELETE /api/videos/:id               # Delete video
GET    /api/videos/:id/download      # Download video file
POST   /api/videos/:id/regenerate    # Regenerate video
```

### Queue
```
GET    /api/queue                    # Get user's queue
POST   /api/queue                    # Add video to queue
PUT    /api/queue/:id                # Update scheduled item
DELETE /api/queue/:id                # Remove from queue
POST   /api/queue/:id/reschedule     # Reschedule video
```

### Social Media
```
GET    /api/social/youtube/auth
GET    /api/social/youtube/callback
POST   /api/social/youtube/disconnect
GET    /api/social/youtube/channels

GET    /api/social/instagram/auth
GET    /api/social/instagram/callback
POST   /api/social/instagram/disconnect

POST   /api/social/post/:videoId     # Manual post
```

### Subscription
```
GET    /api/subscriptions            # Get user subscription
POST   /api/subscriptions/create     # Create subscription
POST   /api/subscriptions/cancel     # Cancel subscription
GET    /api/subscriptions/plans      # Get available plans
POST   /api/webhooks/payment         # Payment provider webhook
```

### Admin (optional)
```
GET    /api/admin/users
GET    /api/admin/analytics
POST   /api/admin/credits/adjust
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Set up project structure (frontend + backend)
- Implement authentication system
- Create database schema and migrations
- Build basic UI layout and navigation
- Set up Remotion project structure

### Phase 2: Core Video Generation (Week 3-4)
- Integrate Gemini API for script generation
- Build video creation form and flow
- Implement Remotion video compositions
- Create basic scene templates
- Set up video rendering pipeline
- Build video review screen

### Phase 3: Scheduling & Queue (Week 5)
- Implement queue management system
- Build scheduling interface
- Set up cron jobs for automated posting
- Create queue database and API

### Phase 4: Social Media Integration (Week 6)
- Implement YouTube OAuth and posting
- Implement Instagram OAuth and posting
- Build connected accounts management
- Test posting workflow end-to-end

### Phase 5: Subscription & Billing (Week 7)
- Integrate payment provider (Razorpay/Stripe)
- Build subscription management
- Implement credit system
- Create upgrade/downgrade flows
- Set up webhook handlers

### Phase 6: Polish & Launch (Week 8)
- Add animations and micro-interactions
- Implement error handling and loading states
- Create onboarding flow
- Add analytics dashboard (optional)
- Performance optimization
- Security audit
- User testing and bug fixes

---

## Key User Flows

### Flow 1: First-Time User Journey
1. Land on homepage → Click "Continue with Google"
2. Authenticate → See onboarding modal
3. Redirected to dashboard → Prompted to connect YouTube/Instagram
4. Click FAB → Create first video
5. Review result → Add to queue
6. Set schedule → Video posted automatically

### Flow 2: Creating and Scheduling a Video
1. Dashboard → Click "+" FAB
2. Select niche, language, duration, style
3. Click "Generate Video"
4. Wait for generation (1-2 minutes)
5. Review video, edit title/caption
6. Click "Add to Queue"
7. Select platforms, set date/time
8. Confirm → Video added to schedule

### Flow 3: Managing Queue
1. Navigate to Queue tab
2. View upcoming scheduled posts
3. Click three-dot menu on video
4. Select "Reschedule"
5. Choose new date/time
6. Confirm → Schedule updated

---

## Error Handling & Edge Cases

### Video Generation Failures
- If Gemini API fails: Retry 3 times with exponential backoff
- If rendering fails: Store draft, notify user, offer manual retry
- If credit limit reached: Show upgrade modal

### Social Media Posting Failures
- If token expired: Attempt refresh, else notify user to reconnect
- If upload fails: Retry 2 times, then mark as failed and notify
- If platform API down: Queue for retry, notify user

### Rate Limiting
- Implement user-level rate limiting (e.g., max 5 generations per hour)
- Queue system should prevent concurrent posts to same platform

### Data Validation
- Validate all user inputs on frontend and backend
- Sanitize hashtags (remove special characters, ensure # prefix)
- Verify video file size before upload (<100MB)

---

## Performance Considerations

### Video Rendering
- Use Remotion Lambda for serverless rendering (scales better)
- Implement render queue to handle multiple concurrent renders
- Cache frequently used assets (fonts, stock images, music)
- Optimize video file size (target <50MB per video)

### Frontend Performance
- Code-split routes for faster initial load
- Lazy load video thumbnails and previews
- Implement virtual scrolling for large video libraries
- Use React Query for efficient data fetching and caching

### Database Optimization
- Index frequently queried fields (user_id, status, scheduled_at)
- Implement database connection pooling
- Use database transactions for critical operations
- Archive old videos (>90 days) to separate table

---

## Security Best Practices

### Authentication
- Use secure HTTP-only cookies for session management
- Implement CSRF protection
- Hash passwords with bcrypt (if using email auth)
- Enforce strong password requirements

### API Security
- Implement rate limiting (e.g., 100 requests per 15 minutes)
- Validate and sanitize all inputs
- Use HTTPS only
- Implement proper CORS policies

### Data Protection
- Encrypt sensitive data at rest (access tokens, refresh tokens)
- Never expose API keys in frontend code
- Implement row-level security in database
- Regular security audits and dependency updates

### Social Media Tokens
- Store tokens encrypted in database
- Implement automatic token refresh
- Revoke tokens on account disconnect
- Monitor for suspicious activity

---

## Testing Strategy

### Unit Tests
- Test utility functions (video processing, text generation)
- Test React components with React Testing Library
- Test API endpoints with Jest + Supertest

### Integration Tests
- Test complete user flows (signup → create video → schedule)
- Test Gemini API integration
- Test social media posting workflow
- Test payment webhook handling

### End-to-End Tests
- Use Playwright or Cypress
- Test critical paths: signup, video creation, scheduling, posting
- Test on multiple browsers and devices

---

## Monitoring & Analytics

### Application Monitoring
- Implement error tracking (Sentry or similar)
- Log important events (video generated, posted, failed)
- Monitor API response times
- Track render completion times

### Business Metrics
- Track user signups and conversions
- Monitor video generation success rate
- Track subscription upgrades/downgrades
- Monitor credit usage patterns

### Alerts
- Alert on high error rates
- Alert on failed social media posts
- Alert on rendering failures
- Alert on payment failures

---

## Future Enhancements

### Short-term (Next 3 months)
- Multi-language support for UI
- Video templates library
- Batch video generation
- Enhanced analytics dashboard
- Video editing capabilities (trim, add music)

### Medium-term (6 months)
- AI-powered niche suggestions based on trending topics
- Advanced scheduling (optimal posting times)
- Team collaboration features
- TikTok integration
- Video A/B testing

### Long-term (12+ months)
- Mobile apps (iOS, Android)
- AI avatar integration for talking head videos
- White-label solution for agencies
- Marketplace for video templates
- API for developers

---

## Success Metrics

### Technical KPIs
- Video generation time: <2 minutes for 60s video
- Render success rate: >95%
- Social media posting success rate: >98%
- API uptime: >99.9%

### Business KPIs
- User retention rate: >40% after 30 days
- Free-to-paid conversion: >5%
- Average videos per user per month: >10
- Customer satisfaction score: >4.5/5

---

## Conclusion

This specification provides a comprehensive blueprint for building AutoShorts. The app combines AI-powered video generation with practical scheduling and social media integration, targeting content creators who want to automate their short-form video production.

**Key Differentiators:**
1. Fully automated video generation using Gemini AI
2. High-quality rendering with Remotion
3. Seamless social media integration
4. Smart scheduling system
5. Professional UI/UX design

**Next Steps:**
1. Review and approve this specification
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular sprint planning and reviews
5. Beta testing with select users
6. Launch MVP

For questions or clarifications about any aspect of this specification, please refer to the relevant section or request additional details.
