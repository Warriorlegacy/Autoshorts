# Non-Docker Deployment Guide for AutoShorts

This guide explains how to deploy AutoShorts without Docker using direct Node.js execution.

## Prerequisites

- Node.js 18+ and npm installed
- At least 2GB of RAM available
- Port 3001 available (or modify PORT in .env)

## Quick Start

### Windows
```bash
# Deploy and start the application
deploy-native.bat

# The application will be available at http://localhost:3001

# To stop the application
stop-app.bat
```

### Linux/macOS
```bash
# Make the script executable
chmod +x deploy-native.sh

# Deploy and start the application
./deploy-native.sh

# To stop the application
kill $(cat backend/.backend.pid)
```

## What the Deployment Script Does

1. **Creates necessary directories** - logs, public folders, backups
2. **Backs up the existing database** (autoshorts.db) to the backups folder
3. **Builds the frontend** - Compiles React app to static files
4. **Deploys frontend to backend** - Copies build output to backend/public/frontend
5. **Installs backend dependencies** - Ensures all npm packages are installed
6. **Builds the backend** - Compiles TypeScript to JavaScript
7. **Starts the backend server** - Runs in production mode on port 3001
8. **Performs health checks** - Verifies the API and frontend are accessible

## Production URLs

After deployment, your application will be available at:
- **Frontend & Backend**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## Managing the Application

### View Logs
```bash
# On Windows
type backend\logs\backend.log

# On Linux/macOS
cat backend/logs/backend.log
```

### Stop the Application
```bash
# Windows
stop-app.bat

# Linux/macOS
kill $(cat backend/.backend.pid)
```

### Restart the Application
```bash
# Stop first, then deploy again
stop-app.bat
deploy-native.bat
```

## Directory Structure

After deployment, the structure will look like:
```
AutoShorts/
├── backend/
│   ├── public/
│   │   └── frontend/     # Frontend build files
│   │   ├── renders/      # Video renders
│   │   └── images/       # Generated images
│   ├── logs/
│   │   └── backend.log   # Application logs
│   ├── autoshorts.db     # SQLite database
│   └── .backend.pid      # Process ID file
├── backups/              # Database backups
└── frontend/
    └── dist/             # Frontend source build
```

## Environment Variables

The application uses the `.env` file for configuration. Key production settings:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your_secure_secret_key
```

## Troubleshooting

### Port Already in Use
If port 3001 is already in use, either:
1. Stop the existing process using that port
2. Change the `PORT` value in the `.env` file

### Frontend Not Loading
Check that:
1. Frontend was built successfully: `cd frontend && npm run build`
2. Files were copied: `backend/public/frontend/` should contain index.html
3. Backend is running: http://localhost:3001/api/health

### Backend Health Check Fails
Check the logs:
```bash
cat backend/logs/backend.log
```

Common issues:
- Missing dependencies (run `npm install` in backend folder)
- Database corruption (restore from backups folder)
- Missing environment variables (check .env file)

## Production Considerations

For a production deployment, consider:

1. **Process Manager**: Use PM2 for better process management:
   ```bash
   npm install -g pm2
   cd backend
   pm2 start dist/server.js --name autoshorts
   pm2 startup
   pm2 save
   ```

2. **Reverse Proxy**: Use nginx or Apache for:
   - SSL/TLS termination
   - Domain routing
   - Load balancing

3. **Firewall**: Configure firewall to allow only necessary ports

4. **Monitoring**: Set up logging and monitoring tools

5. **Backups**: Regularly backup the database:
   ```bash
   cp backend/autoshorts.db backups/autoshorts_$(date +%Y%m%d).db
   ```

## Upgrading

To upgrade to a new version:
1. Backup the database: `cp backend/autoshorts.db backups/`
2. Deploy: `deploy-native.bat`
3. Test the application
4. Remove old backups: `del backups\autoshorts_*.db` (keep last 7 days)
