#!/bin/bash

# AutoShorts Railway Deployment Script
# Usage: ./deploy-railway.sh

set -e

echo "🚀 AutoShorts Railway Deployment"
echo "================================"
echo ""
echo "Before deploying:"
echo "1. Push your code to GitHub"
echo "2. Create a Railway account at https://railway.app"
echo "3. Install Railway CLI: npm install -g @railway/cli"
echo ""
echo "Quick Deploy Steps:"
echo ""
echo "1. Login to Railway:"
echo "   railway login"
echo ""
echo "2. Initialize project:"
echo "   railway init"
echo ""
echo "3. Set environment variables:"
echo "   railway vars set NODE_ENV=production"
echo "   railway vars set JWT_SECRET=your-super-secret-key"
echo "   railway vars set PORT=3001"
echo ""
echo "4. (Optional) Add PostgreSQL database:"
echo "   railway add postgresql"
echo "   railway vars set DATABASE_URL=\$(railway variables get DATABASE_URL)"
echo ""
echo "5. Deploy:"
echo "   railway up"
echo ""
echo "6. Open in browser:"
echo "   railway open"
echo ""
echo "Environment Variables to Configure:"
echo ""
cat << 'EOF'
Required:
- NODE_ENV=production
- PORT=3001
- JWT_SECRET=<generate-random-32-char-string>

Optional (API Keys):
- GEMINI_API_KEY=your-key
- GROQ_API_KEY=your-key
- LEONARDO_API_KEY=your-key
- POLLINATION_API_KEY=your-key

OAuth Redirects (update URLs):
- YOUTUBE_REDIRECT_URI=https://<app-name>.railway.app/api/youtube/callback
- INSTAGRAM_REDIRECT_URI=https://<app-name>.railway.app/api/instagram/callback
- FRONTEND_URL=https://<app-name>.railway.app
- BACKEND_URL=https://<app-name>.railway.app
EOF
echo ""
echo "For detailed instructions, see DEPLOYMENT_RAILWAY.md"
