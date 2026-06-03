# Knowledge Nexus Framework™ - Deployment Guide

This guide provides comprehensive instructions for deploying the Knowledge Nexus Framework™ across different environments and platforms.

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [AWS Deployment](#aws-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [GitHub Actions CI/CD](#github-actions-cicd)
7. [Configuration](#configuration)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

## 🔧 **Prerequisites**

### **System Requirements**
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB+ available space
- **OS**: Linux, macOS, or Windows with WSL2

### **Software Requirements**
- **Docker**: 20.10+ with Docker Compose 2.0+
- **Git**: 2.30+
- **Python**: 3.9+ (for local development)
- **kubectl**: 1.20+ (for Kubernetes deployment)
- **AWS CLI**: 2.0+ (for AWS deployment)

## 🏠 **Local Development**

### **Quick Start**
```bash
# Clone the repository
git clone https://github.com/your-org/knowledge-nexus-framework.git
cd knowledge-nexus-framework

# Deploy the entire platform
docker compose up -d

# Verify deployment
docker compose ps
```

### **Access Points**
- **Main Application**: http://localhost
- **API Documentation**: http://localhost/docs
- **Monitoring**: http://localhost:3000 (Grafana)
- **Metrics**: http://localhost:9090 (Prometheus)

### **Development Commands**
```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Update and rebuild
docker compose down
docker compose up --build -d

# Run tests
python3 test_enhancements.py
```

## 🐳 **Docker Deployment**

### **Production Docker Compose**
```bash
# Use production configuration
docker compose -f docker-compose.prod.yml up -d

# With custom environment file
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### **Custom Configuration**
```bash
# Create environment file
cp .env.example .env.prod

# Edit configuration
nano .env.prod

# Deploy with custom config
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### **Docker Images**
```bash
# Build all images
./scripts/build-images.sh

# Build with specific tag
./scripts/build-images.sh v1.0.0

# Build and push to registry
./scripts/build-images.sh v1.0.0 true
```

## ☁️ **AWS Deployment**

### **Prerequisites**
1. AWS Account with appropriate permissions
2. AWS CLI configured
3. Key pair created in your region
4. Domain name (optional, for SSL)

### **Quick Deployment**
```bash
# Make deployment script executable
chmod +x aws/deploy.sh

# Create parameters file
./aws/deploy.sh create-params

# Edit parameters file with your values
nano aws/parameters.json

# Deploy to AWS
./aws/deploy.sh deploy
```

### **Manual CloudFormation Deployment**
```bash
# Validate template
aws cloudformation validate-template \
  --template-body file://aws/cloudformation-template.yaml

# Create stack
aws cloudformation create-stack \
  --stack-name knowledge-nexus-framework \
  --template-body file://aws/cloudformation-template.yaml \
  --parameters file://aws/parameters.json \
  --capabilities CAPABILITY_IAM
```

### **AWS Architecture**
- **VPC**: Custom VPC with public/private subnets
- **EC2**: Auto Scaling Group with Application Load Balancer
- **RDS**: PostgreSQL with Multi-AZ deployment
- **ElastiCache**: Redis cluster for caching
- **Secrets Manager**: Secure credential storage
- **CloudWatch**: Monitoring and logging

### **Post-Deployment**
1. **Configure DNS**: Point your domain to the Load Balancer
2. **SSL Certificate**: Request SSL certificate in ACM
3. **Update Security Groups**: Restrict access as needed
4. **Monitor**: Set up CloudWatch alarms

## ☸️ **Kubernetes Deployment**

### **Prerequisites**
1. Kubernetes cluster (1.20+)
2. kubectl configured
3. Ingress controller (nginx recommended)
4. cert-manager (for SSL certificates)

### **Quick Deployment**
```bash
# Make deployment script executable
chmod +x scripts/deploy-k8s.sh

# Deploy to Kubernetes
./scripts/deploy-k8s.sh deploy

# Check status
./scripts/deploy-k8s.sh status

# View logs
./scripts/deploy-k8s.sh logs data-nexus
```

### **Manual Kubernetes Deployment**
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configurations
kubectl apply -f k8s/configmap.yaml

# Deploy database
kubectl apply -f k8s/postgres.yaml

# Deploy cache
kubectl apply -f k8s/redis.yaml

# Deploy services
kubectl apply -f k8s/services.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### **Kubernetes Architecture**
- **Namespace**: Isolated cmsknf namespace
- **ConfigMap**: Application configuration
- **Secrets**: Sensitive data (passwords, API keys)
- **Deployments**: Service replicas with health checks
- **Services**: Internal service discovery
- **Ingress**: External access with SSL termination
- **PersistentVolumes**: Database storage

### **Scaling**
```bash
# Scale services
kubectl scale deployment data-nexus --replicas=5 -n cmsknf

# Horizontal Pod Autoscaler
kubectl autoscale deployment data-nexus --cpu-percent=70 --min=2 --max=10 -n cmsknf
```

## 🔄 **GitHub Actions CI/CD**

### **Setup**
1. **Repository Secrets**: Configure required secrets
2. **Environments**: Set up staging and production environments
3. **Branch Protection**: Configure branch protection rules

### **Required Secrets**
```yaml
# AWS Deployment
AWS_ACCESS_KEY_ID: your-access-key
AWS_SECRET_ACCESS_KEY: your-secret-key

# Container Registry
GITHUB_TOKEN: auto-generated

# Notifications
SLACK_WEBHOOK: your-slack-webhook-url
```

### **Workflow Triggers**
- **Push to main**: Deploy to production
- **Push to develop**: Deploy to staging
- **Pull Request**: Run tests and security scans

### **Pipeline Stages**
1. **Test**: Run unit tests and linting
2. **Build**: Build and push Docker images
3. **Deploy**: Deploy to appropriate environment
4. **Security**: Run vulnerability scans
5. **Notify**: Send deployment notifications

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_DB=cmsknf
POSTGRES_USER=cmsknf_user
POSTGRES_PASSWORD=your_password

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Security
JWT_SECRET_KEY=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# External APIs
CMS_API_KEY=your_cms_api_key
OPENAI_API_KEY=your_openai_key

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### **Service Configuration**
Each service can be configured independently:

```yaml
# docker-compose.yml
services:
  data-nexus:
    environment:
      - LOG_LEVEL=DEBUG
      - MAX_WORKERS=4
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

### **Database Configuration**
```sql
-- PostgreSQL optimizations
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

## 📊 **Monitoring**

### **Health Checks**
```bash
# Application health
curl http://localhost/health

# Service-specific health
curl http://localhost:8007/health  # Data Nexus
curl http://localhost:8006/health  # Regulatory Intelligence
curl http://localhost:8003/health  # Insights Engine
curl http://localhost:8002/health  # Team Calibration
```

### **Metrics Endpoints**
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
- **Service Metrics**: http://localhost:8007/metrics

### **Logging**
```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f data-nexus

# View logs with timestamps
docker compose logs -f -t
```

### **Performance Monitoring**
- **CPU Usage**: Monitor via Prometheus/Grafana
- **Memory Usage**: Track memory consumption
- **Database Performance**: Monitor query performance
- **API Response Times**: Track endpoint performance

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Services Not Starting**
```bash
# Check service status
docker compose ps

# View service logs
docker compose logs service-name

# Restart specific service
docker compose restart service-name
```

#### **Database Connection Issues**
```bash
# Check database connectivity
docker compose exec postgres psql -U cmsknf_user -d cmsknf -c "SELECT 1;"

# Reset database
docker compose down
docker volume rm cmsknf_postgres_data
docker compose up -d
```

#### **Memory Issues**
```bash
# Check memory usage
docker stats

# Increase memory limits
# Edit docker-compose.yml and restart
docker compose up -d
```

#### **Port Conflicts**
```bash
# Check port usage
netstat -tulpn | grep :8007

# Change ports in docker-compose.yml
# Restart services
docker compose up -d
```

### **Performance Optimization**

#### **Database Optimization**
```sql
-- Create indexes
CREATE INDEX idx_payments_physician_id ON payments(physician_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_amount ON payments(payment_amount);

-- Analyze tables
ANALYZE payments;
```

#### **Application Optimization**
```python
# Increase worker processes
workers = 4

# Enable connection pooling
pool_size = 20
max_overflow = 30

# Configure caching
cache_ttl = 3600
```

### **Security Hardening**

#### **Network Security**
```bash
# Restrict database access
# Only allow connections from application containers

# Use secrets management
# Store sensitive data in environment variables or secrets

# Enable SSL/TLS
# Configure SSL certificates for all endpoints
```

#### **Application Security**
```python
# Enable CORS
CORS_ORIGINS = ["https://yourdomain.com"]

# Rate limiting
RATE_LIMIT = "100/minute"

# Input validation
# Validate all input data
```

## 📞 **Support**

### **Getting Help**
1. **Documentation**: Check this guide and README.md
2. **Issues**: Create GitHub issues for bugs
3. **Discussions**: Use GitHub discussions for questions
4. **Wiki**: Check the project wiki for additional resources

### **Log Collection**
When reporting issues, please include:
```bash
# System information
docker --version
docker compose --version
uname -a

# Service logs
docker compose logs > logs.txt

# Configuration
cat docker-compose.yml > config.txt
```

---

**Knowledge Nexus Framework™** - *Deploy with confidence, scale with ease*
