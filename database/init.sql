-- Knowledge Nexus Framework™ - Database Initialization Script
-- This script initializes the CMS Compliance Platform database
--
-- ARCHITECTURE DOCS (lineage, CMS PUF, source systems):
--   database/README.md
--   database/ARCHITECTURE.md
--   database/LINEAGE_SCHEMA.md
--   database/CMS_PUF_MAPPING.md
--   database/SOURCE_SYSTEMS.md
--
-- Application runtime schema (SQLite/Prisma): cms-compliance-nextjs/prisma/schema.prisma
-- CMS reference: docs/open_payments_data_dictionary_methodology-january_2025.pdf

-- Create database if it doesn't exist
CREATE DATABASE cms_compliance;

-- Use the database
\c cms_compliance;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS assessment;
CREATE SCHEMA IF NOT EXISTS team_calibration;
CREATE SCHEMA IF NOT EXISTS insights;
CREATE SCHEMA IF NOT EXISTS innovation;
CREATE SCHEMA IF NOT EXISTS metrics;
CREATE SCHEMA IF NOT EXISTS regulatory;
CREATE SCHEMA IF NOT EXISTS data_nexus;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cms_user;

-- Create initial tables for each service
-- Assessment Service Tables
CREATE TABLE IF NOT EXISTS assessment.assessment_metrics (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(255) UNIQUE NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    current_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    gap_percentage DECIMAL(5,2),
    priority_score INTEGER,
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS assessment.vendor_performance (
    id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100),
    sla_compliance_rate DECIMAL(5,2),
    cost_per_transaction DECIMAL(10,2),
    knowledge_retention_score DECIMAL(3,1),
    innovation_capability_score DECIMAL(3,1),
    stakeholder_satisfaction DECIMAL(3,1),
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Team Calibration Service Tables
CREATE TABLE IF NOT EXISTS team_calibration.users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    department VARCHAR(100),
    role VARCHAR(100),
    expertise_areas JSONB,
    skill_levels JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_calibration.teams (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(255) UNIQUE NOT NULL,
    team_name VARCHAR(255) NOT NULL,
    team_type VARCHAR(100),
    description TEXT,
    objectives JSONB,
    success_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team_lead_id VARCHAR(255)
);

-- Insights Engine Tables
CREATE TABLE IF NOT EXISTS insights.regulation_updates (
    id SERIAL PRIMARY KEY,
    update_id VARCHAR(255) UNIQUE NOT NULL,
    regulation_type VARCHAR(100),
    regulation_name VARCHAR(255),
    update_description TEXT,
    effective_date TIMESTAMP,
    impact_level VARCHAR(50),
    affected_areas JSONB,
    compliance_requirements JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS insights.anomaly_detections (
    id SERIAL PRIMARY KEY,
    detection_id VARCHAR(255) UNIQUE NOT NULL,
    transaction_id VARCHAR(255),
    anomaly_type VARCHAR(100),
    anomaly_score DECIMAL(5,3),
    description TEXT,
    severity VARCHAR(50),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    reviewer_id VARCHAR(255),
    resolution_notes TEXT
);

-- Innovation Platform Tables
CREATE TABLE IF NOT EXISTS innovation.market_trends (
    id SERIAL PRIMARY KEY,
    trend_id VARCHAR(255) UNIQUE NOT NULL,
    trend_type VARCHAR(100),
    trend_name VARCHAR(255),
    description TEXT,
    confidence_score DECIMAL(3,2),
    impact_score DECIMAL(3,2),
    trend_data JSONB,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS innovation.competitive_intelligence (
    id SERIAL PRIMARY KEY,
    intelligence_id VARCHAR(255) UNIQUE NOT NULL,
    competitor_name VARCHAR(255),
    intelligence_type VARCHAR(100),
    data_points JSONB,
    insights JSONB,
    confidence_level DECIMAL(3,2),
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metrics Service Tables
CREATE TABLE IF NOT EXISTS metrics.performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_id VARCHAR(255) UNIQUE NOT NULL,
    metric_name VARCHAR(255),
    metric_type VARCHAR(100),
    metric_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    unit VARCHAR(50),
    measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period VARCHAR(50),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS metrics.roi_metrics (
    id SERIAL PRIMARY KEY,
    roi_id VARCHAR(255) UNIQUE NOT NULL,
    metric_name VARCHAR(255),
    investment_amount DECIMAL(15,2),
    return_amount DECIMAL(15,2),
    roi_percentage DECIMAL(5,2),
    payback_period_months DECIMAL(5,2),
    measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period VARCHAR(50),
    metadata JSONB
);

-- Regulatory Intelligence Tables
CREATE TABLE IF NOT EXISTS regulatory.regulations (
    id SERIAL PRIMARY KEY,
    regulation_id VARCHAR(255) UNIQUE NOT NULL,
    regulation_type VARCHAR(100),
    jurisdiction VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    effective_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    source_url VARCHAR(500),
    raw_data JSONB,
    parsed_requirements JSONB
);

CREATE TABLE IF NOT EXISTS regulatory.thresholds (
    id SERIAL PRIMARY KEY,
    threshold_id VARCHAR(255) UNIQUE NOT NULL,
    threshold_type VARCHAR(100),
    jurisdiction VARCHAR(100),
    current_value DECIMAL(10,2),
    previous_value DECIMAL(10,2),
    effective_date TIMESTAMP,
    next_review_date TIMESTAMP,
    update_frequency VARCHAR(50),
    source VARCHAR(255),
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Nexus Tables
CREATE TABLE IF NOT EXISTS data_nexus.data_sources (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255) UNIQUE NOT NULL,
    source_name VARCHAR(255),
    source_type VARCHAR(100),
    connection_type VARCHAR(100),
    connection_config JSONB,
    authentication_config JSONB,
    data_schema JSONB,
    last_sync TIMESTAMP,
    sync_frequency VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_nexus.data_records (
    id SERIAL PRIMARY KEY,
    record_id VARCHAR(255) UNIQUE NOT NULL,
    source_id VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    raw_data JSONB,
    normalized_data JSONB,
    data_hash VARCHAR(255),
    quality_score DECIMAL(3,2),
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_errors JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_metrics_assessment_id ON assessment.assessment_metrics(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_metrics_metric_type ON assessment.assessment_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_vendor_performance_vendor_name ON assessment.vendor_performance(vendor_name);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON team_calibration.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON team_calibration.users(email);
CREATE INDEX IF NOT EXISTS idx_teams_team_id ON team_calibration.teams(team_id);

CREATE INDEX IF NOT EXISTS idx_regulation_updates_update_id ON insights.regulation_updates(update_id);
CREATE INDEX IF NOT EXISTS idx_regulation_updates_regulation_type ON insights.regulation_updates(regulation_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_detection_id ON insights.anomaly_detections(detection_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_transaction_id ON insights.anomaly_detections(transaction_id);

CREATE INDEX IF NOT EXISTS idx_market_trends_trend_id ON innovation.market_trends(trend_id);
CREATE INDEX IF NOT EXISTS idx_market_trends_trend_type ON innovation.market_trends(trend_type);
CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_intelligence_id ON innovation.competitive_intelligence(intelligence_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_competitor_name ON innovation.competitive_intelligence(competitor_name);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_id ON metrics.performance_metrics(metric_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON metrics.performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_roi_metrics_roi_id ON metrics.roi_metrics(roi_id);

CREATE INDEX IF NOT EXISTS idx_regulations_regulation_id ON regulatory.regulations(regulation_id);
CREATE INDEX IF NOT EXISTS idx_regulations_regulation_type ON regulatory.regulations(regulation_type);
CREATE INDEX IF NOT EXISTS idx_thresholds_threshold_id ON regulatory.thresholds(threshold_id);
CREATE INDEX IF NOT EXISTS idx_thresholds_threshold_type ON regulatory.thresholds(threshold_type);

CREATE INDEX IF NOT EXISTS idx_data_sources_source_id ON data_nexus.data_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_source_name ON data_nexus.data_sources(source_name);
CREATE INDEX IF NOT EXISTS idx_data_records_record_id ON data_nexus.data_records(record_id);
CREATE INDEX IF NOT EXISTS idx_data_records_source_id ON data_nexus.data_records(source_id);
CREATE INDEX IF NOT EXISTS idx_data_records_entity_type ON data_nexus.data_records(entity_type);
CREATE INDEX IF NOT EXISTS idx_data_records_entity_id ON data_nexus.data_records(entity_id);

-- Insert initial data
INSERT INTO regulatory.thresholds (threshold_id, threshold_type, jurisdiction, current_value, effective_date, next_review_date, update_frequency, source) VALUES
('THRESH_DE_MINIMIS_2024', 'de_minimis', 'Federal', 11.04, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 'monthly', 'CMS API')
ON CONFLICT (threshold_id) DO NOTHING;

INSERT INTO regulatory.regulations (regulation_id, regulation_type, jurisdiction, title, description, effective_date, status, source_url, parsed_requirements) VALUES
('REG_CMS_OPEN_PAYMENTS', 'CMS', 'Federal', 'CMS Open Payments Program', 'General requirements for CMS Open Payments reporting', CURRENT_TIMESTAMP, 'active', 'https://www.cms.gov/openpayments', '{"reporting_deadline": "March 31st annually", "data_retention": "7 years", "audit_requirements": "Annual compliance audit", "dispute_process": "45-day dispute period"}')
ON CONFLICT (regulation_id) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA assessment TO cms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA team_calibration TO cms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA insights TO cms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA innovation TO cms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA metrics TO cms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA regulatory TO cms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA data_nexus TO cms_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA assessment TO cms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA team_calibration TO cms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA insights TO cms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA innovation TO cms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA metrics TO cms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA regulatory TO cms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA data_nexus TO cms_user;

-- Create views for common queries
CREATE OR REPLACE VIEW assessment.vendor_performance_summary AS
SELECT 
    vendor_name,
    AVG(sla_compliance_rate) as avg_sla_compliance,
    AVG(cost_per_transaction) as avg_cost_per_transaction,
    AVG(knowledge_retention_score) as avg_knowledge_retention,
    AVG(innovation_capability_score) as avg_innovation_capability,
    AVG(stakeholder_satisfaction) as avg_stakeholder_satisfaction,
    COUNT(*) as assessment_count
FROM assessment.vendor_performance
GROUP BY vendor_name;

CREATE OR REPLACE VIEW metrics.performance_dashboard AS
SELECT 
    metric_name,
    metric_type,
    AVG(metric_value) as avg_value,
    AVG(target_value) as avg_target,
    COUNT(*) as measurement_count,
    MAX(measurement_date) as last_measurement
FROM metrics.performance_metrics
WHERE measurement_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY metric_name, metric_type;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION assessment.calculate_gap_percentage(current_val DECIMAL, target_val DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF target_val = 0 THEN
        RETURN 0;
    END IF;
    RETURN ((target_val - current_val) / target_val) * 100;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION metrics.calculate_roi(investment DECIMAL, return_amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF investment = 0 THEN
        RETURN 0;
    END IF;
    RETURN ((return_amount - investment) / investment) * 100;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_nexus.data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_records_updated_at BEFORE UPDATE ON data_nexus.data_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO team_calibration.users (user_id, email, first_name, last_name, department, role, expertise_areas, skill_levels) VALUES
('USER_ADMIN_001', 'admin@cms-compliance.com', 'Admin', 'User', 'IT', 'Administrator', '["CMS Compliance", "Data Management", "System Administration"]', '{"CMS Compliance": 9, "Data Management": 8, "System Administration": 9}')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO team_calibration.teams (team_id, team_name, team_type, description, objectives, success_metrics) VALUES
('TEAM_DOMAIN_001', 'Domain Experts Team', 'Domain_Experts', 'CMS regulation specialists and compliance experts', '["Maintain regulatory expertise", "Provide compliance guidance", "Train team members"]', '{"expertise_retention": 95, "training_completion": 100, "compliance_accuracy": 99.9}')
ON CONFLICT (team_id) DO NOTHING;

-- Commit the transaction
COMMIT;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Knowledge Nexus Framework™ database initialization completed successfully!';
    RAISE NOTICE 'Database: cms_compliance';
    RAISE NOTICE 'User: cms_user';
    RAISE NOTICE 'Schemas created: assessment, team_calibration, insights, innovation, metrics, regulatory, data_nexus';
    RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema IN ('assessment', 'team_calibration', 'insights', 'innovation', 'metrics', 'regulatory', 'data_nexus'));
    RAISE NOTICE 'Indexes created: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname IN ('assessment', 'team_calibration', 'insights', 'innovation', 'metrics', 'regulatory', 'data_nexus'));
END $$;
