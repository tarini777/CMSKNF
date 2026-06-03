#!/bin/bash

# Knowledge Nexus Framework™ - Docker Image Build Script
# This script builds all Docker images for the Knowledge Nexus Framework

set -e

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

# Configuration
REGISTRY="your-registry.com"
TAG="${1:-latest}"
PUSH_TO_REGISTRY="${2:-false}"

# List of services to build
SERVICES=(
    "assessment-service"
    "team-calibration-service"
    "insights-engine"
    "innovation-platform"
    "metrics-service"
    "regulatory-intelligence"
    "data-nexus"
    "domain-engine"
    "compliance-analytics"
    "strategic-intelligence"
    "security-compliance"
)

print_status "Building Knowledge Nexus Framework™ Docker Images"
print_status "Registry: $REGISTRY"
print_status "Tag: $TAG"
print_status "Push to Registry: $PUSH_TO_REGISTRY"
echo ""

# Function to build a service
build_service() {
    local service=$1
    local image_name="$REGISTRY/cmsknf-$service:$TAG"
    
    print_status "Building $service..."
    
    if [ -d "services/$service" ]; then
        cd "services/$service"
        
        # Build the Docker image
        if docker build -t "$image_name" .; then
            print_success "Successfully built $image_name"
            
            # Push to registry if requested
            if [ "$PUSH_TO_REGISTRY" = "true" ]; then
                print_status "Pushing $image_name to registry..."
                if docker push "$image_name"; then
                    print_success "Successfully pushed $image_name"
                else
                    print_error "Failed to push $image_name"
                    return 1
                fi
            fi
        else
            print_error "Failed to build $service"
            return 1
        fi
        
        cd ../..
    else
        print_warning "Service directory services/$service not found, skipping..."
    fi
}

# Function to build all services
build_all_services() {
    local failed_services=()
    
    for service in "${SERVICES[@]}"; do
        if ! build_service "$service"; then
            failed_services+=("$service")
        fi
    done
    
    echo ""
    if [ ${#failed_services[@]} -eq 0 ]; then
        print_success "All services built successfully!"
        
        if [ "$PUSH_TO_REGISTRY" = "true" ]; then
            print_success "All images pushed to registry successfully!"
        fi
        
        print_status "Image Summary:"
        for service in "${SERVICES[@]}"; do
            echo "  - $REGISTRY/cmsknf-$service:$TAG"
        done
    else
        print_error "Failed to build the following services:"
        for service in "${failed_services[@]}"; do
            echo "  - $service"
        done
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [TAG] [PUSH_TO_REGISTRY]"
    echo ""
    echo "Arguments:"
    echo "  TAG              Docker image tag (default: latest)"
    echo "  PUSH_TO_REGISTRY Push images to registry (true/false, default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build with 'latest' tag, don't push"
    echo "  $0 v1.0.0            # Build with 'v1.0.0' tag, don't push"
    echo "  $0 latest true       # Build with 'latest' tag and push to registry"
    echo "  $0 v1.0.0 true       # Build with 'v1.0.0' tag and push to registry"
}

# Main execution
main() {
    echo "=========================================="
    echo "Knowledge Nexus Framework™ - Image Builder"
    echo "=========================================="
    echo ""
    
    case "${1:-help}" in
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            build_all_services
            ;;
    esac
}

# Run main function
main "$@"
