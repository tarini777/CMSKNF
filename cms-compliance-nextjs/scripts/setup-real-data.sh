#!/bin/bash

# Real CMS Data Setup Script
# This script helps configure the Knowledge Nexus Framework for real CMS data

echo "🔧 Knowledge Nexus Framework - Real Data Setup"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Create .env.local with real data configuration
echo "📝 Creating .env.local configuration file..."

cat > .env.local << 'EOF'
# =============================================================================
# CMS FHIR API CONFIGURATION - REAL DATA SOURCES
# =============================================================================

# CMS FHIR API Configuration
CMS_FHIR_BASE_URL=https://api.cms.gov/fhir/v1
CMS_FHIR_CLIENT_ID=your-cms-client-id-here
CMS_FHIR_CLIENT_SECRET=your-cms-client-secret-here
CMS_FHIR_SCOPE=system/Patient.read system/Coverage.read system/ExplanationOfBenefit.read system/Task.read system/Practitioner.read
CMS_FHIR_TOKEN_URL=https://api.cms.gov/oauth2/token
CMS_FHIR_API_VERSION=4.0.1

# =============================================================================
# CMS OPEN PAYMENTS API CONFIGURATION
# =============================================================================

# CMS Open Payments API (Public - No Auth Required)
CMS_OPEN_PAYMENTS_BASE_URL=https://openpaymentsdata.cms.gov/api/v1

# =============================================================================
# EXTERNAL API CONFIGURATION
# =============================================================================

# PubMed API (NCBI E-utilities)
PUBMED_BASE_URL=https://eutils.ncbi.nlm.nih.gov/entrez/eutils
PUBMED_API_KEY=your-pubmed-api-key-here

# ClinicalTrials.gov API
CLINICALTRIALS_BASE_URL=https://clinicaltrials.gov/api/v2
CLINICALTRIALS_API_KEY=your-clinicaltrials-api-key-here

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Session Configuration
SESSION_SECRET="your-session-secret-key-change-this-in-production"
SESSION_MAX_AGE="86400"

# Encryption Keys
ENCRYPTION_KEY="your-32-character-encryption-key-here"
DATA_ENCRYPTION_ENABLED="true"

# =============================================================================
# FILE UPLOAD CONFIGURATION
# =============================================================================

# File Upload Limits
MAX_FILE_SIZE="104857600"  # 100MB in bytes
MAX_FILES_PER_UPLOAD="10"
ALLOWED_FILE_TYPES=".csv,.xlsx,.xls"

# File Storage
FILE_STORAGE_PATH="./uploads/"
FILE_CLEANUP_ENABLED="true"
FILE_RETENTION_DAYS="30"

# =============================================================================
# MONITORING & ALERTING
# =============================================================================

# System Monitoring
MONITORING_ENABLED="true"
HEALTH_CHECK_INTERVAL="60000"
PERFORMANCE_MONITORING_ENABLED="true"

# Alert Configuration
ALERT_SEVERITY_LEVELS="low,medium,high,critical"
ALERT_ESCALATION_TIME="24"
ALERT_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# API Monitoring
API_MONITORING_ENABLED="true"
API_HEALTH_CHECK_INTERVAL="60000"
API_TIMEOUT_THRESHOLD="5000"

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_ORIGIN="http://localhost:3000,https://your-domain.com"
CORS_CREDENTIALS="true"
EOF

echo "✅ .env.local created successfully!"
echo ""

# Prompt for CMS credentials
echo "🔑 CMS API Credentials Setup"
echo "============================"
echo ""
echo "To connect to real CMS data, you need to:"
echo ""
echo "1. Register at CMS API Portal: https://api.cms.gov/"
echo "2. Create an application for FHIR API access"
echo "3. Get your Client ID and Client Secret"
echo ""

read -p "Do you have CMS API credentials? (y/n): " has_credentials

if [ "$has_credentials" = "y" ] || [ "$has_credentials" = "Y" ]; then
    echo ""
    read -p "Enter your CMS Client ID: " cms_client_id
    read -p "Enter your CMS Client Secret: " cms_client_secret
    
    # Update the .env.local file with real credentials
    sed -i.bak "s/your-cms-client-id-here/$cms_client_id/g" .env.local
    sed -i.bak "s/your-cms-client-secret-here/$cms_client_secret/g" .env.local
    
    echo "✅ CMS credentials updated in .env.local"
else
    echo ""
    echo "⚠️  You'll need to manually update the CMS credentials in .env.local"
    echo "   - CMS_FHIR_CLIENT_ID=your-cms-client-id-here"
    echo "   - CMS_FHIR_CLIENT_SECRET=your-cms-client-secret-here"
fi

echo ""
echo "🔑 Optional API Keys Setup"
echo "=========================="
echo ""

read -p "Do you have a PubMed API key? (y/n): " has_pubmed_key
if [ "$has_pubmed_key" = "y" ] || [ "$has_pubmed_key" = "Y" ]; then
    read -p "Enter your PubMed API key: " pubmed_key
    sed -i.bak "s/your-pubmed-api-key-here/$pubmed_key/g" .env.local
    echo "✅ PubMed API key updated"
fi

read -p "Do you have a ClinicalTrials.gov API key? (y/n): " has_clinicaltrials_key
if [ "$has_clinicaltrials_key" = "y" ] || [ "$has_clinicaltrials_key" = "Y" ]; then
    read -p "Enter your ClinicalTrials.gov API key: " clinicaltrials_key
    sed -i.bak "s/your-clinicaltrials-api-key-here/$clinicaltrials_key/g" .env.local
    echo "✅ ClinicalTrials.gov API key updated"
fi

# Clean up backup files
rm -f .env.local.bak

echo ""
echo "🎉 Configuration Complete!"
echo "========================="
echo ""
echo "Next steps:"
echo "1. Review and update .env.local with your credentials"
echo "2. Restart the application: npm run dev"
echo "3. Check the monitoring dashboard for API health"
echo "4. Test real data queries"
echo ""
echo "📖 For detailed setup instructions, see: REAL_DATA_SETUP.md"
echo ""
echo "🔍 To verify real data connection:"
echo "   curl 'http://localhost:3000/api/monitoring/status?type=dashboard'"
echo ""
