#!/bin/bash

# Real Data Connection Test Script
# This script tests the connection to real CMS data sources

echo "🔍 Knowledge Nexus Framework - Real Data Connection Test"
echo "========================================================"
echo ""

BASE_URL="http://localhost:3000"

# Function to test API endpoint
test_api() {
    local name="$1"
    local endpoint="$2"
    local expected_status="$3"
    
    echo "Testing $name..."
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$endpoint")
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ $name: Connected (Status: $status_code)"
        
        # Check for demo mode indicators
        if grep -q "demo" /tmp/response.json 2>/dev/null; then
            echo "⚠️  $name: Still in demo mode"
        else
            echo "🎉 $name: Real data mode active"
        fi
    else
        echo "❌ $name: Failed (Status: $status_code)"
    fi
    echo ""
}

# Test all API endpoints
echo "🧪 Testing API Connections..."
echo "=============================="
echo ""

test_api "Connectivity (all services)" "$BASE_URL/api/connectivity" "200"
test_api "CMS FHIR API" "$BASE_URL/api/cms/fhir?action=health" "200"
test_api "Open Payments API" "$BASE_URL/api/open-payments?action=health" "200"
test_api "PubMed API" "$BASE_URL/api/pubmed?action=health" "200"
test_api "ClinicalTrials API" "$BASE_URL/api/clinicaltrials?action=health" "200"

echo ""
echo "🌍 Geographic / International Rules"
echo "==================================="
geo_rules=$(curl -s "$BASE_URL/api/glossary?action=rules&category=geographic")
echo "$geo_rules" | jq '.data.rules[] | {id, name, result}' 2>/dev/null || echo "$geo_rules"
echo ""

echo "📊 Monitoring Dashboard Status"
echo "============================="
echo ""

# Test monitoring dashboard
echo "Testing monitoring dashboard..."
monitoring_response=$(curl -s "$BASE_URL/api/monitoring/status?type=dashboard")
echo "$monitoring_response" | jq '.' 2>/dev/null || echo "$monitoring_response"

echo ""
echo "🔍 Real Data Queries Test"
echo "========================="
echo ""

# Test real data queries
echo "Testing Open Payments search..."
open_payments_response=$(curl -s "$BASE_URL/api/open-payments?action=search&limit=5&programYear=2023")
echo "Open Payments Response:"
echo "$open_payments_response" | jq '.data | length' 2>/dev/null || echo "Response received"

echo ""
echo "Testing PubMed search..."
pubmed_response=$(curl -s "$BASE_URL/api/pubmed?action=search&query=diabetes&limit=5")
echo "PubMed Response:"
echo "$pubmed_response" | jq '.data | length' 2>/dev/null || echo "Response received"

echo ""
echo "Testing ClinicalTrials search..."
clinicaltrials_response=$(curl -s "$BASE_URL/api/clinicaltrials?action=search&condition=diabetes&limit=5")
echo "ClinicalTrials Response:"
echo "$clinicaltrials_response" | jq '.data | length' 2>/dev/null || echo "Response received"

echo ""
echo "🎯 Summary"
echo "=========="
echo ""

# Check for demo mode indicators in logs
echo "Checking for demo mode indicators..."
if curl -s "$BASE_URL/api/monitoring/status?type=dashboard" | grep -q "demo"; then
    echo "⚠️  System still in demo mode"
    echo "   - Check your .env.local configuration"
    echo "   - Verify API credentials are correct"
    echo "   - Restart the application after configuration changes"
else
    echo "✅ System appears to be using real data sources"
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. If any tests failed, check your API credentials"
echo "2. Verify all environment variables are set correctly"
echo "3. Restart the application: npm run dev"
echo "4. Check the monitoring dashboard at: $BASE_URL"
echo ""

# Clean up
rm -f /tmp/response.json
