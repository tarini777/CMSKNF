#!/bin/bash

# Knowledge Nexus Framework™ - Start Script
# This script starts the CMS Compliance Platform services

set -e

echo "🚀 Starting Knowledge Nexus Framework™ Services..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Start services
print_status "Starting services..."
docker-compose up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 15

# Check service status
print_status "Checking service status..."
docker-compose ps

print_success "Services started successfully! 🎉"
echo ""
echo "📊 Service URLs:"
echo "  • Load Balancer: http://localhost:80"
echo "  • Assessment Service: http://localhost:8001"
echo "  • Team Calibration: http://localhost:8002"
echo "  • Insights Engine: http://localhost:8003"
echo "  • Innovation Platform: http://localhost:8004"
echo "  • Metrics Service: http://localhost:8005"
echo "  • Regulatory Intelligence: http://localhost:8006"
echo "  • Data Nexus: http://localhost:8007"
echo "  • Prometheus: http://localhost:9090"
echo "  • Grafana: http://localhost:3000"
echo ""
echo "🔧 To view logs: docker-compose logs -f [service-name]"
echo "🔧 To stop services: docker-compose down"
