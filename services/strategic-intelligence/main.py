"""
Knowledge Nexus Framework™ - Strategic Intelligence Platform

Competitive advantage through data insights
- Market trend analysis
- HCP behavior patterns
- Patient outcome correlations
- Competitor spend analysis

Intelligence Modules:
- CMS Open Data mining
- Physician payment patterns
- Teaching hospital trends
- Regional variation analysis
- Therapeutic area insights
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import uuid
import json

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import structlog
import httpx
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import redis

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

# Redis for intelligence caching
redis_client = redis.Redis(host='localhost', port=6379, db=4, decode_responses=True)

# Database setup
Base = declarative_base()

class MarketIntelligence(Base):
    """Market intelligence model"""
    __tablename__ = "market_intelligence"
    
    id = Column(Integer, primary_key=True, index=True)
    intelligence_id = Column(String, unique=True, index=True)
    intelligence_type = Column(String, index=True)  # market_trend, competitor_analysis, hcp_behavior
    title = Column(String)
    description = Column(Text)
    data_source = Column(String)
    confidence_score = Column(Float)
    impact_score = Column(Float)
    intelligence_data = Column(JSON)
    insights = Column(JSON)
    recommendations = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class CompetitorAnalysis(Base):
    """Competitor analysis model"""
    __tablename__ = "competitor_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String, unique=True, index=True)
    competitor_name = Column(String, index=True)
    analysis_type = Column(String)  # spending, strategy, market_share
    analysis_period = Column(String)
    total_spending = Column(Float)
    spending_by_category = Column(JSON)
    top_hcps = Column(JSON)
    geographic_focus = Column(JSON)
    therapeutic_areas = Column(JSON)
    trends = Column(JSON)
    competitive_advantage = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class HCPBehaviorPattern(Base):
    """HCP behavior pattern model"""
    __tablename__ = "hcp_behavior_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String, unique=True, index=True)
    hcp_id = Column(String, index=True)
    hcp_name = Column(String)
    specialty = Column(String, index=True)
    behavior_type = Column(String)  # payment_preference, engagement_pattern, prescribing_behavior
    pattern_data = Column(JSON)
    confidence_score = Column(Float)
    trend_direction = Column(String)  # increasing, decreasing, stable
    business_impact = Column(String)  # positive, negative, neutral
    recommendations = Column(JSON)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

class RegionalAnalysis(Base):
    """Regional analysis model"""
    __tablename__ = "regional_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String, unique=True, index=True)
    region = Column(String, index=True)  # state, country, territory
    analysis_type = Column(String)  # spending, compliance, market_penetration
    total_spending = Column(Float)
    spending_per_capita = Column(Float)
    compliance_rate = Column(Float)
    market_penetration = Column(Float)
    key_insights = Column(JSON)
    opportunities = Column(JSON)
    risks = Column(JSON)
    strategic_recommendations = Column(JSON)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

class TherapeuticAreaInsight(Base):
    """Therapeutic area insight model"""
    __tablename__ = "therapeutic_area_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(String, unique=True, index=True)
    therapeutic_area = Column(String, index=True)
    insight_type = Column(String)  # market_size, growth_rate, competition
    market_size = Column(Float)
    growth_rate = Column(Float)
    competition_level = Column(String)  # low, medium, high
    key_players = Column(JSON)
    market_trends = Column(JSON)
    opportunities = Column(JSON)
    challenges = Column(JSON)
    strategic_recommendations = Column(JSON)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

class StrategicRecommendation(Base):
    """Strategic recommendation model"""
    __tablename__ = "strategic_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(String, unique=True, index=True)
    recommendation_type = Column(String)  # market_expansion, cost_optimization, competitive_advantage
    title = Column(String)
    description = Column(Text)
    priority = Column(String)  # low, medium, high, critical
    impact_score = Column(Float)
    feasibility_score = Column(Float)
    timeline = Column(String)
    resources_required = Column(JSON)
    expected_roi = Column(Float)
    risks = Column(JSON)
    implementation_steps = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="proposed")  # proposed, approved, implemented, rejected

# Pydantic models
class MarketAnalysisRequest(BaseModel):
    """Market analysis request model"""
    analysis_type: str  # market_trends, competitor_analysis, hcp_behavior
    time_range_months: int = Field(default=12, ge=1, le=60)
    geographic_scope: List[str] = []
    therapeutic_areas: List[str] = []
    competitors: List[str] = []

class CompetitorAnalysisRequest(BaseModel):
    """Competitor analysis request model"""
    competitor_names: List[str]
    analysis_type: str  # spending, strategy, market_share
    time_range_months: int = Field(default=12, ge=1, le=60)
    include_trends: bool = True

class HCPBehaviorRequest(BaseModel):
    """HCP behavior analysis request model"""
    hcp_ids: List[str] = []
    specialty: str = None
    behavior_type: str  # payment_preference, engagement_pattern, prescribing_behavior
    time_range_months: int = Field(default=6, ge=1, le=24)

class RegionalAnalysisRequest(BaseModel):
    """Regional analysis request model"""
    regions: List[str]  # states, countries, territories
    analysis_type: str  # spending, compliance, market_penetration
    time_range_months: int = Field(default=12, ge=1, le=60)

class StrategicIntelligenceResponse(BaseModel):
    """Strategic intelligence response model"""
    analysis_id: str
    analysis_type: str
    total_insights: int
    key_findings: List[str]
    strategic_recommendations: List[str]
    competitive_advantages: List[str]
    market_opportunities: List[str]
    confidence_score: float
    processing_time_seconds: float

# Strategic Intelligence Service Class
class StrategicIntelligenceService:
    """Core strategic intelligence service implementation"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.logger = logger.bind(service="strategic_intelligence")
        self.cms_api_client = httpx.AsyncClient()
        self.scaler = StandardScaler()
    
    async def analyze_market_intelligence(self, request: MarketAnalysisRequest) -> StrategicIntelligenceResponse:
        """Analyze market intelligence"""
        self.logger.info("Analyzing market intelligence", analysis_type=request.analysis_type)
        
        analysis_id = f"INTEL_{uuid.uuid4().hex[:8].upper()}"
        start_time = datetime.utcnow()
        
        insights = []
        key_findings = []
        strategic_recommendations = []
        competitive_advantages = []
        market_opportunities = []
        
        if request.analysis_type == "market_trends":
            insights.extend(await self._analyze_market_trends(request))
        elif request.analysis_type == "competitor_analysis":
            insights.extend(await self._analyze_competitors(request))
        elif request.analysis_type == "hcp_behavior":
            insights.extend(await self._analyze_hcp_behavior(request))
        else:  # comprehensive analysis
            insights.extend(await self._analyze_market_trends(request))
            insights.extend(await self._analyze_competitors(request))
            insights.extend(await self._analyze_hcp_behavior(request))
        
        # Extract key findings and recommendations
        for insight in insights:
            if insight.get("key_finding"):
                key_findings.append(insight["key_finding"])
            if insight.get("recommendation"):
                strategic_recommendations.append(insight["recommendation"])
            if insight.get("competitive_advantage"):
                competitive_advantages.append(insight["competitive_advantage"])
            if insight.get("market_opportunity"):
                market_opportunities.append(insight["market_opportunity"])
        
        # Store insights in database
        await self._store_market_intelligence(analysis_id, request, insights)
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        return StrategicIntelligenceResponse(
            analysis_id=analysis_id,
            analysis_type=request.analysis_type,
            total_insights=len(insights),
            key_findings=key_findings[:10],  # Top 10 findings
            strategic_recommendations=strategic_recommendations[:10],
            competitive_advantages=competitive_advantages[:5],
            market_opportunities=market_opportunities[:5],
            confidence_score=0.85,
            processing_time_seconds=processing_time
        )
    
    async def _analyze_market_trends(self, request: MarketAnalysisRequest) -> List[Dict[str, Any]]:
        """Analyze market trends"""
        self.logger.info("Analyzing market trends")
        
        insights = []
        
        # Simulate market trend analysis
        market_trends = [
            {
                "trend_type": "spending_growth",
                "description": "15% increase in pharmaceutical spending in target markets",
                "confidence": 0.88,
                "key_finding": "Market expansion opportunity in high-growth regions",
                "recommendation": "Increase investment in emerging markets",
                "market_opportunity": "Untapped potential in secondary markets"
            },
            {
                "trend_type": "digital_adoption",
                "description": "40% increase in digital health tool adoption",
                "confidence": 0.92,
                "key_finding": "Digital transformation accelerating in healthcare",
                "recommendation": "Invest in digital health solutions",
                "competitive_advantage": "Early mover advantage in digital health"
            },
            {
                "trend_type": "therapeutic_focus",
                "description": "Oncology and rare diseases showing highest growth",
                "confidence": 0.85,
                "key_finding": "Specialized therapeutic areas driving growth",
                "recommendation": "Focus R&D on high-growth therapeutic areas",
                "market_opportunity": "Rare disease market expansion"
            }
        ]
        
        insights.extend(market_trends)
        return insights
    
    async def _analyze_competitors(self, request: MarketAnalysisRequest) -> List[Dict[str, Any]]:
        """Analyze competitor intelligence"""
        self.logger.info("Analyzing competitor intelligence")
        
        insights = []
        
        # Simulate competitor analysis
        competitors = request.competitors or ["Competitor A", "Competitor B", "Competitor C"]
        
        for competitor in competitors:
            competitor_insights = [
                {
                    "competitor": competitor,
                    "analysis_type": "spending_pattern",
                    "description": f"{competitor} spending 20% more on HCP engagement",
                    "confidence": 0.82,
                    "key_finding": f"{competitor} aggressive HCP engagement strategy",
                    "recommendation": "Enhance HCP engagement programs",
                    "competitive_advantage": "Superior HCP relationship management"
                },
                {
                    "competitor": competitor,
                    "analysis_type": "market_share",
                    "description": f"{competitor} gaining market share in key therapeutic areas",
                    "confidence": 0.78,
                    "key_finding": f"{competitor} market share growth",
                    "recommendation": "Strengthen competitive positioning",
                    "market_opportunity": "Market share recovery strategy"
                }
            ]
            insights.extend(competitor_insights)
        
        return insights
    
    async def _analyze_hcp_behavior(self, request: MarketAnalysisRequest) -> List[Dict[str, Any]]:
        """Analyze HCP behavior patterns"""
        self.logger.info("Analyzing HCP behavior patterns")
        
        insights = []
        
        # Simulate HCP behavior analysis
        hcp_insights = [
            {
                "behavior_type": "payment_preference",
                "description": "HCPs prefer consulting over speaking engagements",
                "confidence": 0.87,
                "key_finding": "Consulting engagements more effective than speaking",
                "recommendation": "Increase consulting program investment",
                "competitive_advantage": "Optimized HCP engagement mix"
            },
            {
                "behavior_type": "engagement_pattern",
                "description": "Digital engagement increasing 35% year-over-year",
                "confidence": 0.91,
                "key_finding": "Digital engagement becoming preferred channel",
                "recommendation": "Expand digital engagement capabilities",
                "market_opportunity": "Digital-first HCP engagement"
            },
            {
                "behavior_type": "prescribing_behavior",
                "description": "Teaching hospital HCPs show higher prescribing rates",
                "confidence": 0.83,
                "key_finding": "Teaching hospitals key to market penetration",
                "recommendation": "Strengthen teaching hospital partnerships",
                "competitive_advantage": "Superior teaching hospital relationships"
            }
        ]
        
        insights.extend(hcp_insights)
        return insights
    
    async def _store_market_intelligence(self, analysis_id: str, request: MarketAnalysisRequest, insights: List[Dict[str, Any]]):
        """Store market intelligence in database"""
        for insight in insights:
            intelligence = MarketIntelligence(
                intelligence_id=f"INTEL_{uuid.uuid4().hex[:8].upper()}",
                intelligence_type=request.analysis_type,
                title=insight.get("description", "Market Intelligence Insight"),
                description=insight.get("description", ""),
                data_source="CMS Open Data + Internal Analysis",
                confidence_score=insight.get("confidence", 0.8),
                impact_score=0.7,
                intelligence_data=insight,
                insights=[insight.get("key_finding", "")],
                recommendations=[insight.get("recommendation", "")]
            )
            self.db.add(intelligence)
        
        self.db.commit()
    
    async def analyze_competitor_spending(self, request: CompetitorAnalysisRequest) -> List[CompetitorAnalysis]:
        """Analyze competitor spending patterns"""
        self.logger.info("Analyzing competitor spending", competitors=request.competitor_names)
        
        analyses = []
        
        for competitor in request.competitor_names:
            # Simulate competitor spending analysis
            analysis = CompetitorAnalysis(
                analysis_id=f"COMP_{uuid.uuid4().hex[:8].upper()}",
                competitor_name=competitor,
                analysis_type=request.analysis_type,
                analysis_period=f"{request.time_range_months} months",
                total_spending=50000000 + (hash(competitor) % 10000000),  # Simulated spending
                spending_by_category={
                    "Consulting": 20000000,
                    "Research": 15000000,
                    "Speaking": 10000000,
                    "Travel": 5000000
                },
                top_hcps=[
                    {"hcp_id": "HCP_001", "name": "Dr. Smith", "spending": 500000},
                    {"hcp_id": "HCP_002", "name": "Dr. Johnson", "spending": 450000},
                    {"hcp_id": "HCP_003", "name": "Dr. Williams", "spending": 400000}
                ],
                geographic_focus={
                    "California": 0.25,
                    "New York": 0.20,
                    "Texas": 0.15,
                    "Florida": 0.10
                },
                therapeutic_areas={
                    "Oncology": 0.30,
                    "Cardiology": 0.25,
                    "Neurology": 0.20,
                    "Rare Diseases": 0.15
                },
                trends={
                    "spending_growth": 0.12,
                    "digital_adoption": 0.35,
                    "geographic_expansion": 0.08
                },
                competitive_advantage={
                    "strengths": ["Strong HCP relationships", "Digital innovation"],
                    "weaknesses": ["Limited geographic presence", "High costs"],
                    "opportunities": ["Market expansion", "Digital transformation"],
                    "threats": ["Regulatory changes", "New competitors"]
                }
            )
            
            analyses.append(analysis)
            self.db.add(analysis)
        
        self.db.commit()
        return analyses
    
    async def analyze_hcp_behavior_patterns(self, request: HCPBehaviorRequest) -> List[HCPBehaviorPattern]:
        """Analyze HCP behavior patterns"""
        self.logger.info("Analyzing HCP behavior patterns", behavior_type=request.behavior_type)
        
        patterns = []
        
        # Simulate HCP behavior analysis
        hcp_ids = request.hcp_ids or [f"HCP_{i:03d}" for i in range(1, 21)]  # Default to 20 HCPs
        
        for hcp_id in hcp_ids:
            pattern = HCPBehaviorPattern(
                pattern_id=f"PATTERN_{uuid.uuid4().hex[:8].upper()}",
                hcp_id=hcp_id,
                hcp_name=f"Dr. {hcp_id}",
                specialty=request.specialty or "General Medicine",
                behavior_type=request.behavior_type,
                pattern_data={
                    "engagement_frequency": 0.75,
                    "preferred_payment_type": "Consulting",
                    "response_rate": 0.85,
                    "satisfaction_score": 8.5,
                    "influence_score": 7.2
                },
                confidence_score=0.82,
                trend_direction="increasing",
                business_impact="positive",
                recommendations=[
                    "Increase engagement frequency",
                    "Focus on consulting opportunities",
                    "Leverage for peer influence"
                ]
            )
            
            patterns.append(pattern)
            self.db.add(pattern)
        
        self.db.commit()
        return patterns
    
    async def analyze_regional_markets(self, request: RegionalAnalysisRequest) -> List[RegionalAnalysis]:
        """Analyze regional markets"""
        self.logger.info("Analyzing regional markets", regions=request.regions)
        
        analyses = []
        
        for region in request.regions:
            analysis = RegionalAnalysis(
                analysis_id=f"REGION_{uuid.uuid4().hex[:8].upper()}",
                region=region,
                analysis_type=request.analysis_type,
                total_spending=10000000 + (hash(region) % 5000000),  # Simulated spending
                spending_per_capita=500 + (hash(region) % 200),
                compliance_rate=0.95 + (hash(region) % 5) / 100,
                market_penetration=0.60 + (hash(region) % 30) / 100,
                key_insights=[
                    f"Strong growth potential in {region}",
                    f"High compliance rates in {region}",
                    f"Opportunity for market expansion in {region}"
                ],
                opportunities=[
                    f"Expand presence in {region}",
                    f"Increase HCP engagement in {region}",
                    f"Develop regional partnerships in {region}"
                ],
                risks=[
                    f"Regulatory changes in {region}",
                    f"Competition intensifying in {region}",
                    f"Economic factors affecting {region}"
                ],
                strategic_recommendations=[
                    f"Develop {region}-specific strategy",
                    f"Invest in {region} market development",
                    f"Build local partnerships in {region}"
                ]
            )
            
            analyses.append(analysis)
            self.db.add(analysis)
        
        self.db.commit()
        return analyses
    
    async def analyze_therapeutic_areas(self) -> List[TherapeuticAreaInsight]:
        """Analyze therapeutic areas"""
        self.logger.info("Analyzing therapeutic areas")
        
        therapeutic_areas = [
            "Oncology", "Cardiology", "Neurology", "Rare Diseases", 
            "Infectious Diseases", "Autoimmune", "Mental Health", "Pediatrics"
        ]
        
        insights = []
        
        for area in therapeutic_areas:
            insight = TherapeuticAreaInsight(
                insight_id=f"THERAPY_{uuid.uuid4().hex[:8].upper()}",
                therapeutic_area=area,
                insight_type="market_analysis",
                market_size=1000000000 + (hash(area) % 500000000),  # Simulated market size
                growth_rate=0.05 + (hash(area) % 15) / 100,  # 5-20% growth rate
                competition_level=["low", "medium", "high"][hash(area) % 3],
                key_players=[
                    f"Company A in {area}",
                    f"Company B in {area}",
                    f"Company C in {area}"
                ],
                market_trends=[
                    f"Increasing demand in {area}",
                    f"New treatments emerging in {area}",
                    f"Regulatory support for {area}"
                ],
                opportunities=[
                    f"Market expansion in {area}",
                    f"New product development in {area}",
                    f"Partnership opportunities in {area}"
                ],
                challenges=[
                    f"High competition in {area}",
                    f"Regulatory complexity in {area}",
                    f"High development costs in {area}"
                ],
                strategic_recommendations=[
                    f"Focus on {area} market",
                    f"Invest in {area} R&D",
                    f"Build {area} expertise"
                ]
            )
            
            insights.append(insight)
            self.db.add(insight)
        
        self.db.commit()
        return insights
    
    async def generate_strategic_recommendations(self) -> List[StrategicRecommendation]:
        """Generate strategic recommendations"""
        self.logger.info("Generating strategic recommendations")
        
        recommendations = [
            {
                "type": "market_expansion",
                "title": "Expand into Emerging Markets",
                "description": "Leverage compliance expertise to enter new geographic markets",
                "priority": "high",
                "impact_score": 8.5,
                "feasibility_score": 7.0,
                "timeline": "12-18 months",
                "expected_roi": 2.5
            },
            {
                "type": "cost_optimization",
                "title": "Optimize HCP Engagement Mix",
                "description": "Use behavioral insights to optimize HCP engagement strategies",
                "priority": "medium",
                "impact_score": 7.0,
                "feasibility_score": 8.5,
                "timeline": "6-12 months",
                "expected_roi": 1.8
            },
            {
                "type": "competitive_advantage",
                "title": "Develop AI-Powered Compliance Platform",
                "description": "Create next-generation compliance platform with AI capabilities",
                "priority": "critical",
                "impact_score": 9.5,
                "feasibility_score": 6.5,
                "timeline": "18-24 months",
                "expected_roi": 3.2
            }
        ]
        
        strategic_recs = []
        for rec_data in recommendations:
            recommendation = StrategicRecommendation(
                recommendation_id=f"REC_{uuid.uuid4().hex[:8].upper()}",
                recommendation_type=rec_data["type"],
                title=rec_data["title"],
                description=rec_data["description"],
                priority=rec_data["priority"],
                impact_score=rec_data["impact_score"],
                feasibility_score=rec_data["feasibility_score"],
                timeline=rec_data["timeline"],
                resources_required=["Budget", "Personnel", "Technology"],
                expected_roi=rec_data["expected_roi"],
                risks=["Market risk", "Execution risk", "Competitive risk"],
                implementation_steps=[
                    "Phase 1: Planning and preparation",
                    "Phase 2: Implementation",
                    "Phase 3: Monitoring and optimization"
                ]
            )
            
            strategic_recs.append(recommendation)
            self.db.add(recommendation)
        
        self.db.commit()
        return strategic_recs

# FastAPI Application
app = FastAPI(
    title="Knowledge Nexus Framework™ - Strategic Intelligence Platform",
    description="Competitive advantage through data insights for CMS Compliance Platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    engine = create_engine("sqlite:///./strategic_intelligence.db")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/intelligence/market-analysis")
async def analyze_market_intelligence(
    request: MarketAnalysisRequest,
    db: Session = Depends(get_db)
):
    """Analyze market intelligence"""
    
    service = StrategicIntelligenceService(db)
    result = await service.analyze_market_intelligence(request)
    
    return result

@app.post("/intelligence/competitor-analysis")
async def analyze_competitor_spending(
    request: CompetitorAnalysisRequest,
    db: Session = Depends(get_db)
):
    """Analyze competitor spending patterns"""
    
    service = StrategicIntelligenceService(db)
    analyses = await service.analyze_competitor_spending(request)
    
    return {
        "analyses": [{
            "analysis_id": analysis.analysis_id,
            "competitor_name": analysis.competitor_name,
            "analysis_type": analysis.analysis_type,
            "total_spending": analysis.total_spending,
            "spending_by_category": analysis.spending_by_category,
            "geographic_focus": analysis.geographic_focus,
            "therapeutic_areas": analysis.therapeutic_areas
        } for analysis in analyses]
    }

@app.post("/intelligence/hcp-behavior")
async def analyze_hcp_behavior_patterns(
    request: HCPBehaviorRequest,
    db: Session = Depends(get_db)
):
    """Analyze HCP behavior patterns"""
    
    service = StrategicIntelligenceService(db)
    patterns = await service.analyze_hcp_behavior_patterns(request)
    
    return {
        "patterns": [{
            "pattern_id": pattern.pattern_id,
            "hcp_id": pattern.hcp_id,
            "hcp_name": pattern.hcp_name,
            "specialty": pattern.specialty,
            "behavior_type": pattern.behavior_type,
            "confidence_score": pattern.confidence_score,
            "trend_direction": pattern.trend_direction,
            "business_impact": pattern.business_impact
        } for pattern in patterns]
    }

@app.post("/intelligence/regional-analysis")
async def analyze_regional_markets(
    request: RegionalAnalysisRequest,
    db: Session = Depends(get_db)
):
    """Analyze regional markets"""
    
    service = StrategicIntelligenceService(db)
    analyses = await service.analyze_regional_markets(request)
    
    return {
        "analyses": [{
            "analysis_id": analysis.analysis_id,
            "region": analysis.region,
            "analysis_type": analysis.analysis_type,
            "total_spending": analysis.total_spending,
            "compliance_rate": analysis.compliance_rate,
            "market_penetration": analysis.market_penetration,
            "key_insights": analysis.key_insights
        } for analysis in analyses]
    }

@app.get("/intelligence/therapeutic-areas")
async def analyze_therapeutic_areas(db: Session = Depends(get_db)):
    """Analyze therapeutic areas"""
    
    service = StrategicIntelligenceService(db)
    insights = await service.analyze_therapeutic_areas()
    
    return {
        "insights": [{
            "insight_id": insight.insight_id,
            "therapeutic_area": insight.therapeutic_area,
            "market_size": insight.market_size,
            "growth_rate": insight.growth_rate,
            "competition_level": insight.competition_level,
            "market_trends": insight.market_trends
        } for insight in insights]
    }

@app.get("/intelligence/strategic-recommendations")
async def generate_strategic_recommendations(db: Session = Depends(get_db)):
    """Generate strategic recommendations"""
    
    service = StrategicIntelligenceService(db)
    recommendations = await service.generate_strategic_recommendations()
    
    return {
        "recommendations": [{
            "recommendation_id": rec.recommendation_id,
            "recommendation_type": rec.recommendation_type,
            "title": rec.title,
            "description": rec.description,
            "priority": rec.priority,
            "impact_score": rec.impact_score,
            "feasibility_score": rec.feasibility_score,
            "timeline": rec.timeline,
            "expected_roi": rec.expected_roi
        } for rec in recommendations]
    }

@app.get("/intelligence/dashboard")
async def get_intelligence_dashboard(db: Session = Depends(get_db)):
    """Get strategic intelligence dashboard"""
    
    # Get recent intelligence
    recent_intelligence = db.query(MarketIntelligence).order_by(
        MarketIntelligence.created_at.desc()
    ).limit(10).all()
    
    # Get competitor analyses
    competitor_analyses = db.query(CompetitorAnalysis).order_by(
        CompetitorAnalysis.created_at.desc()
    ).limit(5).all()
    
    # Get strategic recommendations
    recommendations = db.query(StrategicRecommendation).filter(
        StrategicRecommendation.status == "proposed"
    ).order_by(StrategicRecommendation.impact_score.desc()).limit(5).all()
    
    return {
        "recent_intelligence": [{
            "intelligence_id": intel.intelligence_id,
            "intelligence_type": intel.intelligence_type,
            "title": intel.title,
            "confidence_score": intel.confidence_score,
            "created_at": intel.created_at.isoformat()
        } for intel in recent_intelligence],
        "competitor_analyses": [{
            "analysis_id": analysis.analysis_id,
            "competitor_name": analysis.competitor_name,
            "total_spending": analysis.total_spending,
            "created_at": analysis.created_at.isoformat()
        } for analysis in competitor_analyses],
        "strategic_recommendations": [{
            "recommendation_id": rec.recommendation_id,
            "title": rec.title,
            "priority": rec.priority,
            "impact_score": rec.impact_score,
            "expected_roi": rec.expected_roi
        } for rec in recommendations]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Strategic Intelligence Platform",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
