#!/bin/bash

# Knowledge Nexus Framework™ - AWS Deployment Script
# This script deploys the Knowledge Nexus Framework to AWS using CloudFormation

set -e

# Configuration
STACK_NAME="knowledge-nexus-framework"
REGION="us-east-1"
TEMPLATE_FILE="aws/cloudformation-template.yaml"
PARAMETERS_FILE="aws/parameters.json"

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if AWS CLI is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create parameters file
create_parameters_file() {
    print_status "Creating parameters file..."
    
    cat > $PARAMETERS_FILE << EOF
[
    {
        "ParameterKey": "Environment",
        "ParameterValue": "production"
    },
    {
        "ParameterKey": "InstanceType",
        "ParameterValue": "t3.large"
    },
    {
        "ParameterKey": "DatabaseInstanceClass",
        "ParameterValue": "db.t3.medium"
    },
    {
        "ParameterKey": "KeyPairName",
        "ParameterValue": "your-key-pair-name"
    },
    {
        "ParameterKey": "AdminEmail",
        "ParameterValue": "admin@yourcompany.com"
    }
]
EOF
    
    print_warning "Please edit $PARAMETERS_FILE with your actual values before deploying"
}

# Function to validate template
validate_template() {
    print_status "Validating CloudFormation template..."
    
    if aws cloudformation validate-template --template-body file://$TEMPLATE_FILE --region $REGION; then
        print_success "Template validation passed"
    else
        print_error "Template validation failed"
        exit 1
    fi
}

# Function to check if stack exists
stack_exists() {
    aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null
}

# Function to deploy stack
deploy_stack() {
    print_status "Deploying Knowledge Nexus Framework to AWS..."
    
    if stack_exists; then
        print_status "Stack exists, updating..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://$TEMPLATE_FILE \
            --parameters file://$PARAMETERS_FILE \
            --capabilities CAPABILITY_IAM \
            --region $REGION
        
        print_status "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
    else
        print_status "Creating new stack..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://$TEMPLATE_FILE \
            --parameters file://$PARAMETERS_FILE \
            --capabilities CAPABILITY_IAM \
            --region $REGION
        
        print_status "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
    fi
    
    print_success "Stack deployment completed"
}

# Function to get stack outputs
get_outputs() {
    print_status "Retrieving stack outputs..."
    
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output table
}

# Function to test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Get the load balancer URL
    LB_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
        --output text)
    
    if [ -n "$LB_URL" ]; then
        print_status "Testing health endpoint at $LB_URL/health"
        
        # Wait for the application to be ready
        sleep 60
        
        if curl -f -s "$LB_URL/health" > /dev/null; then
            print_success "Application is healthy and responding"
            print_success "Knowledge Nexus Framework is deployed at: $LB_URL"
        else
            print_warning "Application may still be starting up. Please check the health endpoint manually."
        fi
    else
        print_error "Could not retrieve load balancer URL"
    fi
}

# Function to show deployment information
show_deployment_info() {
    print_status "Deployment Information:"
    echo "=================================="
    echo "Stack Name: $STACK_NAME"
    echo "Region: $REGION"
    echo "Template: $TEMPLATE_FILE"
    echo "Parameters: $PARAMETERS_FILE"
    echo ""
    
    print_status "Next Steps:"
    echo "1. Edit $PARAMETERS_FILE with your actual values"
    echo "2. Run this script again to deploy"
    echo "3. Access the application via the Load Balancer URL"
    echo "4. Check CloudWatch logs for any issues"
    echo "5. Configure your domain name and SSL certificate"
}

# Main execution
main() {
    echo "=========================================="
    echo "Knowledge Nexus Framework™ - AWS Deployment"
    echo "=========================================="
    echo ""
    
    case "${1:-deploy}" in
        "check")
            check_prerequisites
            ;;
        "validate")
            check_prerequisites
            validate_template
            ;;
        "create-params")
            create_parameters_file
            ;;
        "deploy")
            check_prerequisites
            validate_template
            
            if [ ! -f "$PARAMETERS_FILE" ]; then
                print_warning "Parameters file not found. Creating template..."
                create_parameters_file
                show_deployment_info
                exit 0
            fi
            
            deploy_stack
            get_outputs
            test_deployment
            ;;
        "info")
            show_deployment_info
            ;;
        "cleanup")
            print_warning "This will delete the entire stack. Are you sure? (y/N)"
            read -r response
            if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
                print_status "Stack deletion initiated. This may take several minutes."
            else
                print_status "Cleanup cancelled"
            fi
            ;;
        *)
            echo "Usage: $0 {check|validate|create-params|deploy|info|cleanup}"
            echo ""
            echo "Commands:"
            echo "  check       - Check prerequisites"
            echo "  validate    - Validate CloudFormation template"
            echo "  create-params - Create parameters file template"
            echo "  deploy      - Deploy the stack (default)"
            echo "  info        - Show deployment information"
            echo "  cleanup     - Delete the stack"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
