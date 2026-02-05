# AutoShorts Production Deployment Guide

Complete guide to deploy AutoShorts to production using Docker and CI/CD.

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04 LTS or newer (recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **CPU**: 2 cores minimum, 4 cores recommended
- **Storage**: 50GB SSD minimum (for videos and database)
- **Network**: Static IP, domain name (optional but recommended)

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Node.js 18+ (for local development)

### Domain & SSL (Recommended)
- Domain name pointed to your server
- SSL certificate (Let's Encrypt recommended)

---

## 🚀 Quick Deployment (5 Minutes)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/autoshorts.git
cd autoshorts
```

### 2. Configure Environment

```bash
# Copy and edit environment file
cp .env.production.template .env
nano .env  # or use your preferred editor
```

**Required environment variables:**
```env
JWT_SECRET=your_secure_random_string_here
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-cloud.json
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/youtube/callback
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/instagram/callback
```

### 3. Deploy with Docker Compose

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 4. Verify Deployment

```bash
# Check if services are running
docker-compose ps

# Check backend health
curl http://localhost:3001/api/health

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 🔧 Step-by-Step Manual Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install other tools
sudo apt install -y git nginx certbot python3-certbot-nginx
```

### Step 2: Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3001/tcp  # Backend API (if needed)
sudo ufw enable
```

### Step 3: Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is automatically configured
```

### Step 4: Deploy Application

```bash
# Navigate to app directory
cd /opt/autoshorts

# Copy Google Cloud credentials
cp /path/to/your/google-credentials.json ./gen-lang-client-0678536077-e49a2e334696.json

# Create production .env file
cat > .env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-cloud.json
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/youtube/callback
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/instagram/callback
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=us-east-1
REDIS_URL=redis://redis:6379
EOF

# Start services
./deploy.sh
```

---

## 🔐 Security Checklist

### Before Production

- [ ] Change JWT_SECRET to a secure random string (32+ characters)
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure firewall rules
- [ ] Set strong database passwords (if using PostgreSQL)
- [ ] Enable automatic security updates
- [ ] Configure fail2ban for SSH protection
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation

### Environment Variables Security

```bash
# Set proper permissions on .env file
chmod 600 .env

# Never commit .env to git
echo ".env" >> .gitignore
echo "*.db" >> .gitignore
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl -f http://localhost:3001/api/health

# Frontend
curl -f http://localhost

# Check all services
docker-compose ps
```

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/autoshorts"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp /opt/autoshorts/backend/autoshorts.db "$BACKUP_DIR/db_$TIMESTAMP.db"

# Backup .env
cp /opt/autoshorts/.env "$BACKUP_DIR/env_$TIMESTAMP"

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -mtime +30 -delete
```

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * /opt/autoshorts/backup.sh
```

### Log Management

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Clear old logs
docker system prune -f
```

---

## 🔄 Updates & Rollback

### Update to Latest Version

```bash
cd /opt/autoshorts

# Pull latest code
git pull origin main

# Rebuild and restart
./deploy.sh
```

### Rollback (If Something Goes Wrong)

```bash
cd /opt/autoshorts

# List backups
ls -la backups/

# Restore database from backup
cp backups/autoshorts_20260130_120000.db backend/autoshorts.db

# Restart services
docker-compose restart
```

---

## 🌐 CI/CD Deployment (GitHub Actions)

### Setup GitHub Secrets

Go to: Settings > Secrets and variables > Actions

Add these secrets:

| Secret Name | Description |
|------------|-------------|
| `VPS_HOST` | Your server IP or domain |
| `VPS_USER` | SSH username (usually 'root' or 'ubuntu') |
| `VPS_SSH_KEY` | Private SSH key for server access |
| `ENV_FILE_CONTENT` | Full content of production .env file |
| `DOCKER_USERNAME` | (Optional) Docker Hub username |
| `DOCKER_PASSWORD` | (Optional) Docker Hub password |
| `SLACK_WEBHOOK_URL` | (Optional) Slack webhook for notifications |

### How CI/CD Works

1. **Push to main branch** triggers the workflow
2. **Tests run** - Frontend and backend tests
3. **Docker images built** and pushed to GitHub Container Registry
4. **Automatic deployment** to your production server via SSH
5. **Health checks** verify the deployment
6. **Slack notification** sent on success/failure

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Services Won't Start

```bash
# Check logs
docker-compose logs

# Check for port conflicts
sudo lsof -i :3001
sudo lsof -i :80

# Restart services
docker-compose down
docker-compose up -d
```

#### 2. Backend Health Check Fails

```bash
# Check if backend is running
docker-compose ps backend

# View backend logs
docker-compose logs backend

# Check database
docker-compose exec backend ls -la autoshorts.db
```

#### 3. Video Rendering Issues

```bash
# Check if renders directory exists
docker-compose exec backend ls -la public/renders

# Check disk space
df -h

# Restart backend
docker-compose restart backend
```

#### 4. OAuth Not Working

- Verify redirect URIs match exactly in OAuth app settings
- Check environment variables are set correctly
- Ensure HTTPS is enabled for production

---

## 📈 Scaling for Production

### Performance Optimization

1. **Use PostgreSQL instead of SQLite**
   - Uncomment postgres service in docker-compose.yml
   - Update backend to use PostgreSQL

2. **Add CDN for video storage**
   - Configure AWS S3 or Cloudflare R2
   - Update storage service to use S3

3. **Add Load Balancer**
   - Use nginx or traefik
   - Distribute traffic across multiple backend instances

4. **Redis Cluster**
   - Scale Redis for caching
   - Use Redis for session management

---

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Review the troubleshooting section
3. Check GitHub Issues for similar problems
4. Create a new issue with logs and configuration

---

## 🎉 Success!

Your AutoShorts application should now be running at:
- **Frontend**: http://yourdomain.com
- **Backend API**: http://yourdomain.com/api
- **Health Check**: http://yourdomain.com/api/health

**Next Steps:**
1. Create your first account
2. Connect YouTube and Instagram accounts
3. Generate your first video
4. Schedule it for posting

Happy video creating! 🎬
