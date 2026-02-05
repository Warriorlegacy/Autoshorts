#!/bin/bash

# AutoShorts Non-Docker Production Deployment Script
# Usage: ./deploy-native.sh [environment]
# Example: ./deploy-native.sh production

set -e

ENVIRONMENT=${1:-production}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
FRONTEND_BUILD_DIR="$FRONTEND_DIR/dist"
PUBLIC_DIR="$BACKEND_DIR/public/frontend"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting non-Docker deployment for environment: $ENVIRONMENT"
echo "📅 Timestamp: $TIMESTAMP"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[ℹ]${NC} $1"; }

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v)
print_status "Node.js version: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_status "npm version: $NPM_VERSION"

# Create directories
mkdir -p $PUBLIC_DIR
mkdir -p $BACKUP_DIR
mkdir -p $BACKEND_DIR/logs
mkdir -p $BACKEND_DIR/public/renders
mkdir -p $BACKEND_DIR/public/images

# Backup database if exists
if [ -f "$BACKEND_DIR/autoshorts.db" ]; then
    print_status "Creating database backup..."
    cp "$BACKEND_DIR/autoshorts.db" "$BACKUP_DIR/autoshorts_$TIMESTAMP.db"
    print_status "Database backed up to $BACKUP_DIR/autoshorts_$TIMESTAMP.db"
fi

# Build frontend
print_status "Building frontend..."
cd $FRONTEND_DIR
npm run build
print_status "Frontend built successfully"

# Copy frontend build to backend public folder
print_status "Deploying frontend to backend..."
rm -rf $PUBLIC_DIR
cp -r $FRONTEND_BUILD_DIR $PUBLIC_DIR
print_status "Frontend deployed"

# Install backend dependencies if needed
print_status "Checking backend dependencies..."
cd $BACKEND_DIR
if [ ! -d "node_modules" ] || [ ! "$(ls -A node_modules 2>/dev/null)" ]; then
    print_warning "Installing backend dependencies..."
    npm install --production
else
    print_status "Backend dependencies already installed"
fi

# Build backend
print_status "Building backend..."
npm run build
print_status "Backend built successfully"

# Cleanup old backups (keep last 7)
print_status "Cleaning up old backups..."
find $BACKUP_DIR -name "autoshorts_*.db" -mtime +7 -delete

# Start application
print_status "Starting application..."

# Kill any existing Node.js processes on our ports
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true

# Start backend in background
cd $BACKEND_DIR
nohup npm run start > $BACKEND_DIR/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > $BACKEND_DIR/.backend.pid

print_status "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

# Health check
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Backend is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Attempt $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Backend health check failed"
    print_warning "Check logs at: $BACKEND_DIR/logs/backend.log"
    exit 1
fi

# Check if frontend is accessible
if curl -sf http://localhost:3001/ > /dev/null 2>&1; then
    print_status "Frontend is accessible"
else
    print_warning "Frontend health check returned non-200 status"
fi

echo ""
echo "========================================"
print_status "Deployment completed successfully!"
echo "========================================"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend & Backend: http://localhost:3001"
echo "   API Health: http://localhost:3001/api/health"
echo ""
echo "📊 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   PID file: $BACKEND_DIR/.backend.pid"
echo ""
echo "📝 Logs:"
echo "   Backend: $BACKEND_DIR/logs/backend.log"
echo ""
echo "🛑 To stop the application:"
echo "   kill \$(cat $BACKEND_DIR/.backend.pid)"
echo ""
