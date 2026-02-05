# AutoShorts Render Deployment Guide

Deploy AutoShorts to Render for free with a public URL.

## 🚀 Quick Deploy (5 Minutes)

### 1. Push to GitHub

Make sure your code is in a GitHub repository.

### 2. Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. No credit card required for free tier

### 3. Deploy from Dashboard

**Option A: Blueprint (Recommended)**

1. In Render Dashboard, click **"New +"** → **"Blueprint"**
2. Connect your GitHub repo
3. Render will auto-detect `render.yaml`
4. Click **"Apply"**

**Option B: Manual Web Service**

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `autoshorts`
   - **Runtime:** Node
   - **Build Command:** 
     ```bash
     npm install && cd backend && npm install && cd ../frontend && npm install && npm run build
     ```
   - **Start Command:** 
     ```bash
     cd backend && npm start
     ```
   - **Plan:** Free
4. Add Environment Variables (see below)
5. Click **"Create Web Service"**

---

## 📋 Required Environment Variables

In Render Dashboard → Your Service → Environment:

### Required
```
NODE_ENV=production
PORT=10000
JWT_SECRET=<generate_random_string>
BACKEND_URL=https://autoshorts.onrender.com
FRONTEND_URL=https://autoshorts.onrender.com
```

### AI Services (Free tier available)
```
# Choose at least one AI service:
GROQ_API_KEY=your_groq_key
HUGGINGFACE_API_KEY=your_hf_key
PEXELS_API_KEY=your_pexels_key
```

### Social Media (Optional)
```
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_secret
YOUTUBE_REDIRECT_URI=https://autoshorts.onrender.com/api/youtube/callback

FACEBOOK_APP_ID=your_fb_app_id
FACEBOOK_APP_SECRET=your_fb_secret
FACEBOOK_REDIRECT_URI=https://autoshorts.onrender.com/api/instagram/callback
```

---

## 🔧 Configuration Files

### render.yaml (Already Created)

Located at: `render.yaml`

```yaml
services:
  - type: web
    name: autoshorts
    runtime: node
    buildCommand: npm install && cd backend && npm install && cd ../frontend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: BACKEND_URL
        value: https://autoshorts.onrender.com
      - key: FRONTEND_URL
        value: https://autoshorts.onrender.com
    disk:
      name: data
      mountPath: /opt/render/project/src/backend/data
      sizeGB: 1
    healthCheckPath: /api/health
    autoDeploy: true
```

---

## ⚠️ Free Tier Limitations

| Feature | Limit |
|---------|-------|
| **Uptime** | Sleeps after 15 minutes of inactivity |
| **Wake time** | ~30 seconds to spin up when accessed |
| **Disk** | 1GB persistent storage |
| **Bandwidth** | 100GB/month |
| **Build minutes** | 500 minutes/month |

---

## 🌐 Access Your App

After deployment:
- **URL:** `https://autoshorts.onrender.com` (or your custom name)
- **API:** `https://autoshorts.onrender.com/api`
- **Health:** `https://autoshorts.onrender.com/api/health`

---

## 🔄 Updates

**Automatic:**
- Push to GitHub `main` branch
- Render auto-deploys

**Manual:**
- Render Dashboard → Your Service → **"Manual Deploy"**

---

## 🐛 Troubleshooting

### App Won't Start

```bash
# Check logs in Render Dashboard
# Look for:
# - Missing environment variables
# - Database permission errors
# - Build failures
```

### Videos Not Saving

- Check disk is mounted: Settings → Disks
- Verify `data` disk is attached

### OAuth Not Working

- Update redirect URIs in OAuth apps:
  - YouTube: `https://your-app.onrender.com/api/youtube/callback`
  - Facebook: `https://your-app.onrender.com/api/instagram/callback`

---

## 📞 Support

- Render Docs: [render.com/docs](https://render.com/docs)
- Render Status: [status.render.com](https://status.render.com)

---

**Your app will be live at:** `https://autoshorts.onrender.com` 🎉
