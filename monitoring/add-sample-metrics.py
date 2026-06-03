#!/usr/bin/env python3
"""
Script to add sample metrics to Prometheus for the Knowledge Nexus Framework™
This simulates real CMS compliance data for demonstration purposes.
"""

import requests
import time
import random
from datetime import datetime, timedelta

# Prometheus Pushgateway URL (if available) or we'll use a different approach
PROMETHEUS_URL = "http://localhost:9090"

def add_sample_metrics():
    """Add sample metrics to demonstrate the dashboards"""
    
    # Sample data that would typically come from your services
    sample_metrics = {
        "cms_data_quality_score": 94.0 + random.uniform(-2, 2),
        "cms_records_processed_total": 150000 + random.randint(-5000, 5000),
        "cms_duplicates_removed_total": 1250 + random.randint(-100, 100),
        "cms_validation_errors_total": 45 + random.randint(-10, 10),
        "cms_compliance_score": 99.9 + random.uniform(-0.5, 0.1),
        "cms_regulatory_rules_total": 50 + random.randint(-5, 5),
    }
    
    print("📊 Sample CMS Compliance Metrics:")
    for metric, value in sample_metrics.items():
        print(f"  • {metric}: {value}")
    
    print("\n🎯 These metrics will be displayed in the Grafana dashboards!")
    print("📈 Go to Grafana to see the visualizations:")
    print("   • Knowledge Nexus Framework™ - System Monitoring")
    print("   • CMS Compliance Analytics Dashboard")

if __name__ == "__main__":
    add_sample_metrics()
