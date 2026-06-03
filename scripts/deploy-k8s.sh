#!/bin/bash

# Knowledge Nexus Framework™ - Kubernetes Deployment Script
# This script deploys the Knowledge Nexus Framework to Kubernetes

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
NAMESPACE="cmsknf"
K8S_DIR="k8s"

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        print_error "kubectl cannot connect to cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create namespace
create_namespace() {
    print_status "Creating namespace $NAMESPACE..."
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_warning "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f $K8S_DIR/namespace.yaml
        print_success "Namespace $NAMESPACE created"
    fi
}

# Function to apply configurations
apply_configurations() {
    print_status "Applying configurations..."
    
    kubectl apply -f $K8S_DIR/configmap.yaml
    print_success "ConfigMap and Secrets applied"
}

# Function to deploy database
deploy_database() {
    print_status "Deploying PostgreSQL database..."
    
    kubectl apply -f $K8S_DIR/postgres.yaml
    print_success "PostgreSQL deployed"
    
    print_status "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    print_success "PostgreSQL is ready"
}

# Function to deploy Redis
deploy_redis() {
    print_status "Deploying Redis cache..."
    
    kubectl apply -f $K8S_DIR/redis.yaml
    print_success "Redis deployed"
    
    print_status "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    print_success "Redis is ready"
}

# Function to deploy services
deploy_services() {
    print_status "Deploying Knowledge Nexus Framework services..."
    
    kubectl apply -f $K8S_DIR/services.yaml
    print_success "Services deployed"
    
    print_status "Waiting for services to be ready..."
    kubectl wait --for=condition=ready pod -l app=data-nexus -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=regulatory-intelligence -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=insights-engine -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=team-calibration -n $NAMESPACE --timeout=300s
    print_success "All services are ready"
}

# Function to deploy ingress
deploy_ingress() {
    print_status "Deploying ingress..."
    
    kubectl apply -f $K8S_DIR/ingress.yaml
    print_success "Ingress deployed"
}

# Function to show deployment status
show_status() {
    print_status "Deployment Status:"
    echo "==================="
    
    echo ""
    print_status "Pods:"
    kubectl get pods -n $NAMESPACE
    
    echo ""
    print_status "Services:"
    kubectl get services -n $NAMESPACE
    
    echo ""
    print_status "Ingress:"
    kubectl get ingress -n $NAMESPACE
}

# Function to test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Get the ingress IP
    INGRESS_IP=$(kubectl get ingress cmsknf-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    
    if [ -n "$INGRESS_IP" ]; then
        print_status "Testing health endpoint at http://$INGRESS_IP/health"
        
        # Wait for the application to be ready
        sleep 30
        
        if curl -f -s "http://$INGRESS_IP/health" > /dev/null; then
            print_success "Application is healthy and responding"
            print_success "Knowledge Nexus Framework is deployed at: http://$INGRESS_IP"
        else
            print_warning "Application may still be starting up. Please check the health endpoint manually."
        fi
    else
        print_warning "Ingress IP not available yet. Please check the ingress status."
    fi
}

# Function to cleanup deployment
cleanup_deployment() {
    print_warning "This will delete the entire deployment. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up deployment..."
        
        kubectl delete -f $K8S_DIR/ingress.yaml --ignore-not-found=true
        kubectl delete -f $K8S_DIR/services.yaml --ignore-not-found=true
        kubectl delete -f $K8S_DIR/redis.yaml --ignore-not-found=true
        kubectl delete -f $K8S_DIR/postgres.yaml --ignore-not-found=true
        kubectl delete -f $K8S_DIR/configmap.yaml --ignore-not-found=true
        kubectl delete -f $K8S_DIR/namespace.yaml --ignore-not-found=true
        
        print_success "Deployment cleaned up"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to show logs
show_logs() {
    local service=${1:-data-nexus}
    
    print_status "Showing logs for $service..."
    kubectl logs -l app=$service -n $NAMESPACE --tail=100 -f
}

# Function to show usage
show_usage() {
    echo "Usage: $0 {deploy|status|test|logs|cleanup}"
    echo ""
    echo "Commands:"
    echo "  deploy     - Deploy the Knowledge Nexus Framework to Kubernetes"
    echo "  status     - Show deployment status"
    echo "  test       - Test the deployment"
    echo "  logs       - Show logs for a service (default: data-nexus)"
    echo "  cleanup    - Delete the deployment"
    echo ""
    echo "Examples:"
    echo "  $0 deploy              # Deploy the framework"
    echo "  $0 status              # Show deployment status"
    echo "  $0 test                # Test the deployment"
    echo "  $0 logs data-nexus     # Show logs for data-nexus service"
    echo "  $0 cleanup             # Delete the deployment"
}

# Main execution
main() {
    echo "=========================================="
    echo "Knowledge Nexus Framework™ - K8s Deployer"
    echo "=========================================="
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_namespace
            apply_configurations
            deploy_database
            deploy_redis
            deploy_services
            deploy_ingress
            show_status
            test_deployment
            ;;
        "status")
            show_status
            ;;
        "test")
            test_deployment
            ;;
        "logs")
            show_logs "$2"
            ;;
        "cleanup")
            cleanup_deployment
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
