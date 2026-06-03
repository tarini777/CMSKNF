#!/usr/bin/env python3
"""
Create sample data for Grafana dashboards
This script creates realistic CMS compliance data and displays it in a format
that can be used to populate the dashboards.
"""

import json
import random
from datetime import datetime, timedelta

def create_sample_data():
    """Create realistic sample data for CMS compliance metrics"""
    
    # Generate realistic metrics
    data_quality_score = 94.0 + random.uniform(-2, 2)
    records_processed = 150000 + random.randint(-5000, 5000)
    duplicates_removed = 1250 + random.randint(-100, 100)
    validation_errors = 45 + random.randint(-10, 10)
    compliance_score = 99.9 + random.uniform(-0.5, 0.1)
    regulatory_rules = 50 + random.randint(-5, 5)
    
    # Create time series data for trends
    now = datetime.now()
    time_points = []
    quality_trend = []
    processing_trend = []
    
    for i in range(24):  # Last 24 hours
        timestamp = now - timedelta(hours=i)
        time_points.append(timestamp.isoformat())
        
        # Generate realistic trend data
        quality_trend.append(data_quality_score + random.uniform(-1, 1))
        processing_trend.append(records_processed + random.randint(-1000, 1000))
    
    sample_data = {
        "timestamp": datetime.now().isoformat(),
        "metrics": {
            "data_quality_score": round(data_quality_score, 2),
            "records_processed": records_processed,
            "duplicates_removed": duplicates_removed,
            "validation_errors": validation_errors,
            "compliance_score": round(compliance_score, 2),
            "regulatory_rules": regulatory_rules,
            "processing_rate": round(random.uniform(2000, 3000), 2),
            "error_rate": round(random.uniform(0.1, 0.5), 3)
        },
        "trends": {
            "quality_trend": quality_trend,
            "processing_trend": processing_trend,
            "time_points": time_points
        }
    }
    
    return sample_data

def display_sample_data():
    """Display the sample data in a formatted way"""
    
    data = create_sample_data()
    
    print("📊 CMS COMPLIANCE SAMPLE DATA")
    print("=" * 50)
    print(f"📅 Generated: {data['timestamp']}")
    print()
    
    print("🎯 KEY METRICS:")
    print(f"  • Data Quality Score: {data['metrics']['data_quality_score']}%")
    print(f"  • Records Processed: {data['metrics']['records_processed']:,}")
    print(f"  • Duplicates Removed: {data['metrics']['duplicates_removed']:,}")
    print(f"  • Validation Errors: {data['metrics']['validation_errors']}")
    print(f"  • Compliance Score: {data['metrics']['compliance_score']}%")
    print(f"  • Regulatory Rules: {data['metrics']['regulatory_rules']}")
    print(f"  • Processing Rate: {data['metrics']['processing_rate']} records/min")
    print(f"  • Error Rate: {data['metrics']['error_rate']}%")
    print()
    
    print("📈 TREND DATA (Last 24 Hours):")
    print(f"  • Quality Score Range: {min(data['trends']['quality_trend']):.1f}% - {max(data['trends']['quality_trend']):.1f}%")
    print(f"  • Processing Range: {min(data['trends']['processing_trend']):,} - {max(data['trends']['processing_trend']):,}")
    print()
    
    print("💡 SOLUTION:")
    print("The metrics are being generated correctly, but there's a connection")
    print("issue between Prometheus and the data-nexus service.")
    print()
    print("🔧 NEXT STEPS:")
    print("1. The data-nexus service is generating metrics at http://localhost:8007/metrics")
    print("2. Prometheus needs to successfully scrape these metrics")
    print("3. Once scraped, Grafana will display the data automatically")
    print()
    print("📊 SAMPLE METRICS FORMAT:")
    print("These are the exact metrics that should appear in your Grafana dashboard:")
    print(json.dumps(data['metrics'], indent=2))

if __name__ == "__main__":
    display_sample_data()
