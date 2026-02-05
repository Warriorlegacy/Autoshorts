# Deploying AutoShorts to Railway

## Prerequisites

1. [Railway account](https://railway.app/) (sign up with GitHub)
2. [Railway CLI](https://docs.railway.app/develop/cli) installed
3. Git repository with your code

## Quick Deployment

### Option 1: Deploy via Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your AutoShorts repository
5. Railway will auto-detect the Node.js app
6. Add environment variables (see below)
7. Click **Deploy**

### Option 2: Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway vars set NODE_ENV=production
railway vars set JWT_SECRET=your-super-secret-jwt-key
# Add other vars from .env

# Deploy
railway up
```

## Environment Variables

Configure these in Railway dashboard or via CLI:

```bash
# Required
NODE_ENV=production
PORT=3001
JWT_SECRET=your-long-random-secret-string-min-32-chars

# Database (Railway provides PostgreSQL)
# If using PostgreSQL:
DATABASE_URL=your-railway-postgres-connection-string

# OR keep using SQLite (data persists in Railway volumes):
# DATABASE_PATH=./autoshorts.db

# API Keys (from your .env)
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
OLLAMA_CLOUD_API_KEY=your-ollama-key
LEONARDO_API_KEY=your-leonardo-key

# OAuth (update redirect URIs)
YOUTUBE_REDIRECT_URI=https://your-app.railway.app/api/youtube/callback
INSTAGRAM_REDIRECT_URI=https://your-app.railway.app/api/instagram/callback

# Frontend URL (for CORS)
FRONTEND_URL=https://your-app.railway.app
BACKEND_URL=https://your-app.railway.app
```

## Database Setup

### Option A: Railway PostgreSQL (Recommended)

1. In Railway dashboard, click **New Database**
2. Select **PostgreSQL**
3. Once created, copy the connection string
4. Add as `DATABASE_URL` environment variable
5. Update your code to use PostgreSQL instead of SQLite

### Option B: Keep SQLite

SQLite works on Railway but:
1. Data persists in the `/tmp` directory (may be ephemeral)
2. Use Railway **persistent volumes** for data durability
3. Add volume mounting point: `./backend:/data`

## Adding Persistent Volume (for SQLite)

1. In Railway dashboard, go to **Volumes**
2. Click **New Volume**
3. Mount at: `./backend/data`

## Update Your Code for PostgreSQL

If switching to PostgreSQL, update `backend/src/config/db.ts`:

```typescript
// Instead of better-sqlite3
import Database from 'better-sqlite3';
const db = new Database('autoshorts.db');

// Use pg (already in package.json)
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

## Domain Setup

1. In Railway dashboard, go to **Settings**
2. Click **Domains**
3. Add your custom domain
4. Update DNS records as instructed

## Deployment Commands

```bash
# Check status
railway status

# View logs
railway logs

# Restart
railway restart

# Open in browser
railway open

# Set variables
railway vars set KEY=value

# Get variable
railway vars get KEY

# Delete variable
railway vars unset KEY
```

## Troubleshooting

### Build Fails
```bash
# Check build logs
railway logs --build

# Common issues:
# - Missing dependencies
# - TypeScript errors
# - Out of memory
```

### App Crashes on Startup
```bash
# Check runtime logs
railway logs

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port not configured
```

### Slow Start Times
- Railway's first deploy can take 2-5 minutes
- Subsequent deploys are faster with caching

## Performance Tips

1. **Use PostgreSQL** instead of SQLite for better performance
2. **Add Redis** for caching (Railway plugin available)
3. **Configure health checks** in railway.json
4. **Set proper timeout values** for API calls

## Deployment Checklist

- [ ] Repository connected to Railway
- [ ] All environment variables configured
- [ ] Database created and connected
- [ ] Health check endpoint working
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic)
- [ ] CORS settings updated for production domain
- [ ] OAuth redirect URIs updated

## After Deployment

```bash
# Test health endpoint
curl https://your-app.railway.app/api/health

# Should return:
# {"status":"ok","message":"Backend is running.","timestamp":"..."}
```

## Support

- [Railway Docs](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
