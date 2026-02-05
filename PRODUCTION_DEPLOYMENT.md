# AutoShorts Production Deployment with PM2 and Nginx

## Overview

This guide covers deploying AutoShorts to production with:
- **PM2**: Process manager for Node.js applications
- **Nginx**: Reverse proxy with SSL termination
- **Systemd**: Linux service management
- **Automatic backups**: Rollback capability

## Prerequisites

- Ubuntu 20.04+ or similar Linux server
- Node.js 18+ installed
- Domain name pointing to server IP
- SSH access with sudo privileges

## Quick Deployment

### 1. Upload Files to Server

```bash
# Upload deployment script and configs
scp deploy-production.sh deploy@your-server:/home/deploy/
scp -r nginx/ systemd/ deploy@your-server:/home/deploy/

# SSH into server
ssh deploy@your-server
```

### 2. Run Deployment

```bash
cd /home/deploy
chmod +x deploy-production.sh
./deploy-production.sh
```

### 3. Manual Step-by-Step

#### Build Locally
```bash
# Build frontend
cd frontend
npm run build

# Copy to backend
rm -rf backend/public/frontend
cp -r frontend/dist backend/public/frontend

# Build backend
cd backend
npm install --production
npm run build
```

#### Upload to Server
```bash
# Create archive
tar -czf autoshorts.tar.gz \
    backend/dist \
    backend/public \
    backend/package.json \
    backend/.env

# Upload
scp autoshorts.tar.gz deploy@your-server:/home/deploy/
```

#### Server Setup
```bash
ssh deploy@your-server

# Create directories
mkdir -p /home/deploy/autoshorts/backend/{logs,public/renders,public/images}
mkdir -p /home/deploy/autoshorts/backups

# Extract
cd /home/deploy/autoshorts
tar -xzf ../autoshorts.tar.gz

# Install dependencies
cd backend
npm install --production

# Setup PM2
npm install -g pm2
pm2 kill
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Setup Nginx
sudo cp /home/deploy/nginx/autoshorts.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/autoshorts.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## PM2 Management

### Basic Commands
```bash
# View all processes
pm2 list
pm2 monit

# View logs
pm2 logs autoshorts
pm2 logs autoshorts --lines 100

# Restart/Stop
pm2 restart autoshorts
pm2 stop autoshorts
pm2 reload autoshorts

# Delete from PM2
pm2 delete autoshorts
```

### Ecosystem Configuration
See `backend/ecosystem.config.js` for:
- Memory limits (1GB max)
- Auto-restart settings
- Log management
- Environment variables

## Nginx Configuration

### Features
- Gzip compression
- Security headers
- API proxy to Node.js
- Static file caching
- Rate limiting
- HTTPS redirect (after SSL)

### SSL with Let's Encrypt
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Test Configuration
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Systemd Service

### Install Service
```bash
sudo cp /home/deploy/systemd/autoshorts.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable autoshorts
sudo systemctl start autoshorts
```

### Manage Service
```bash
# Status
sudo systemctl status autoshorts

# Logs
sudo journalctl -u autoshorts -f
sudo journalctl -u autoshorts --since "1 hour ago"

# Restart/Stop
sudo systemctl restart autoshorts
sudo systemctl stop autoshorts
```

## Monitoring & Logs

### PM2 Logs
```bash
# Real-time logs
pm2 logs autoshorts

# Logs directory
ls -la backend/logs/
```

### Systemd Logs
```bash
sudo journalctl -u autoshorts -f
sudo journalctl --vacuum-time=7d  # Clean old logs
```

### Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Health Checks

### Application Health
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Backend is running.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Server Resources
```bash
# CPU/Memory
htop

# Disk usage
df -h

# Node.js processes
pm2 list
```

## Rollback Procedure

### From PM2
```bash
# List backups
ls -la /home/deploy/autoshorts/backups/

# Restore backup
cd /home/deploy/autoshorts
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
pm2 restart autoshorts
```

### From Git (if using version control)
```bash
git pull origin main
# Rebuild and redeploy
```

## Performance Tuning

### PM2 Cluster Mode (Multi-core)
Edit `ecosystem.config.js`:
```javascript
instances: 'max',
exec_mode: 'cluster',
```

### Node.js Memory Limit
```javascript
node_args: '--max-old-space-size=1024',
```

### Nginx Keepalive
```nginx
upstream backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

location /api {
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    # ...
}
```

## Security Checklist

- [ ] Firewall configured (ufw: 80, 443, 22)
- [ ] SSL certificate installed
- [ ] JWT_SECRET set to strong random string
- [ ] API keys in .env (not committed)
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Regular backups scheduled
- [ ] Log rotation configured
- [ ] Fail2ban installed

## Backup Schedule

### Automated Backups
```bash
# Add to crontab
crontab -e

# Backup every day at 3 AM
0 3 * * * tar -czf /home/deploy/autoshorts/backups/backup_$(date +\%Y\%m\%d).tar.gz -C /home/deploy/autoshorts/backend dist public .env ecosystem.config.js

# Keep only last 7 days
0 4 * * * find /home/deploy/autoshorts/backups -name "backup_*.tar.gz" -mtime +7 -delete
```

## Troubleshooting

### Port Already in Use
```bash
# Find process
sudo lsof -i :3001

# Kill it
sudo kill -9 <PID>
```

### PM2 Not Starting
```bash
# Check logs
pm2 logs autoshorts --err

# Verify Node.js version
node -v

# Check environment variables
pm2 env <PID>
```

### Nginx 502 Bad Gateway
```bash
# Check if Node.js is running
pm2 list

# Check port
curl http://localhost:3001/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Memory Issues
```bash
# PM2 memory usage
pm2 monit

# Server memory
free -h

# Increase limit in ecosystem.config.js
max_memory_restart: '2G',
```

## Production URL

After deployment:
- **Application**: https://yourdomain.com
- **API**: https://yourdomain.com/api
- **Health**: https://yourdomain.com/api/health
