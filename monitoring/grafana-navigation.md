# Grafana Navigation Guide

## 🎯 How to Access Your Custom Dashboards

### Step 1: Login to Grafana
- **URL**: http://localhost:3000
- **Username**: `admin`
- **Password**: `admin`

### Step 2: Navigate to Dashboards
1. **Click "Dashboards"** in the left sidebar (4th item down)
2. **Look for the folder**: "CMS Compliance Platform"
3. **You'll see two dashboards**:
   - **Knowledge Nexus Framework™ - System Monitoring**
   - **CMS Compliance Analytics Dashboard**

### Step 3: Alternative Navigation
If you don't see the dashboards in the folder:
1. **Click the search icon** (🔍) in the top bar
2. **Type**: "Knowledge Nexus" or "CMS Compliance"
3. **Select the dashboard** from search results

### Direct Dashboard URLs
- **System Monitoring**: http://localhost:3000/d/knowledge-nexus-dashboard/knowledge-nexus-framework-system-monitoring
- **CMS Compliance**: http://localhost:3000/d/cms-compliance-dashboard/cms-compliance-analytics-dashboard

## 📊 What You'll See

### Knowledge Nexus Framework™ - System Monitoring
- Request Rate by Service
- Response Time (95th percentile)
- Service Health Status
- Error Rate (5xx)
- Memory Usage

### CMS Compliance Analytics Dashboard
- Data Quality Score
- Records Processed
- Duplicates Removed
- Validation Errors
- Compliance Score
- Regulatory Rules

## 🔧 Troubleshooting
If dashboards don't appear:
1. **Refresh the page** (Ctrl+F5 or Cmd+Shift+R)
2. **Check browser console** for errors
3. **Try incognito/private mode**
4. **Clear browser cache**

## 📈 Data Source
- **Prometheus**: Connected and collecting metrics from all services
- **Real-time data**: Updates every 5 seconds
- **Historical data**: Available for trend analysis
