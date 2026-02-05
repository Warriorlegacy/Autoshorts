# AutoShorts - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites
- Node.js v18+
- npm (comes with Node)

## Installation (2 minutes)

```bash
# Navigate to project
cd D:\AutoShorts

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

## Running (2 minutes)

**Open 2 terminal windows:**

### Terminal 1 - Backend
```bash
cd D:\AutoShorts\backend
npm run dev
```

Wait for:
```
✓ Database connection successful
✓ Database schema initialized
✓ Server is running on http://localhost:3001
```

### Terminal 2 - Frontend
```bash
cd D:\AutoShorts\frontend
npm run dev
```

Wait for:
```
➜  Local:   http://localhost:5175/
```

## Testing (1 minute)

1. Open browser to `http://localhost:5175`

2. Register:
   - Email: `test@example.com`
   - Password: `password123`
   - Name: `Test User`
   - Click "Sign Up"

3. Create Video:
   - Click "+" button
   - Fill form:
     ```
     Niche: Technology
     Language: English
     Duration: 60 seconds
     Visual Style: Cinematic
     ```
   - Click "Generate"

4. View Library:
   - Click "Library" in navigation
   - See your generated video
   - Status shows "generating" or "completed"

## Key Features Ready to Test

✅ **Authentication** - Register, login, logout
✅ **Video Generation** - AI creates scripts (mock data if no API key)
✅ **Video Library** - View all videos with status
✅ **Responsive UI** - Works on desktop and mobile
✅ **Settings** - Account info and social media setup UI

## What to Expect

### Backend Response Time
- First startup: 2-3 seconds (creates SQLite database)
- Subsequent: <1 second
- Video generation: 2-5 seconds (mock data)

### Frontend Response Time
- Build: 2-3 seconds
- Load: <1 second
- API calls: <500ms

### Database
- SQLite database created at: `backend/autoshorts.db`
- Auto-creates tables and indexes
- Persists data between restarts

## Troubleshooting

### "Port 3001 already in use"
```bash
# Either kill the process or use a different port
PORT=3002 npm run dev
```

### "Cannot find module"
```bash
# Make sure you ran npm install in both backend and frontend
cd backend && npm install
cd ../frontend && npm install
```

### "API connection error"
```bash
# Check backend is running (should see "Server is running" message)
# Check frontend API_BASE_URL is set to /api (default)
```

### "Login not working"
```bash
# Restart backend - password hashing may have an issue
# Check browser console for error messages
```

## Next Steps

1. **Configure Gemini AI** (optional)
   - Get API key from https://makersuite.google.com/app/apikey
   - Add to `backend/.env`: `GEMINI_API_KEY=your_key`
   - Restart backend
   - Now uses real AI instead of mock data

2. **Explore Code**
   - Frontend: `frontend/src/screens/` - View page components
   - Backend: `backend/src/routes/` - View API routes
   - Database: `backend/src/config/db.ts` - Database setup

3. **Customize**
   - Edit Tailwind colors in `frontend/tailwind.config.js`
   - Add more mock scripts in `backend/src/services/geminiService.ts`
   - Modify video templates in `backend/src/video-engine/`

## File Structure

```
D:\AutoShorts\
├── backend/              Backend API
│   ├── autoshorts.db     SQLite database (created on first run)
│   ├── src/
│   ├── package.json
│   └── .env              Configuration
├── frontend/             React frontend
│   ├── src/
│   ├── package.json
│   └── dist/             Build output
└── README.md             Full documentation
```

## Useful Commands

```bash
# Backend
cd backend
npm run dev      # Start development server
npm run build    # Compile TypeScript
npm run start    # Run compiled version

# Frontend
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build

# Both
npm test         # Run tests (when implemented)
npm run lint     # Lint code (when configured)
```

## API Quick Reference

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass","name":"Test"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}'

# Generate Video (requires token)
curl -X POST http://localhost:3001/api/videos/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"niche":"Technology","duration":60,"language":"en","visualStyle":"cinematic"}'
```

## Success Indicators

✅ Backend starts without errors
✅ Database creates successfully
✅ Frontend loads in browser
✅ Can register new user
✅ Can generate video
✅ Can view videos in library
✅ Settings page loads

## Need Help?

1. Check browser console (F12) for errors
2. Check backend terminal output for errors
3. Verify ports 3001 and 5175 are available
4. Check `.env` file is configured
5. Delete `autoshorts.db` and restart to reset database

---

**Happy coding! 🚀**

Questions? See full README.md for detailed documentation.
