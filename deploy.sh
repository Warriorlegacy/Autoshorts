#!/bin/bash

# AutoShorts Production Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment for environment: $ENVIRONMENT"
echo "📅 Timestamp: $TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database if it exists
if [ -f "./backend/autoshorts.db" ]; then
    print_status "Creating database backup..."
    cp ./backend/autoshorts.db "$BACKUP_DIR/autoshorts_$TIMESTAMP.db"
    print_status "Database backed up to $BACKUP_DIR/autoshorts_$TIMESTAMP.db"
fi

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose pull

# Stop existing containers gracefully
print_status "Stopping existing containers..."
docker-compose down --timeout 30

# Remove old images to free up space
print_status "Cleaning up old Docker images..."
docker image prune -f

# Start services
print_status "Starting services..."
docker-compose up -d --remove-orphans

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Health check
print_status "Performing health checks..."
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
    print_error "Backend health check failed after $MAX_RETRIES attempts"
    print_warning "Rolling back to previous version..."
    docker-compose down
    if [ -f "$BACKUP_DIR/autoshorts_$TIMESTAMP.db" ]; then
        cp "$BACKUP_DIR/autoshorts_$TIMESTAMP.db" ./backend/autoshorts.db
    fi
    docker-compose up -d
    exit 1
fi

# Check frontend
if curl -sf http://localhost > /dev/null 2>&1; then
    print_status "Frontend is accessible"
else
    print_warning "Frontend health check returned non-200 status"
fi

# Cleanup old backups (keep last 7 days)
print_status "Cleaning up old backups..."
find $BACKUP_DIR -name "autoshorts_*.db" -mtime +7 -delete

# Print deployment summary
echo ""
echo "========================================"
print_status "Deployment completed successfully!"
echo "========================================"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:3001"
echo "   API Health: http://localhost:3001/api/health"
echo ""
echo "📊 Container Status:"
docker-compose ps
echo ""
echo "📝 Logs:"
echo "   Backend: docker-compose logs -f backend"
echo "   Frontend: docker-compose logs -f frontend"
echo ""
