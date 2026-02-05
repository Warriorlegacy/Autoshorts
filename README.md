# AutoShorts - AI Video Generator & Scheduler

An intelligent, full-stack application that generates short-form videos (Shorts/Reels) using AI, with scheduling capabilities for YouTube Shorts and Instagram Reels.

## 🎯 Project Overview

AutoShorts automates the creation of engaging short-form videos by:
1. Generating video scripts using Google Gemini AI
2. Rendering videos with Remotion (React-based video engine)
3. Allowing users to schedule posts to YouTube Shorts and Instagram
4. Tracking video analytics and performance

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS v4** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend
- **Node.js + Express** - REST API
- **TypeScript** - Type safety
- **SQLite (better-sqlite3)** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Google Generative AI** - AI script generation
- **Remotion** - Video rendering

## 📁 Project Structure

```
AutoShorts/
├── frontend/                 # React app
│   ├── src/
│   │   ├── screens/         # Page components (Dashboard, Library, Queue, Settings, etc)
│   │   ├── components/      # Reusable components
│   │   ├── store/           # Zustand stores (auth, videos)
│   │   ├── api/             # API clients
│   │   ├── hooks/           # Custom hooks
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main routing
│   └── package.json
│
├── backend/                  # Express API
│   ├── src/
│   │   ├── routes/          # API routes (auth, videos)
│   │   ├── controllers/     # Business logic
│   │   ├── services/        # External services (Gemini, Rendering)
│   │   ├── middleware/      # Auth, error handling
│   │   ├── config/          # Database config
│   │   ├── video-engine/    # Remotion compositions
│   │   └── server.ts        # Express app setup
│   ├── migrations/          # Database schema
│   ├── public/             # Static files & video renders
│   └── package.json
│
└── assets/                  # Shared assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
cd /d/AutoShorts

# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

2. **Configure environment**
```bash
# backend/.env (already configured)
NODE_ENV=development
PORT=3001
JWT_SECRET=super_secret_key_for_dev
GEMINI_API_KEY=your_gemini_api_key_here  # Optional - uses mock data if not set
```

### Running the Application

**Terminal 1 - Backend (Port 3001)**
```bash
cd backend
npm run dev
```

Expected output:
```
✓ SQLite database initialized at D:\AutoShorts\backend\autoshorts.db
✓ Database connection successful. Current time: 2026-01-29 16:09:26
✓ Database schema initialized
✓ Server is running on http://localhost:3001
```

**Terminal 2 - Frontend (Port 5175)**
```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v7.3.1 ready in 435 ms

  ➜  Local:   http://localhost:5175/
```

Visit `http://localhost:5175` in your browser!

## 📱 Features

### Authentication
- ✅ User registration with email/password
- ✅ Secure login with JWT tokens
- ✅ Session persistence in localStorage
- ✅ Protected routes

### Video Creation
- ✅ AI script generation via Google Gemini
- ✅ Title, caption, and hashtag generation
- ✅ Scene-by-scene video planning
- ✅ Multiple niches and visual styles supported

### Video Library
- ✅ Browse all created videos
- ✅ View video status (generating/completed/failed)
- ✅ Delete videos
- ✅ Paginated video list

### Scheduling & Queue
- ✅ Schedule posts to YouTube/Instagram
- ✅ View queued videos
- ✅ Manage scheduled posts

### User Settings
- ✅ Account information display
- ✅ Connect social media accounts (UI ready)
- ✅ Subscription plan info
- ✅ Sign out functionality

## 🗄️ Database Schema

### Users
- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `name` - User's name
- `subscription_tier` - Plan type (starter, pro, agency)
- `credits_remaining` - Monthly credits
- Timestamps

### Videos
- `id` - UUID primary key
- `user_id` - References users table
- `title` - Video title
- `caption` - Video description
- `hashtags` - JSON array
- `niche` - Content category
- `status` - generating/completed/failed
- `video_url` - Path to rendered video
- `scenes` - JSON video scenes
- Timestamps

### Video Queue
- `id` - UUID primary key
- `video_id` - References videos table
- `scheduled_at` - Scheduled post time
- `platforms` - YouTube, Instagram
- `status` - queued/processing/posted/failed
- Timestamps

### Connected Accounts
- OAuth tokens for YouTube/Instagram
- Platform-specific user IDs
- Refresh tokens for authentication

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register     - Create new account
POST   /api/auth/login        - Login user
GET    /api/auth/me           - Get current user (requires JWT)
POST   /api/auth/logout       - Logout
```

### Videos
```
POST   /api/videos/generate   - Generate new video
GET    /api/videos            - List user's videos (paginated)
GET    /api/videos/:id/status - Get video status
DELETE /api/videos/:id        - Delete video
```

### Health
```
GET    /api/health            - Backend health check
GET    /                       - API info
```

## 🤖 Gemini AI Integration

### Features
- **Script Generation** - Creates engaging video scripts with scenes
- **Title Generation** - Suggests viral-worthy titles
- **Hashtag Generation** - Recommends trending hashtags
- **Image Prompts** - Generates detailed prompts for background images

### Development Mode
If `GEMINI_API_KEY` is not set or invalid, the service uses **mock data** automatically. This allows full testing without API costs:

```typescript
// Will use mock scripts for common niches:
- Technology
- Fitness
- Business
- Or generates dynamic scripts for any niche
```

To use real Gemini AI:
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `backend/.env`: `GEMINI_API_KEY=your_key_here`
3. Restart backend

## 📊 Response Examples

### Generate Video
```json
POST /api/videos/generate
{
  "niche": "Technology",
  "duration": 60,
  "language": "en",
  "visualStyle": "cinematic"
}

RESPONSE 201:
{
  "success": true,
  "videoId": "a1b2c3d4e5f6",
  "message": "Video generation started",
  "content": {
    "title": "Top 5 AI Breakthroughs",
    "caption": "Discover the latest AI innovations...",
    "hashtags": ["AI", "Technology", "Innovation"],
    "scenes": [
      {
        "duration": 3,
        "narration": "AI is advancing at lightning speed!",
        "textOverlay": "AI Breakthroughs 2025",
        "visualDescription": "Modern tech background with glowing AI symbols"
      }
    ]
  }
}
```

### Get Videos
```json
GET /api/videos?page=1&limit=10

RESPONSE 200:
{
  "success": true,
  "videos": [
    {
      "id": "a1b2c3d4e5f6",
      "title": "Top 5 AI Breakthroughs",
      "caption": "Discover...",
      "hashtags": ["AI", "Technology"],
      "niche": "Technology",
      "duration": 60,
      "status": "generating",
      "createdAt": "2026-01-29T16:09:26Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

## 🔐 Authentication Flow

1. User enters email/password on login page
2. Frontend sends credentials to `/api/auth/login`
3. Backend validates password hash and returns JWT token
4. Frontend stores token in localStorage
5. All subsequent requests include `Authorization: Bearer <token>` header
6. Backend middleware verifies token before processing request

## 🎬 Video Rendering Pipeline

1. User creates video → Gemini generates script
2. Script stored in database with status "generating"
3. Remotion renders video at 1080x1920 (9:16 vertical)
4. Rendered MP4 saved to `public/renders/`
5. Status updated to "completed" or "failed"
6. Frontend polls `/api/videos/:id/status` for updates

## 🧪 Testing the App

### Test Registration & Lo
