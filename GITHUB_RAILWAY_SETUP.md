# Step 1: Push to GitHub

## Create Repository on GitHub

1. Go to: https://github.com/new
2. **Repository name**: `autoshorts`
3. **Description**: AI-powered short video generation platform
4. **Public**: ✅ (or Private if preferred)
5. **Don't** check "Add a README file" (we already have one)
6. Click **Create repository**

## Push Your Code

Run these commands in your terminal:

```bash
cd D:\AutoShorts

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - AutoShorts with production deployment"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/autoshorts.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Verify

✅ Go to `https://github.com/YOUR_USERNAME/autoshorts` to confirm your code is uploaded.

---

# Step 2: Deploy to Railway

## Create Railway Project

1. Go to: https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Find and select your `autoshorts` repository
5. Click **"Deploy Now"**

## Configure Environment Variables

After deployment starts, Railway will show "Missing Variables":

1. Click **"Variables"** tab
2. Add these one by one:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `JWT_SECRET` | `autoshorts_secure_jwt_secret_key_minimum_32_chars` |
| `BACKEND_URL` | (will be auto-filled after deploy) |
| `FRONTEND_URL` | (will be auto-filled after deploy) |

### Optional API Keys (from your .env):

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | `AIzaSy...` |
| `GROQ_API_KEY` | `gsk_...` |
| `LEONARDO_API_KEY` | `fb36a...` |

## Wait for Deployment

- ⏳ Build & Deploy: ~2-5 minutes first time
- Watch the **Logs** tab for progress

## Test Your App

Once deployed, Railway will show a URL like: `https://autoshorts-production.up.railway.app`

✅ **Test the API:**
```
https://autoshorts-production.up.railway.app/api/health
```

Expected response:
```json
{"status":"ok","message":"Backend is running.","timestamp":"..."}
```

✅ **Test the Frontend:**
```
https://autoshorts-production.up.railway.app
```

---

# Step 3: Update OAuth Redirects

After you get your Railway URL, update these variables:

1. Go to Railway → **Variables** tab
2. Add/Update:

| Variable | Value (replace YOUR_APP_NAME) |
|----------|------------------------------|
| `YOUTUBE_REDIRECT_URI` | `https://YOUR_APP_NAME.railway.app/api/youtube/callback` |
| `INSTAGRAM_REDIRECT_URI` | `https://YOUR_APP_NAME.railway.app/api/instagram/callback` |
| `FRONTEND_URL` | `https://YOUR_APP_NAME.railway.app` |
| `BACKEND_URL` | `https://YOUR_APP_NAME.railway.app` |

3. Click **"Deploy"** to restart with new variables

---

# Step 4: Add Domain (Optional)

1. In Railway → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `autoshorts.yourdomain.com`
4. Follow DNS instructions shown

---

# Quick Reference

| Command | Action |
|---------|--------|
| `railway login` | Login to Railway |
| `railway open` | Open app in browser |
| `railway logs` | View deployment logs |
| `railway restart` | Restart the app |
| `railway status` | Check deployment status |
| `railway vars` | Manage environment variables |

---

# Need GitHub CLI?

If you prefer using GitHub CLI instead of browser:

```bash
# Install
winget install GitHub.cli

# Authenticate
gh auth login

# Create repo
gh repo create autoshorts --public --source=. --push

# Push
git push -u origin main
```

---

Let me know when you've pushed to GitHub and I'll help you with the Railway deployment!
