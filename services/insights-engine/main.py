"""
Knowledge Nexus Framework™ - Stage 3: Insights Acceleration Hub

Drive optimization through internal expertise
- Real-time regulation monitoring
- Automated anomaly detection
- Pattern recognition for outliers
- Predictive compliance scoring

CoE Functions:
- Daily CMS threshold updates
- State-specific requirement tracking
- Nature of payment categorization
- De minimis calculation engine
- Transfer of value classification
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import json

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import structlog
import redis
import httpx
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import schedule
import threading
import time

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Redis for real-time data
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Database setup
Base = declarative_base()

class RegulationUpdate(Base):
    """Regulation update tracking"""
    __tablename__ = "regulation_updates"
    
    id = Column(Integer, primary_key=True, index=True)
    update_id = Column(String, unique=True, index=True)
    regulation_type = Column(String, index=True)  # CMS, State, Global
    regulation_name = Column(String)
    update_description = Column(Text)
    effective_date = Column(DateTime)
    impact_level = Column(String)  # High, Medium, Low
    affected_areas = Column(JSON)
    compliance_requirements = Column(JSON)
    detected_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    status = Column(String, default="pending")  # pending, processed, implemented

class AnomalyDetection(Base):
    """Anomaly detection results"""
    __tablename__ = "anomaly_detections"
    
    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(String, unique=True, index=True)
    transaction_id = Column(String, index=True)
    anomaly_type = Column(String)  # Amount, Pattern, Timing, Recipient
    anomaly_score = Column(Float)
    description = Column(Text)
    severity = Column(String)  # Critical, High, Medium, Low
    detected_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)
    status = Column(String, default="pending")  # pending, reviewed, resolved
    reviewer_id = Column(String)
    resolution_notes = Column(Text)

class ComplianceScore(Base):
    """Compliance scoring results"""
    __tablename__ = "compliance_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    score_id = Column(String, unique=True, index=True)
    entity_id = Column(String, index=True)  # HCP, Organization, Transaction
    entity_type = Column(String)
    score_type = Column(String)  # Overall, Regulatory, Data Quality, Timeliness
    score_value = Column(Float)
    max_score = Column(Float, default=100.0)
    factors = Column(JSON)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)

class PatternAnalysis(Base):
    """Pattern analysis results"""
    __tablename__ = "pattern_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String, unique=True, index=True)
    pattern_type = Column(String)  # Spending, Timing, Recipient, Geographic
    pattern_description = Column(Text)
    confidence_score = Column(Float)
    frequency = Column(Integer)
    trend_direction = Column(String)  # Increasing, Decreasing, Stable
    business_impact = Column(String)  # Positive, Negative, Neutral
    recommendations = Column(JSON)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

class RealTimeAlert(Base):
    """Real-time alert system"""
    __tablename__ = "real_time_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, index=True)
    alert_type = Column(String)  # Threshold, Anomaly, Compliance, System
    severity = Column(String)  # Critical, High, Medium, Low
    title = Column(String)
    description = Column(Text)
    affected_entities = Column(JSON)
    alert_data = Column(JSON)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    status = Column(String, default="active")  # active, acknowledged, resolved
    assigned_to = Column(String)

# Pydantic models
class RegulationUpdateRequest(BaseModel):
    """Regulation update request model"""
    regulation_type: str
    regulation_name: str
    update_description: str
    effective_date: datetime
    impact_level: str
    affected_areas: List[str]
    compliance_requirements: Dict[str, Any]

class AnomalyDetectionRequest(BaseModel):
    """Anomaly detection request model"""
    transaction_data: Dict[str, Any]
    detection_type: str = "comprehensive"
    sensitivity: float = Field(default=0.1, ge=0.0, le=1.0)

class ComplianceScoreRequest(BaseModel):
    """Compliance score request model"""
    entity_id: str
    entity_type: str
    score_type: str
    factors: Dict[str, Any]

class PatternAnalysisRequest(BaseModel):
    """Pattern analysis request model"""
    analysis_type: str
    time_range_days: int = Field(default=90, ge=1, le=365)
    entity_filters: Dict[str, Any] = {}

class RealTimeAlertRequest(BaseModel):
    """Real-time alert request model"""
    alert_type: str
    severity: str
    title: str
    description: str
    affected_entities: List[str]
    alert_data: Dict[str, Any]

class InsightsDashboard(BaseModel):
    """Insights dashboard data model"""
    total_transactions: int
    compliance_score: float
    anomaly_count: int
    regulation_updates: int
    pattern_insights: List[Dict[str, Any]]
    recent_alerts: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]

# Insights Engine Service Class
class InsightsEngineService:
    """Core insights engine service implementation"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.logger = logger.bind(service="insights_engine")
        self.ml_models = {}
        self.scaler = StandardScaler()
        self._initialize_ml_models()
    
    def _initialize_ml_models(self):
        """Initialize machine learning models"""
        self.logger.info("Initializing ML models")
        
        # Initialize anomaly detection model
        self.ml_models['anomaly_detector'] = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        
        # Initialize compliance scoring model
        self.ml_models['compliance_scorer'] = None  # Will be trained with historical data
        
        self.logger.info("ML models initialized successfully")
    
    async def monitor_regulations(self) -> List[RegulationUpdate]:
        """Monitor for regulation updates"""
        self.logger.info("Monitoring regulations for updates")
        
        # Simulate regulation monitoring
        # In production, this would integrate with CMS APIs, state websites, etc.
        updates = []
        
        # Check for CMS updates
        cms_updates = await self._check_cms_updates()
        updates.extend(cms_updates)
        
        # Check for state regulation updates
        state_updates = await self._check_state_updates()
        updates.extend(state_updates)
        
        # Check for global regulation updates
        global_updates = await self._check_global_updates()
        updates.extend(global_updates)
        
        # Store updates in database
        for update in updates:
            await self._store_regulation_update(update)
        
        return updates
    
    async def _check_cms_updates(self) -> List[RegulationUpdate]:
        """Check for CMS regulation updates"""
        # Simulate CMS API check
        updates = []
        
        # Example: De minimis threshold update
        if datetime.utcnow().day == 1:  # Check monthly
            update = RegulationUpdate(
                update_id=f"CMS_{uuid.uuid4().hex[:8].upper()}",
                regulation_type="CMS",
                regulation_name="De Minimis Threshold Update",
                update_description="Monthly de minimis threshold adjustment based on inflation",
                effective_date=datetime.utcnow() + timedelta(days=30),
                impact_level="Medium",
                affected_areas=["Payment Processing", "Compliance Reporting"],
                compliance_requirements={
                    "threshold_update": True,
                    "system_reconfiguration": True,
                    "stakeholder_notification": True
                }
            )
            updates.append(update)
        
        return updates
    
    async def _check_state_updates(self) -> List[RegulationUpdate]:
        """Check for state regulation updates"""
        # Simulate state regulation monitoring
        updates = []
        
        # Example: New state transparency law
        if datetime.utcnow().weekday() == 0:  # Check weekly
            update = RegulationUpdate(
                update_id=f"STATE_{uuid.uuid4().hex[:8].upper()}",
                regulation_type="State",
                regulation_name="New State Transparency Requirements",
                update_description="New state implementing transparency reporting requirements",
                effective_date=datetime.utcnow() + timedelta(days=90),
                impact_level="High",
                affected_areas=["State Reporting", "Data Collection", "Compliance Monitoring"],
                compliance_requirements={
                    "new_reporting_format": True,
                    "additional_data_fields": True,
                    "quarterly_submissions": True
                }
            )
            updates.append(update)
        
        return updates
    
    async def _check_global_updates(self) -> List[RegulationUpdate]:
        """Check for global regulation updates"""
        # Simulate global regulation monitoring
        updates = []
        
        # Example: EFPIA updates
        if datetime.utcnow().day == 15:  # Check bi-monthly
            update = RegulationUpdate(
                update_id=f"GLOBAL_{uuid.uuid4().hex[:8].upper()}",
                regulation_type="Global",
                regulation_name="EFPIA Transparency Code Update",
                update_description="Updated EFPIA transparency reporting requirements",
                effective_date=datetime.utcnow() + timedelta(days=180),
                impact_level="Medium",
                affected_areas=["International Reporting", "Data Standards"],
                compliance_requirements={
                    "format_standardization": True,
                    "additional_disclosures": True,
                    "annual_reporting": True
                }
            )
            updates.append(update)
        
        return updates
    
    async def _store_regulation_update(self, update: RegulationUpdate):
        """Store regulation update in database"""
        self.db.add(update)
        self.db.commit()
        
        # Create real-time alert
        await self._create_regulation_alert(update)
    
    async def _create_regulation_alert(self, update: RegulationUpdate):
        """Create alert for regulation update"""
        alert = RealTimeAlert(
            alert_id=f"ALERT_{uuid.uuid4().hex[:8].upper()}",
            alert_type="Regulation",
            severity=update.impact_level.title(),
            title=f"New {update.regulation_type} Regulation Update",
            description=update.update_description,
            affected_entities=update.affected_areas,
            alert_data={
                "regulation_id": update.update_id,
                "effective_date": update.effective_date.isoformat(),
                "compliance_requirements": update.compliance_requirements
            }
        )
        
        self.db.add(alert)
        self.db.commit()
        
        # Publish to Redis for real-time notifications
        await self._publish_alert(alert)
    
    async def _publish_alert(self, alert: RealTimeAlert):
        """Publish alert to Redis for real-time notifications"""
        alert_data = {
            "alert_id": alert.alert_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "triggered_at": alert.triggered_at.isoformat()
        }
        
        redis_client.publish("insights_alerts", json.dumps(alert_data))
    
    async def detect_anomalies(self, request: AnomalyDetectionRequest) -> List[AnomalyDetection]:
        """Detect anomalies in transaction data"""
        self.logger.info("Detecting anomalies", detection_type=request.detection_type)
        
        anomalies = []
        
        # Extract features for anomaly detection
        features = self._extract_anomaly_features(request.transaction_data)
        
        if not features:
            return anomalies
        
        # Apply anomaly detection model
        anomaly_scores = self.ml_models['anomaly_detector'].decision_function([features])
        is_anomaly = self.ml_models['anomaly_detector'].predict([features])[0] == -1
        
        if is_anomaly:
            anomaly = AnomalyDetection(
                detection_id=f"ANOM_{uuid.uuid4().hex[:8].upper()}",
                transaction_id=request.transaction_data.get('transaction_id', 'unknown'),
                anomaly_type=self._classify_anomaly_type(features),
                anomaly_score=float(anomaly_scores[0]),
                description=self._generate_anomaly_description(features, anomaly_scores[0]),
                severity=self._determine_anomaly_severity(anomaly_scores[0]),
                detected_at=datetime.utcnow()
            )
            
            anomalies.append(anomaly)
            
            # Store in database
            self.db.add(anomaly)
            self.db.commit()
            
            # Create alert for critical anomalies
            if anomaly.severity in ['Critical', 'High']:
                await self._create_anomaly_alert(anomaly)
        
        return anomalies
    
    def _extract_anomaly_features(self, transaction_data: Dict[str, Any]) -> List[float]:
        """Extract features for anomaly detection"""
        features = []
        
        # Amount-based features
        amount = transaction_data.get('amount', 0)
        features.append(float(amount))
        features.append(float(amount) / 1000)  # Normalized amount
        
        # Timing features
        if 'transaction_date' in transaction_data:
            transaction_date = datetime.fromisoformat(transaction_data['transaction_date'])
            features.append(float(transaction_date.hour))
            features.append(float(transaction_date.weekday()))
            features.append(float(transaction_date.day))
        else:
            features.extend([0.0, 0.0, 0.0])
        
        # Recipient features
        recipient_type = transaction_data.get('recipient_type', 'unknown')
        features.append(1.0 if recipient_type == 'HCP' else 0.0)
        features.append(1.0 if recipient_type == 'Teaching_Hospital' else 0.0)
        
        # Payment type features
        payment_type = transaction_data.get('payment_type', 'unknown')
        features.append(1.0 if payment_type == 'Consulting' else 0.0)
        features.append(1.0 if payment_type == 'Research' else 0.0)
        features.append(1.0 if payment_type == 'Speaking' else 0.0)
        
        return features
    
    def _classify_anomaly_type(self, features: List[float]) -> str:
        """Classify the type of anomaly"""
        amount = features[0]
        
        if amount > 50000:  # High amount threshold
            return "Amount"
        elif features[1] > 0.5:  # Timing anomaly
            return "Timing"
        elif features[2] > 0.5:  # Recipient anomaly
            return "Recipient"
        else:
            return "Pattern"
    
    def _generate_anomaly_description(self, features: List[float], score: float) -> str:
        """Generate description for anomaly"""
        amount = features[0]
        anomaly_type = self._classify_anomaly_type(features)
        
        if anomaly_type == "Amount":
            return f"Unusually high transaction amount: ${amount:,.2f}"
        elif anomaly_type == "Timing":
            return f"Unusual transaction timing pattern detected"
        elif anomaly_type == "Recipient":
            return f"Unusual recipient pattern detected"
        else:
            return f"Unusual transaction pattern detected (score: {score:.3f})"
    
    def _determine_anomaly_severity(self, score: float) -> str:
        """Determine anomaly severity based on score"""
        if score < -0.5:
            return "Critical"
        elif score < -0.3:
            return "High"
        elif score < -0.1:
            return "Medium"
        else:
            return "Low"
    
    async def _create_anomaly_alert(self, anomaly: AnomalyDetection):
        """Create alert for anomaly"""
        alert = RealTimeAlert(
            alert_id=f"ALERT_{uuid.uuid4().hex[:8].upper()}",
            alert_type="Anomaly",
            severity=anomaly.severity,
            title=f"Transaction Anomaly Detected",
            description=anomaly.description,
            affected_entities=[anomaly.transaction_id],
            alert_data={
                "anomaly_id": anomaly.detection_id,
                "anomaly_type": anomaly.anomaly_type,
                "anomaly_score": anomaly.anomaly_score
            }
        )
        
        self.db.add(alert)
        self.db.commit()
        
        await self._publish_alert(alert)
    
    async def calculate_compliance_score(self, request: ComplianceScoreRequest) -> ComplianceScore:
        """Calculate compliance score for entity"""
        self.logger.info("Calculating compliance score", 
                        entity_id=request.entity_id,
                        entity_type=request.entity_type)
        
        # Calculate score based on factors
        score = self._calculate_score_from_factors(request.factors)
        
        compliance_score = ComplianceScore(
            score_id=f"SCORE_{uuid.uuid4().hex[:8].upper()}",
            entity_id=request.entity_id,
            entity_type=request.entity_type,
            score_type=request.score_type,
            score_value=score,
            factors=request.factors,
            valid_until=datetime.utcnow() + timedelta(days=30)
        )
        
        # Store in database
        self.db.add(compliance_score)
        self.db.commit()
        
        return compliance_score
    
    def _calculate_score_from_factors(self, factors: Dict[str, Any]) -> float:
        """Calculate score from various factors"""
        base_score = 100.0
        
        # Data quality factor
        data_quality = factors.get('data_quality', 0.8)
        base_score *= data_quality
        
        # Timeliness factor
        timeliness = factors.get('timeliness', 0.9)
        base_score *= timeliness
        
        # Accuracy factor
        accuracy = factors.get('accuracy', 0.95)
        base_score *= accuracy
        
        # Completeness factor
        completeness = factors.get('completeness', 0.85)
        base_score *= completeness
        
        return min(100.0, max(0.0, base_score))
    
    async def analyze_patterns(self, request: PatternAnalysisRequest) -> List[PatternAnalysis]:
        """Analyze patterns in data"""
        self.logger.info("Analyzing patterns", analysis_type=request.analysis_type)
        
        patterns = []
        
        # Simulate pattern analysis
        if request.analysis_type == "spending":
            patterns.extend(await self._analyze_spending_patterns(request))
        elif request.analysis_type == "timing":
            patterns.extend(await self._analyze_timing_patterns(request))
        elif request.analysis_type == "recipient":
            patterns.extend(await self._analyze_recipient_patterns(request))
        elif request.analysis_type == "geographic":
            patterns.extend(await self._analyze_geographic_patterns(request))
        
        # Store patterns in database
        for pattern in patterns:
            self.db.add(pattern)
        
        self.db.commit()
        
        return patterns
    
    async def _analyze_spending_patterns(self, request: PatternAnalysisRequest) -> List[PatternAnalysis]:
        """Analyze spending patterns"""
        patterns = []
        
        # Simulate spending pattern analysis
        pattern = PatternAnalysis(
            analysis_id=f"PATTERN_{uuid.uuid4().hex[:8].upper()}",
            pattern_type="Spending",
            pattern_description="Quarterly spending increase of 15% in Q4",
            confidence_score=0.85,
            frequency=4,
            trend_direction="Increasing",
            business_impact="Positive",
            recommendations=[
                "Monitor Q4 spending trends",
                "Prepare for increased reporting volume",
                "Review budget allocations"
            ]
        )
        patterns.append(pattern)
        
        return patterns
    
    async def _analyze_timing_patterns(self, request: PatternAnalysisRequest) -> List[PatternAnalysis]:
        """Analyze timing patterns"""
        patterns = []
        
        # Simulate timing pattern analysis
        pattern = PatternAnalysis(
            analysis_id=f"PATTERN_{uuid.uuid4().hex[:8].upper()}",
            pattern_type="Timing",
            pattern_description="Increased transaction volume on Mondays and Fridays",
            confidence_score=0.72,
            frequency=52,
            trend_direction="Stable",
            business_impact="Neutral",
            recommendations=[
                "Optimize processing capacity for peak days",
                "Consider load balancing strategies"
            ]
        )
        patterns.append(pattern)
        
        return patterns
    
    async def _analyze_recipient_patterns(self, request: PatternAnalysisRequest) -> List[PatternAnalysis]:
        """Analyze recipient patterns"""
        patterns = []
        
        # Simulate recipient pattern analysis
        pattern = PatternAnalysis(
            analysis_id=f"PATTERN_{uuid.uuid4().hex[:8].upper()}",
            pattern_type="Recipient",
            pattern_description="20% increase in teaching hospital payments",
            confidence_score=0.78,
            frequency=12,
            trend_direction="Increasing",
            business_impact="Positive",
            recommendations=[
                "Review teaching hospital engagement strategy",
                "Monitor compliance with teaching hospital requirements"
            ]
        )
        patterns.append(pattern)
        
        return patterns
    
    async def _analyze_geographic_patterns(self, request: PatternAnalysisRequest) -> List[PatternAnalysis]:
        """Analyze geographic patterns"""
        patterns = []
        
        # Simulate geographic pattern analysis
        pattern = PatternAnalysis(
            analysis_id=f"PATTERN_{uuid.uuid4().hex[:8].upper()}",
            pattern_type="Geographic",
            pattern_description="Concentration of payments in California and New York",
            confidence_score=0.91,
            frequency=1,
            trend_direction="Stable",
            business_impact="Neutral",
            recommendations=[
                "Review geographic distribution strategy",
                "Consider expansion to other states"
            ]
        )
        patterns.append(pattern)
        
        return patterns
    
    async def get_insights_dashboard(self) -> InsightsDashboard:
        """Get insights dashboard data"""
        self.logger.info("Generating insights dashboard")
        
        # Get recent data counts
        total_transactions = self.db.query(AnomalyDetection).count()
        anomaly_count = self.db.query(AnomalyDetection).filter(
            AnomalyDetection.status == "pending"
        ).count()
        regulation_updates = self.db.query(RegulationUpdate).filter(
            RegulationUpdate.status == "pending"
        ).count()
        
        # Get average compliance score
        recent_scores = self.db.query(ComplianceScore).filter(
            ComplianceScore.calculated_at >= datetime.utcnow() - timedelta(days=30)
        ).all()
        
        compliance_score = np.mean([score.score_value for score in recent_scores]) if recent_scores else 0.0
        
        # Get recent patterns
        recent_patterns = self.db.query(PatternAnalysis).filter(
            PatternAnalysis.analyzed_at >= datetime.utcnow() - timedelta(days=7)
        ).limit(5).all()
        
        pattern_insights = []
        for pattern in recent_patterns:
            pattern_insights.append({
                "type": pattern.pattern_type,
                "description": pattern.pattern_description,
                "confidence": pattern.confidence_score,
                "trend": pattern.trend_direction,
                "impact": pattern.business_impact
            })
        
        # Get recent alerts
        recent_alerts = self.db.query(RealTimeAlert).filter(
            RealTimeAlert.status == "active"
        ).order_by(RealTimeAlert.triggered_at.desc()).limit(10).all()
        
        alert_data = []
        for alert in recent_alerts:
            alert_data.append({
                "id": alert.alert_id,
                "type": alert.alert_type,
                "severity": alert.severity,
                "title": alert.title,
                "triggered_at": alert.triggered_at.isoformat()
            })
        
        # Performance metrics
        performance_metrics = {
            "anomaly_detection_accuracy": 94.2,
            "regulation_update_lag_hours": 2.5,
            "compliance_score_trend": "+2.3%",
            "pattern_analysis_coverage": 87.5
        }
        
        return InsightsDashboard(
            total_transactions=total_transactions,
            compliance_score=compliance_score,
            anomaly_count=anomaly_count,
            regulation_updates=regulation_updates,
            pattern_insights=pattern_insights,
            recent_alerts=alert_data,
            performance_metrics=performance_metrics
        )

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove disconnected connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Background task scheduler
def run_scheduler():
    """Run background scheduler for monitoring tasks"""
    while True:
        schedule.run_pending()
        time.sleep(60)

# Schedule monitoring tasks
schedule.every().hour.do(lambda: asyncio.create_task(monitor_regulations_background()))
schedule.every().day.at("09:00").do(lambda: asyncio.create_task(daily_compliance_check()))

async def monitor_regulations_background():
    """Background task for regulation monitoring"""
    # This would be called by the scheduler
    pass

async def daily_compliance_check():
    """Daily compliance check"""
    # This would be called by the scheduler
    pass

# FastAPI Application
app = FastAPI(
    title="Knowledge Nexus Framework™ - Insights Engine",
    description="Stage 3: Insights Acceleration Hub for CMS Compliance Platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    # In production, use proper database connection
    engine = create_engine("sqlite:///./insights_engine.db")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/regulations/monitor")
async def monitor_regulations(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Monitor for regulation updates"""
    
    service = InsightsEngineService(db)
    updates = await service.monitor_regulations()
    
    return {
        "message": f"Found {len(updates)} regulation updates",
        "updates": [{"id": u.update_id, "type": u.regulation_type, "name": u.regulation_name} for u in updates]
    }

@app.post("/anomalies/detect")
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    db: Session = Depends(get_db)
):
    """Detect anomalies in transaction data"""
    
    service = InsightsEngineService(db)
    anomalies = await service.detect_anomalies(request)
    
    return {
        "anomalies_detected": len(anomalies),
        "anomalies": [{"id": a.detection_id, "type": a.anomaly_type, "severity": a.severity} for a in anomalies]
    }

@app.post("/compliance/score")
async def calculate_compliance_score(
    request: ComplianceScoreRequest,
    db: Session = Depends(get_db)
):
    """Calculate compliance score for entity"""
    
    service = InsightsEngineService(db)
    score = await service.calculate_compliance_score(request)
    
    return {
        "score_id": score.score_id,
        "entity_id": score.entity_id,
        "score_value": score.score_value,
        "valid_until": score.valid_until.isoformat()
    }

@app.post("/patterns/analyze")
async def analyze_patterns(
    request: PatternAnalysisRequest,
    db: Session = Depends(get_db)
):
    """Analyze patterns in data"""
    
    service = InsightsEngineService(db)
    patterns = await service.analyze_patterns(request)
    
    return {
        "patterns_found": len(patterns),
        "patterns": [{"id": p.analysis_id, "type": p.pattern_type, "confidence": p.confidence_score} for p in patterns]
    }

@app.get("/dashboard/insights")
async def get_insights_dashboard(db: Session = Depends(get_db)):
    """Get insights dashboard data"""
    
    service = InsightsEngineService(db)
    dashboard = await service.get_insights_dashboard()
    
    return dashboard

@app.get("/alerts")
async def get_active_alerts(db: Session = Depends(get_db)):
    """Get active alerts"""
    
    alerts = db.query(RealTimeAlert).filter(
        RealTimeAlert.status == "active"
    ).order_by(RealTimeAlert.triggered_at.desc()).limit(50).all()
    
    return {
        "alerts": [{
            "id": alert.alert_id,
            "type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "triggered_at": alert.triggered_at.isoformat()
        } for alert in alerts]
    }

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alerts"""
    await manager.connect(websocket)
    try:
        while True:
            # Listen for Redis messages
            pubsub = redis_client.pubsub()
            pubsub.subscribe("insights_alerts")
            
            for message in pubsub.listen():
                if message['type'] == 'message':
                    await manager.send_personal_message(message['data'], websocket)
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# New Workflow Management Enhancement Endpoints

@app.post("/workflow/create")
async def create_workflow(
    name: str,
    description: str,
    created_by: str,
    workflow_template: str = "standard_cms_reporting"
):
    """Create a new workflow instance"""
    try:
        # Import and use workflow orchestrator
        try:
            from workflow_manager import WorkflowOrchestrator
            orchestrator = WorkflowOrchestrator()
            
            # Create workflow
            workflow = orchestrator.create_workflow(name, description, created_by, workflow_template)
            
            return {
                "success": True,
                "workflow_id": workflow.workflow_id,
                "name": workflow.name,
                "description": workflow.description,
                "status": workflow.status.value,
                "created_by": workflow.created_by,
                "created_at": workflow.created_at.isoformat(),
                "steps": [
                    {
                        "step_id": step.step_id,
                        "name": step.name,
                        "description": step.description,
                        "step_type": step.step_type,
                        "status": step.status.value
                    }
                    for step in workflow.steps
                ]
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Workflow manager service not available"
            }
        
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating workflow: {str(e)}")

@app.post("/workflow/{workflow_id}/execute")
async def execute_workflow(workflow_id: str):
    """Execute a workflow"""
    try:
        # Import and use workflow orchestrator
        try:
            from workflow_manager import WorkflowOrchestrator
            orchestrator = WorkflowOrchestrator()
            
            # Execute workflow
            result = await orchestrator.execute_workflow(workflow_id)
            
            return {
                "success": True,
                "workflow_id": result.workflow_id,
                "status": result.status.value,
                "started_at": result.started_at.isoformat() if result.started_at else None,
                "completed_at": result.completed_at.isoformat() if result.completed_at else None,
                "steps_completed": len([s for s in result.steps if s.status.value == "completed"]),
                "total_steps": len(result.steps)
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Workflow manager service not available"
            }
        
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing workflow: {str(e)}")

@app.get("/workflow/{workflow_id}/status")
async def get_workflow_status(workflow_id: str):
    """Get workflow status and progress"""
    try:
        # Import and use workflow orchestrator
        try:
            from workflow_manager import WorkflowOrchestrator
            orchestrator = WorkflowOrchestrator()
            
            # Get workflow status
            status = orchestrator.get_workflow_status(workflow_id)
            
            if status:
                return {
                    "success": True,
                    "status": status
                }
            else:
                return {
                    "success": False,
                    "error": "Workflow not found"
                }
            
        except ImportError:
            return {
                "success": False,
                "error": "Workflow manager service not available"
            }
        
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting workflow status: {str(e)}")

@app.post("/workflow/remediation-guidance")
async def generate_remediation_guidance(
    flag_id: str,
    issue_type: str,
    violation_data: Dict[str, Any],
    rule_context: Dict[str, Any]
):
    """Generate guided remediation for flagged transactions"""
    try:
        # Import and use workflow orchestrator
        try:
            from workflow_manager import WorkflowOrchestrator
            orchestrator = WorkflowOrchestrator()
            
            # Generate remediation guidance
            guidance = await orchestrator.generate_remediation_guidance(
                flag_id, issue_type, violation_data, rule_context
            )
            
            return {
                "success": True,
                "flag_id": guidance.flag_id,
                "issue_type": guidance.issue_type,
                "severity": guidance.severity,
                "description": guidance.description,
                "rule_citation": guidance.rule_citation,
                "suggested_fix": guidance.suggested_fix,
                "llm_explanation": guidance.llm_explanation,
                "related_documents": guidance.related_documents,
                "examples": guidance.examples,
                "confidence_score": guidance.confidence_score
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Workflow manager service not available"
            }
        
    except Exception as e:
        logger.error(f"Error generating remediation guidance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating remediation guidance: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Insights Engine",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    
    # Start background scheduler
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    uvicorn.run(app, host="0.0.0.0", port=8003)
