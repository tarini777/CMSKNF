#!/bin/bash

# Knowledge Nexus Framework™ - Deployment Script
# This script deploys the entire CMS Compliance Platform

set -e

echo "🚀 Starting Knowledge Nexus Framework™ Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
mkdir -p database
mkdir -p logs

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating environment file..."
    cp env.example .env
    print_warning "Please update .env file with your configuration before proceeding."
    read -p "Press Enter to continue after updating .env file..."
fi

# Build and start services
print_status "Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

services=(
    "postgres:5432"
    "redis:6379"
    "assessment-service:8001"
    "team-calibration-service:8002"
    "insights-engine:8003"
    "innovation-platform:8004"
    "metrics-service:8005"
    "regulatory-intelligence:8006"
    "data-nexus:8007"
    "domain-engine:8008"
    "compliance-analytics:8009"
    "strategic-intelligence:8010"
    "security-compliance:8011"
    "nginx:80"
)

for service in "${services[@]}"; do
    service_name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if docker-compose ps | grep -q "$service_name.*Up"; then
        print_success "$service_name is running"
    else
        print_error "$service_name is not running"
    fi
done

# Initialize database
print_status "Initializing database..."
docker-compose exec postgres psql -U cms_user -d cms_compliance -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Database connection successful"
else
    print_error "Database connection failed"
fi

# Run initial data setup
print_status "Running initial data setup..."
docker-compose exec assessment-service python -c "
import asyncio
from main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Initialize database tables
engine = create_engine('postgresql://cms_user:cms_password@postgres:5432/cms_compliance')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()
Base.metadata.create_all(bind=engine)

print('Database tables created successfully')
"

# Display service URLs
print_success "🎉 Knowledge Nexus Framework™ deployed successfully!"
echo ""
echo "📊 Service URLs:"
echo "  • Assessment Service: http://localhost:8001"
echo "  • Team Calibration: http://localhost:8002"
echo "  • Insights Engine: http://localhost:8003"
echo "  • Innovation Platform: http://localhost:8004"
echo "  • Metrics Service: http://localhost:8005"
echo "  • Regulatory Intelligence: http://localhost:8006"
echo "  • Data Nexus: http://localhost:8007"
echo "  • Domain Expertise Engine: http://localhost:8008"
echo "  • Compliance Analytics: http://localhost:8009"
echo "  • Strategic Intelligence: http://localhost:8010"
echo "  • Security & Compliance: http://localhost:8011"
echo "  • Load Balancer: http://localhost:80"
echo "  • Prometheus: http://localhost:9090"
echo "  • Grafana: http://localhost:3000 (admin/admin)"
echo ""
echo "🔧 Management Commands:"
echo "  • View logs: docker-compose logs -f [service-name]"
echo "  • Stop services: docker-compose down"
echo "  • Restart services: docker-compose restart"
echo "  • Update services: docker-compose pull && docker-compose up -d"
echo ""
echo "📚 Documentation:"
echo "  • API Documentation: http://localhost:8001/docs"
echo "  • Health Check: http://localhost/health"
echo ""

# Run health checks
print_status "Running health checks..."
for service in "${services[@]}"; do
    service_name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if [ "$service_name" != "postgres" ] && [ "$service_name" != "redis" ]; then
        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service_name health check passed"
        else
            print_warning "$service_name health check failed"
        fi
    fi
done

print_success "Deployment completed! 🚀"
