#!/bin/bash

# Knowledge Nexus Framework™ - Stop Script
# This script stops the CMS Compliance Platform services

set -e

echo "🛑 Stopping Knowledge Nexus Framework™ Services..."

# Colors for output
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${RED}[STOPPED]${NC} $1"
}

# Stop services
print_status "Stopping services..."
docker-compose down

# Remove orphaned containers
print_status "Removing orphaned containers..."
docker-compose down --remove-orphans

print_success "Services stopped successfully! 🛑"
echo ""
echo "🔧 To start services again: ./scripts/start.sh"
echo "🔧 To remove all data: docker-compose down -v"
