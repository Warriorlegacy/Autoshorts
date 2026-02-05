#!/bin/bash

# AutoShorts Production Deployment with PM2 and Nginx
# Usage: ./deploy-production.sh [deploy_user@]server

set -e

SERVER=${1:-}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

if [ -z "$SERVER" ]; then
    echo "🚀 AutoShorts Production Deployment"
    echo ""
    echo "Usage: ./deploy-production.sh user@server"
    echo ""
    echo "This script will:"
    echo "  1. Build the application locally"
    echo "  2. Upload to server"
    echo "  3. Setup PM2 process manager"
    echo "  4. Configure Nginx reverse proxy"
    echo "  5. Setup SSL certificate (optional)"
    echo "  6. Configure systemd service"
    echo ""
    exit 0
fi

echo "🚀 Deploying to production server: $SERVER"
echo "📅 Timestamp: $TIMESTAMP"

# Build locally
print_status "Building application locally..."

# Build frontend
cd "$PROJECT_DIR/frontend"
npm run build

# Copy frontend to backend
rm -rf "$PROJECT_DIR/backend/public/frontend"
cp -r "$PROJECT_DIR/frontend/dist" "$PROJECT_DIR/backend/public/frontend"

# Build backend
cd "$PROJECT_DIR/backend"
npm install --production
npm run build

print_status "Build complete"

# Create deployment archive
ARCHIVE_NAME="autoshorts_$TIMESTAMP.tar.gz"
cd "$PROJECT_DIR"
tar -czf "$ARCHIVE_NAME" \
    backend/dist \
    backend/public \
    backend/package.json \
    backend/.env \
    backend/ecosystem.config.js \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=*.log

print_status "Created archive: $ARCHIVE_NAME"

# Upload to server
print_status "Uploading to server..."
ssh "$SERVER" "mkdir -p /home/deploy/autoshorts/backups"
scp "$ARCHIVE_NAME" "$SERVER:/home/deploy/autoshorts/"

# Deploy on server
print_status "Deploying on server..."
ssh "$SERVER" << 'EOF'
set -e

DEPLOY_DIR="/home/deploy/autoshorts"
BACKUP_DIR="$DEPLOY_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup current version
if [ -d "$DEPLOY_DIR/backend/dist" ]; then
    mkdir -p "$BACKUP_DIR"
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" \
        -C "$DEPLOY_DIR/backend" \
        dist public .env ecosystem.config.js
    echo "[✓] Backup created: backup_$TIMESTAMP.tar.gz"
fi

# Extract new version
cd "$DEPLOY_DIR"
tar -xzf autoshorts_*.tar.gz

# Install dependencies
cd "$DEPLOY_DIR/backend"
npm install --production

# Setup PM2
if ! command -v pm2 &> /dev/null; then
    echo "[⚠] PM2 not found, installing..."
    npm install -g pm2
fi

# Stop existing instance
pm2 stop autoshorts 2>/dev/null || true
pm2 delete autoshorts 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Setup systemd service
if [ -f "$DEPLOY_DIR/systemd/autoshorts.service" ]; then
    sudo cp "$DEPLOY_DIR/systemd/autoshorts.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable autoshorts
    sudo systemctl start autoshorts
fi

# Setup Nginx
if [ -f "$DEPLOY_DIR/nginx/autoshorts.conf" ]; then
    sudo cp "$DEPLOY_DIR/nginx/autoshorts.conf" /etc/nginx/sites-available/
    sudo ln -sf /etc/nginx/sites-available/autoshorts.conf /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
fi

# Cleanup
rm -f "$DEPLOY_DIR/autoshorts_*.tar.gz"

echo ""
echo "[✓] Deployment complete!"
echo ""
echo "Commands to manage:"
echo "  PM2:     pm2 monit | pm2 logs autoshorts | pm2 restart autoshorts"
echo "  Systemd: sudo systemctl status autoshorts | sudo journalctl -u autoshorts -f"
echo "  Nginx:   sudo systemctl status nginx"
echo ""
EOF

# Cleanup local archive
rm -f "$ARCHIVE_NAME"

print_status "Production deployment complete!"
