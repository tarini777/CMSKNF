"""
Knowledge Nexus Framework™ - Backend API
Simple, modular Python Flask API for CMS compliance data
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import random
import time
from datetime import datetime, timedelta
import json
import os
import signal
import sys
import logging
from werkzeug.utils import secure_filename

# Import our new services
from services.data_processor import DataProcessor
from services.rules_engine import RulesEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS properly
CORS(app, 
     origins=["http://localhost:3001", "http://127.0.0.1:3001"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Initialize services
data_processor = DataProcessor()
rules_engine = RulesEngine()

# Global flag for graceful shutdown
shutdown_flag = False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global shutdown_flag
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_flag = True
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Configure file upload
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ============================================================================
# DATA MODELS
# ============================================================================

class CMSMetrics:
    """Simple data model for CMS compliance metrics"""
    
    def __init__(self):
        self.base_values = {
            'data_quality_score': 94.0,
            'records_processed': 150000,
            'duplicates_removed': 1250,
            'validation_errors': 45,
            'compliance_score': 99.9,
            'regulatory_rules': 50,
            'processing_rate': 2500,
            'error_rate': 0.2
        }
    
    def generate_realistic_data(self):
        """Generate realistic CMS compliance data with variations"""
        return {
            'data_quality_score': round(self.base_values['data_quality_score'] + random.uniform(-2, 2), 2),
            'records_processed': self.base_values['records_processed'] + random.randint(-5000, 5000),
            'duplicates_removed': self.base_values['duplicates_removed'] + random.randint(-100, 100),
            'validation_errors': self.base_values['validation_errors'] + random.randint(-10, 10),
            'compliance_score': round(self.base_values['compliance_score'] + random.uniform(-0.5, 0.1), 2),
            'regulatory_rules': self.base_values['regulatory_rules'] + random.randint(-5, 5),
            'processing_rate': round(random.uniform(2000, 3000), 2),
            'error_rate': round(random.uniform(0.1, 0.5), 3),
            'timestamp': datetime.now().isoformat()
        }

# ============================================================================
# API ROUTES
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'Knowledge Nexus Framework API',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'uptime': time.time() - start_time if 'start_time' in globals() else 0
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({'error': 'Health check failed'}), 500

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Get current CMS compliance metrics"""
    metrics = CMSMetrics()
    data = metrics.generate_realistic_data()
    
    return jsonify({
        'success': True,
        'data': data,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/metrics/history', methods=['GET'])
def get_metrics_history():
    """Get historical metrics for charts"""
    hours = int(request.args.get('hours', 24))
    
    # Generate historical data
    history = []
    now = datetime.now()
    
    for i in range(hours):
        timestamp = now - timedelta(hours=i)
        metrics = CMSMetrics()
        data = metrics.generate_realistic_data()
        data['timestamp'] = timestamp.isoformat()
        history.append(data)
    
    return jsonify({
        'success': True,
        'data': list(reversed(history)),  # Oldest first
        'period_hours': hours
    })

@app.route('/api/services', methods=['GET'])
def get_services():
    """Get status of all microservices"""
    services = [
        {'name': 'Data Nexus', 'status': 'healthy', 'port': 8007},
        {'name': 'Team Calibration', 'status': 'healthy', 'port': 8002},
        {'name': 'Insights Engine', 'status': 'healthy', 'port': 8003},
        {'name': 'Regulatory Intelligence', 'status': 'healthy', 'port': 8006},
        {'name': 'Assessment Service', 'status': 'healthy', 'port': 8001},
        {'name': 'Innovation Platform', 'status': 'healthy', 'port': 8004},
        {'name': 'Metrics Service', 'status': 'healthy', 'port': 8005},
        {'name': 'Domain Engine', 'status': 'healthy', 'port': 8008},
        {'name': 'Compliance Analytics', 'status': 'healthy', 'port': 8009},
        {'name': 'Strategic Intelligence', 'status': 'healthy', 'port': 8010},
        {'name': 'Security Compliance', 'status': 'healthy', 'port': 8011}
    ]
    
    return jsonify({
        'success': True,
        'services': services,
        'total_services': len(services),
        'healthy_services': len([s for s in services if s['status'] == 'healthy'])
    })

# ============================================================================
# CMS DATA UPLOAD ENDPOINTS
# ============================================================================

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload/cms-data', methods=['POST'])
def upload_cms_data():
    """Upload and process CMS data CSV file"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Only CSV files are allowed'}), 400
        
        # Read file content
        file_content = file.read()
        
        # Process the CSV data
        result = data_processor.process_csv_upload(file_content, file.filename)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/processing/stats', methods=['GET'])
def get_processing_stats():
    """Get data processing statistics"""
    try:
        stats = data_processor.get_processing_stats()
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# COMPANY RULES MANAGEMENT ENDPOINTS
# ============================================================================

@app.route('/api/rules', methods=['GET'])
def get_company_rules():
    """Get all company rules"""
    try:
        result = data_processor.get_company_rules()
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rules', methods=['POST'])
def add_company_rule():
    """Add a new company rule"""
    try:
        rule_data = request.get_json()
        if not rule_data:
            return jsonify({'success': False, 'error': 'No rule data provided'}), 400
        
        result = data_processor.add_company_rule(rule_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['PUT'])
def update_company_rule(rule_id):
    """Update an existing company rule"""
    try:
        rule_data = request.get_json()
        if not rule_data:
            return jsonify({'success': False, 'error': 'No rule data provided'}), 400
        
        result = data_processor.update_company_rule(rule_id, rule_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['DELETE'])
def delete_company_rule(rule_id):
    """Delete a company rule"""
    try:
        result = data_processor.delete_company_rule(rule_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rules/test', methods=['POST'])
def test_rule():
    """Test a rule against sample data"""
    try:
        data = request.get_json()
        if not data or 'rule' not in data or 'sample_record' not in data:
            return jsonify({'success': False, 'error': 'Rule and sample record required'}), 400
        
        # Create a test record
        from models.cms_data import CMSRecord
        test_record = CMSRecord(data['sample_record'])
        
        # Create a test rule
        from models.cms_data import CompanyRule
        test_rule = CompanyRule(data['rule'])
        
        # Test the rule
        evaluation = rules_engine.evaluate_record(test_record)
        
        return jsonify({
            'success': True,
            'evaluation': evaluation,
            'test_record': test_record.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Review and Approval System
@app.route('/api/review/sessions', methods=['GET'])
def get_review_sessions():
    """Get all review sessions"""
    try:
        sessions = data_processor.get_review_sessions()
        return jsonify({'success': True, 'sessions': sessions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/sessions/<session_id>', methods=['GET'])
def get_review_session(session_id):
    """Get specific review session with records"""
    try:
        session = data_processor.get_review_session(session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        return jsonify({'success': True, 'session': session})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/sessions/<session_id>/records', methods=['GET'])
def get_session_records(session_id):
    """Get all records for a review session with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        filter_type = request.args.get('filter', 'all')  # all, reportable, non_reportable, pending
        
        records = data_processor.get_session_records(session_id, page, per_page, filter_type)
        return jsonify({'success': True, **records})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/records/<record_id>/decision', methods=['POST'])
def make_decision(record_id):
    """Make a human decision on a record"""
    try:
        data = request.get_json()
        if not data or 'decision' not in data:
            return jsonify({'success': False, 'error': 'Decision required'}), 400
        
        decision = data['decision']  # 'approve', 'reject', 'modify'
        reason = data.get('reason', '')
        modified_data = data.get('modified_data', {})
        
        result = data_processor.make_human_decision(record_id, decision, reason, modified_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/sessions/<session_id>/bulk-decision', methods=['POST'])
def bulk_decision(session_id):
    """Make bulk decisions on multiple records"""
    try:
        data = request.get_json()
        if not data or 'decisions' not in data:
            return jsonify({'success': False, 'error': 'Decisions required'}), 400
        
        decisions = data['decisions']  # Array of {record_id, decision, reason}
        result = data_processor.make_bulk_decisions(session_id, decisions)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/bulk-decision', methods=['POST'])
def global_bulk_decision():
    """Make bulk decisions on multiple records across all sessions"""
    try:
        data = request.get_json()
        if not data or 'decisions' not in data:
            return jsonify({'success': False, 'error': 'Decisions required'}), 400
        
        decisions = data['decisions']  # Array of {record_id, decision, reason}
        result = data_processor.make_global_bulk_decisions(decisions)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/sessions/<session_id>/export', methods=['GET'])
def export_session(session_id):
    """Export final approved report"""
    try:
        format_type = request.args.get('format', 'csv')  # csv, excel, json
        include_audit = request.args.get('include_audit', 'false').lower() == 'true'
        
        result = data_processor.export_session(session_id, format_type, include_audit)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/sessions/<session_id>/download', methods=['GET'])
def download_session(session_id):
    """Download final approved report file"""
    try:
        format_type = request.args.get('format', 'csv')
        include_audit = request.args.get('include_audit', 'false').lower() == 'true'
        
        file_path = data_processor.generate_download_file(session_id, format_type, include_audit)
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        return send_file(file_path, as_attachment=True, download_name=f"cms_report_{session_id}.{format_type}")
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/review/export-all', methods=['GET'])
def export_all_records():
    """Export all records from all sessions"""
    try:
        format_type = request.args.get('format', 'csv')
        include_audit = request.args.get('include_audit', 'false').lower() == 'true'
        filter_type = request.args.get('filter', 'all')  # all, approved, pending
        
        result = data_processor.export_all_records(format_type, include_audit, filter_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# MAIN APPLICATION
# ============================================================================

if __name__ == '__main__':
    global start_time
    start_time = time.time()
    
    logger.info("🚀 Starting Knowledge Nexus Framework API...")
    logger.info("📊 API available at: http://localhost:5001")
    logger.info("🎯 Health check: http://localhost:5001/api/health")
    logger.info("📈 Metrics: http://localhost:5001/api/metrics")
    logger.info("🔧 Services: http://localhost:5001/api/services")
    
    try:
        # Use localhost instead of 0.0.0.0 for better macOS compatibility
        # Disable debug mode for production stability
        app.run(
            host='127.0.0.1',  # Changed from 0.0.0.0
            port=5001, 
            debug=False,  # Changed from True
            threaded=True,  # Enable threading for better performance
            use_reloader=False  # Disable reloader to prevent conflicts
        )
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down gracefully...")
    except Exception as e:
        logger.error(f"Application error: {e}")
        sys.exit(1)
    finally:
        logger.info("Application shutdown complete")
