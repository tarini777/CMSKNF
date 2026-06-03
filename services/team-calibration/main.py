"""
Knowledge Nexus Framework™ - Stage 2: Insourced Core Team Calibration

Build and calibrate cross-functional expert teams
- Role-based access provisioning
- Expertise mapping and tracking
- Cross-department integration
- Knowledge sharing workflows

Team Structure:
Domain_Experts:
- CMS regulation specialists
- State-specific compliance leads
- Global transparency experts (EFPIA, Sunshine Act)

Data_Stewards:
- HCP/O data quality managers
- NPP validation specialists
- VPL maintenance team

Technology_Enablers:
- Integration architects
- ML/AI engineers
- Automation specialists
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import structlog
from passlib.context import CryptContext
from jose import JWTError, jwt
import bcrypt

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

# Database dependency
def get_db():
    # In production, use proper database connection
    engine = create_engine("sqlite:///./team_calibration.db")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Database setup
Base = declarative_base()

class User(Base):
    """User model for team members"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    department = Column(String)
    role = Column(String)
    expertise_areas = Column(JSON)
    skill_levels = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    team_memberships = relationship("TeamMembership", back_populates="user")
    knowledge_contributions = relationship("KnowledgeContribution", back_populates="contributor")

class Team(Base):
    """Team model for cross-functional teams"""
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(String, unique=True, index=True)
    team_name = Column(String)
    team_type = Column(String)  # Domain_Experts, Data_Stewards, Technology_Enablers
    description = Column(Text)
    objectives = Column(JSON)
    success_metrics = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    team_lead_id = Column(String, ForeignKey("users.user_id"))
    
    # Relationships
    memberships = relationship("TeamMembership", back_populates="team")
    knowledge_sessions = relationship("KnowledgeSession", back_populates="team")

class TeamMembership(Base):
    """Team membership model"""
    __tablename__ = "team_memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"))
    team_id = Column(String, ForeignKey("teams.team_id"))
    role_in_team = Column(String)
    responsibilities = Column(JSON)
    performance_score = Column(Float)
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="team_memberships")
    team = relationship("Team", back_populates="memberships")

class KnowledgeSession(Base):
    """Knowledge sharing session model"""
    __tablename__ = "knowledge_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    team_id = Column(String, ForeignKey("teams.team_id"))
    session_type = Column(String)  # Training, Knowledge Transfer, Best Practices
    topic = Column(String)
    description = Column(Text)
    presenter_id = Column(String, ForeignKey("users.user_id"))
    attendees = Column(JSON)
    session_date = Column(DateTime)
    duration_minutes = Column(Integer)
    effectiveness_score = Column(Float)
    key_learnings = Column(JSON)
    action_items = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="knowledge_sessions")

class KnowledgeContribution(Base):
    """Knowledge contribution tracking"""
    __tablename__ = "knowledge_contributions"
    
    id = Column(Integer, primary_key=True, index=True)
    contribution_id = Column(String, unique=True, index=True)
    contributor_id = Column(String, ForeignKey("users.user_id"))
    contribution_type = Column(String)  # Documentation, Process, Best Practice, Training
    title = Column(String)
    description = Column(Text)
    content = Column(Text)
    expertise_area = Column(String)
    impact_score = Column(Float)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    contributor = relationship("User", back_populates="knowledge_contributions")

class ExpertiseMapping(Base):
    """Expertise mapping and tracking"""
    __tablename__ = "expertise_mapping"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"))
    expertise_area = Column(String)
    skill_level = Column(Integer)  # 1-10 scale
    certifications = Column(JSON)
    experience_years = Column(Float)
    last_assessment = Column(DateTime)
    next_assessment = Column(DateTime)
    development_plan = Column(JSON)

# Pydantic models
class UserCreate(BaseModel):
    """User creation model"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    department: str
    role: str
    expertise_areas: List[str] = []
    skill_levels: Dict[str, int] = {}

class UserResponse(BaseModel):
    """User response model"""
    user_id: str
    email: str
    first_name: str
    last_name: str
    department: str
    role: str
    expertise_areas: List[str]
    skill_levels: Dict[str, int]
    is_active: bool
    created_at: datetime

class TeamCreate(BaseModel):
    """Team creation model"""
    team_name: str
    team_type: str
    description: str
    objectives: List[str]
    success_metrics: Dict[str, Any]
    team_lead_id: Optional[str] = None

class TeamResponse(BaseModel):
    """Team response model"""
    team_id: str
    team_name: str
    team_type: str
    description: str
    objectives: List[str]
    success_metrics: Dict[str, Any]
    team_lead_id: Optional[str]
    member_count: int
    created_at: datetime

class KnowledgeSessionCreate(BaseModel):
    """Knowledge session creation model"""
    team_id: str
    session_type: str
    topic: str
    description: str
    presenter_id: str
    session_date: datetime
    duration_minutes: int

class KnowledgeSessionResponse(BaseModel):
    """Knowledge session response model"""
    session_id: str
    team_id: str
    session_type: str
    topic: str
    description: str
    presenter_id: str
    attendees: List[str]
    session_date: datetime
    duration_minutes: int
    effectiveness_score: Optional[float]
    key_learnings: List[str]
    action_items: List[str]

class TeamCalibrationRequest(BaseModel):
    """Team calibration request model"""
    company_id: str
    calibration_type: str  # Initial, Periodic, Performance
    teams_to_calibrate: List[str]
    assessment_criteria: Dict[str, Any]

class TeamCalibrationResult(BaseModel):
    """Team calibration result model"""
    calibration_id: str
    company_id: str
    calibration_type: str
    overall_score: float
    team_scores: Dict[str, float]
    recommendations: List[str]
    action_plan: List[str]
    next_calibration_date: datetime

# Team Calibration Service Class
class TeamCalibrationService:
    """Core team calibration service implementation"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.logger = logger.bind(service="team_calibration")
    
    async def perform_team_calibration(self, request: TeamCalibrationRequest) -> TeamCalibrationResult:
        """Perform comprehensive team calibration"""
        self.logger.info("Starting team calibration", 
                        company_id=request.company_id,
                        calibration_type=request.calibration_type)
        
        # Generate unique calibration ID
        calibration_id = f"CALIB_{request.company_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Perform team assessments
        team_scores = {}
        for team_id in request.teams_to_calibrate:
            team_score = await self._assess_team_performance(team_id)
            team_scores[team_id] = team_score
        
        # Calculate overall score
        overall_score = np.mean(list(team_scores.values())) if team_scores else 0.0
        
        # Generate recommendations
        recommendations = await self._generate_calibration_recommendations(team_scores, request)
        
        # Create action plan
        action_plan = await self._create_action_plan(team_scores, recommendations)
        
        # Determine next calibration date
        next_calibration_date = datetime.utcnow() + timedelta(days=90)  # Quarterly calibration
        
        result = TeamCalibrationResult(
            calibration_id=calibration_id,
            company_id=request.company_id,
            calibration_type=request.calibration_type,
            overall_score=overall_score,
            team_scores=team_scores,
            recommendations=recommendations,
            action_plan=action_plan,
            next_calibration_date=next_calibration_date
        )
        
        # Store calibration results
        await self._store_calibration_results(result)
        
        self.logger.info("Team calibration completed", 
                        calibration_id=calibration_id,
                        overall_score=overall_score)
        
        return result
    
    async def _assess_team_performance(self, team_id: str) -> float:
        """Assess individual team performance"""
        self.logger.info("Assessing team performance", team_id=team_id)
        
        # Get team and members
        team = self.db.query(Team).filter(Team.team_id == team_id).first()
        if not team:
            return 0.0
        
        memberships = self.db.query(TeamMembership).filter(
            TeamMembership.team_id == team_id,
            TeamMembership.is_active == True
        ).all()
        
        if not memberships:
            return 0.0
        
        # Calculate team performance metrics
        performance_scores = []
        expertise_coverage = set()
        knowledge_contributions = 0
        
        for membership in memberships:
            # Individual performance score
            if membership.performance_score:
                performance_scores.append(membership.performance_score)
            
            # Expertise coverage
            user = self.db.query(User).filter(User.user_id == membership.user_id).first()
            if user and user.expertise_areas:
                expertise_coverage.update(user.expertise_areas)
            
            # Knowledge contributions
            contributions = self.db.query(KnowledgeContribution).filter(
                KnowledgeContribution.contributor_id == membership.user_id
            ).count()
            knowledge_contributions += contributions
        
        # Calculate composite score
        avg_performance = np.mean(performance_scores) if performance_scores else 5.0
        expertise_score = min(10.0, len(expertise_coverage) * 2)  # Max 10 for 5+ areas
        knowledge_score = min(10.0, knowledge_contributions * 0.5)  # Max 10 for 20+ contributions
        
        team_score = (avg_performance * 0.5 + expertise_score * 0.3 + knowledge_score * 0.2)
        
        return min(10.0, max(0.0, team_score))
    
    async def _generate_calibration_recommendations(self, team_scores: Dict[str, float], 
                                                  request: TeamCalibrationRequest) -> List[str]:
        """Generate calibration recommendations"""
        self.logger.info("Generating calibration recommendations")
        
        recommendations = []
        
        # Analyze team scores
        avg_score = np.mean(list(team_scores.values())) if team_scores else 0.0
        low_performing_teams = [team_id for team_id, score in team_scores.items() if score < 6.0]
        high_performing_teams = [team_id for team_id, score in team_scores.items() if score >= 8.0]
        
        if avg_score < 6.0:
            recommendations.append("Overall team performance is below target. Implement comprehensive training program.")
        
        if low_performing_teams:
            recommendations.append(f"Focus improvement efforts on teams: {', '.join(low_performing_teams)}")
        
        if high_performing_teams:
            recommendations.append(f"Leverage best practices from high-performing teams: {', '.join(high_performing_teams)}")
        
        # Team-specific recommendations
        for team_id, score in team_scores.items():
            if score < 5.0:
                recommendations.append(f"Team {team_id} requires immediate intervention and restructuring")
            elif score < 7.0:
                recommendations.append(f"Team {team_id} needs targeted skill development and mentoring")
            elif score >= 8.0:
                recommendations.append(f"Team {team_id} is ready for advanced responsibilities and leadership roles")
        
        # General recommendations
        recommendations.extend([
            "Implement regular knowledge sharing sessions across all teams",
            "Establish cross-team collaboration projects to build expertise",
            "Create mentorship programs pairing senior and junior team members",
            "Develop team-specific training curricula based on performance gaps",
            "Implement peer review and feedback mechanisms for continuous improvement"
        ])
        
        return recommendations
    
    async def _create_action_plan(self, team_scores: Dict[str, float], 
                                recommendations: List[str]) -> List[str]:
        """Create actionable plan based on calibration results"""
        self.logger.info("Creating action plan")
        
        action_plan = []
        
        # Immediate actions (0-30 days)
        action_plan.append("Week 1-2: Conduct individual performance reviews for all team members")
        action_plan.append("Week 2-3: Implement targeted training programs for low-performing teams")
        action_plan.append("Week 3-4: Establish weekly knowledge sharing sessions")
        
        # Short-term actions (1-3 months)
        action_plan.append("Month 1: Deploy mentorship programs across all teams")
        action_plan.append("Month 2: Implement cross-team collaboration projects")
        action_plan.append("Month 3: Conduct mid-calibration assessment and adjust plans")
        
        # Medium-term actions (3-6 months)
        action_plan.append("Month 4: Launch advanced training programs for high-performing teams")
        action_plan.append("Month 5: Implement peer review and feedback systems")
        action_plan.append("Month 6: Prepare for next quarterly calibration cycle")
        
        # Long-term actions (6+ months)
        action_plan.append("Month 6+: Establish continuous improvement culture with regular assessments")
        action_plan.append("Month 6+: Develop succession planning and leadership development programs")
        
        return action_plan
    
    async def _store_calibration_results(self, result: TeamCalibrationResult):
        """Store calibration results in database"""
        self.logger.info("Storing calibration results", calibration_id=result.calibration_id)
        
        # Store calibration results (simplified for this example)
        # In production, create proper database models for calibration results
        
        self.db.commit()
    
    async def create_team(self, team_data: TeamCreate, current_user_id: str) -> TeamResponse:
        """Create a new team"""
        self.logger.info("Creating new team", team_name=team_data.team_name)
        
        team_id = f"TEAM_{uuid.uuid4().hex[:8].upper()}"
        
        db_team = Team(
            team_id=team_id,
            team_name=team_data.team_name,
            team_type=team_data.team_type,
            description=team_data.description,
            objectives=team_data.objectives,
            success_metrics=team_data.success_metrics,
            team_lead_id=team_data.team_lead_id or current_user_id
        )
        
        self.db.add(db_team)
        self.db.commit()
        self.db.refresh(db_team)
        
        return TeamResponse(
            team_id=db_team.team_id,
            team_name=db_team.team_name,
            team_type=db_team.team_type,
            description=db_team.description,
            objectives=db_team.objectives,
            success_metrics=db_team.success_metrics,
            team_lead_id=db_team.team_lead_id,
            member_count=0,
            created_at=db_team.created_at
        )
    
    async def add_team_member(self, team_id: str, user_id: str, role: str, 
                            responsibilities: List[str]) -> bool:
        """Add member to team"""
        self.logger.info("Adding team member", team_id=team_id, user_id=user_id)
        
        # Check if team exists
        team = self.db.query(Team).filter(Team.team_id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Check if user exists
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create membership
        membership = TeamMembership(
            user_id=user_id,
            team_id=team_id,
            role_in_team=role,
            responsibilities=responsibilities,
            performance_score=5.0  # Default score
        )
        
        self.db.add(membership)
        self.db.commit()
        
        return True
    
    async def schedule_knowledge_session(self, session_data: KnowledgeSessionCreate) -> KnowledgeSessionResponse:
        """Schedule a knowledge sharing session"""
        self.logger.info("Scheduling knowledge session", topic=session_data.topic)
        
        session_id = f"KS_{uuid.uuid4().hex[:8].upper()}"
        
        db_session = KnowledgeSession(
            session_id=session_id,
            team_id=session_data.team_id,
            session_type=session_data.session_type,
            topic=session_data.topic,
            description=session_data.description,
            presenter_id=session_data.presenter_id,
            session_date=session_data.session_date,
            duration_minutes=session_data.duration_minutes
        )
        
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        
        return KnowledgeSessionResponse(
            session_id=db_session.session_id,
            team_id=db_session.team_id,
            session_type=db_session.session_type,
            topic=db_session.topic,
            description=db_session.description,
            presenter_id=db_session.presenter_id,
            attendees=[],
            session_date=db_session.session_date,
            duration_minutes=db_session.duration_minutes,
            effectiveness_score=None,
            key_learnings=[],
            action_items=[]
        )

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, "secret_key", algorithm="HS256")
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), 
                          db: Session = Depends(get_db)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, "secret_key", algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

# FastAPI Application
app = FastAPI(
    title="Knowledge Nexus Framework™ - Team Calibration Service",
    description="Stage 2: Insourced Core Team Calibration for CMS Compliance Platform",
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


@app.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = f"USER_{uuid.uuid4().hex[:8].upper()}"
    hashed_password = get_password_hash(user_data.password)
    
    db_user = User(
        user_id=user_id,
        email=user_data.email,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        department=user_data.department,
        role=user_data.role,
        expertise_areas=user_data.expertise_areas,
        skill_levels=user_data.skill_levels
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return UserResponse(
        user_id=db_user.user_id,
        email=db_user.email,
        first_name=db_user.first_name,
        last_name=db_user.last_name,
        department=db_user.department,
        role=db_user.role,
        expertise_areas=db_user.expertise_areas or [],
        skill_levels=db_user.skill_levels or {},
        is_active=db_user.is_active,
        created_at=db_user.created_at
    )

@app.post("/auth/login")
async def login_user(email: str, password: str, db: Session = Depends(get_db)):
    """Login user and return access token"""
    
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/teams", response_model=TeamResponse)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new team"""
    
    service = TeamCalibrationService(db)
    return await service.create_team(team_data, current_user.user_id)

@app.post("/teams/{team_id}/members")
async def add_team_member(
    team_id: str,
    user_id: str,
    role: str,
    responsibilities: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add member to team"""
    
    service = TeamCalibrationService(db)
    success = await service.add_team_member(team_id, user_id, role, responsibilities)
    
    if success:
        return {"message": "Team member added successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to add team member")

@app.post("/knowledge-sessions", response_model=KnowledgeSessionResponse)
async def schedule_knowledge_session(
    session_data: KnowledgeSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule a knowledge sharing session"""
    
    service = TeamCalibrationService(db)
    return await service.schedule_knowledge_session(session_data)

@app.post("/calibrations", response_model=TeamCalibrationResult)
async def perform_team_calibration(
    request: TeamCalibrationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Perform comprehensive team calibration"""
    
    service = TeamCalibrationService(db)
    return await service.perform_team_calibration(request)

@app.get("/teams/{team_id}")
async def get_team_details(team_id: str, db: Session = Depends(get_db)):
    """Get team details and members"""
    
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    memberships = db.query(TeamMembership).filter(
        TeamMembership.team_id == team_id,
        TeamMembership.is_active == True
    ).all()
    
    members = []
    for membership in memberships:
        user = db.query(User).filter(User.user_id == membership.user_id).first()
        if user:
            members.append({
                "user_id": user.user_id,
                "name": f"{user.first_name} {user.last_name}",
                "role": membership.role_in_team,
                "performance_score": membership.performance_score
            })
    
    return {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "team_type": team.team_type,
        "description": team.description,
        "objectives": team.objectives,
        "members": members,
        "member_count": len(members)
    }

@app.get("/users/{user_id}/expertise")
async def get_user_expertise(user_id: str, db: Session = Depends(get_db)):
    """Get user expertise mapping"""
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    expertise_mappings = db.query(ExpertiseMapping).filter(
        ExpertiseMapping.user_id == user_id
    ).all()
    
    expertise_areas = []
    for mapping in expertise_mappings:
        expertise_areas.append({
            "area": mapping.expertise_area,
            "skill_level": mapping.skill_level,
            "experience_years": mapping.experience_years,
            "certifications": mapping.certifications,
            "last_assessment": mapping.last_assessment
        })
    
    return {
        "user_id": user_id,
        "name": f"{user.first_name} {user.last_name}",
        "department": user.department,
        "role": user.role,
        "expertise_areas": expertise_areas
    }

# New Knowledge Hub Enhancement Endpoints

@app.post("/knowledge-hub/initialize-user")
async def initialize_user(
    user_id: str,
    role: str
):
    """Initialize user in the knowledge hub system"""
    try:
        # Import and use knowledge hub
        try:
            from knowledge_hub import KnowledgeHub, UserRole
            hub = KnowledgeHub()
            
            # Convert string role to enum
            role_enum = UserRole(role)
            
            # Initialize user
            expertise = hub.initialize_user(user_id, role_enum)
            
            return {
                "success": True,
                "user_id": expertise.user_id,
                "role": expertise.role.value,
                "expertise_areas": expertise.expertise_areas,
                "completed_modules": list(expertise.completed_modules),
                "certifications": expertise.certifications
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Knowledge hub service not available"
            }
        
    except Exception as e:
        logger.error(f"Error initializing user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error initializing user: {str(e)}")

@app.get("/knowledge-hub/training-modules")
async def get_training_modules(role: Optional[str] = None):
    """Get training modules for a specific role"""
    try:
        # Import and use knowledge hub
        try:
            from knowledge_hub import KnowledgeHub, UserRole
            hub = KnowledgeHub()
            
            if role:
                role_enum = UserRole(role)
                modules = hub.get_training_modules_for_role(role_enum)
            else:
                modules = hub.training_modules
            
            return {
                "success": True,
                "modules": [
                    {
                        "module_id": module.module_id,
                        "title": module.title,
                        "description": module.description,
                        "level": module.level.value,
                        "target_roles": [role.value for role in module.target_roles],
                        "estimated_duration": module.estimated_duration,
                        "prerequisites": module.prerequisites,
                        "learning_objectives": module.learning_objectives,
                        "tags": module.tags
                    }
                    for module in modules
                ],
                "total_modules": len(modules)
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Knowledge hub service not available"
            }
        
    except Exception as e:
        logger.error(f"Error getting training modules: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting training modules: {str(e)}")

@app.get("/knowledge-hub/recommendations/{user_id}")
async def get_learning_recommendations(user_id: str):
    """Get personalized learning recommendations for a user"""
    try:
        # Import and use knowledge hub
        try:
            from knowledge_hub import KnowledgeHub
            hub = KnowledgeHub()
            
            # Get recommendations
            recommendations = hub.get_learning_recommendations(user_id)
            
            return {
                "success": True,
                "user_id": user_id,
                "recommendations": [
                    {
                        "module_id": rec.recommended_module_id,
                        "reason": rec.reason,
                        "priority": rec.priority,
                        "estimated_impact": rec.estimated_impact,
                        "prerequisites_met": rec.prerequisites_met
                    }
                    for rec in recommendations
                ],
                "total_recommendations": len(recommendations)
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Knowledge hub service not available"
            }
        
    except Exception as e:
        logger.error(f"Error getting learning recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting learning recommendations: {str(e)}")

@app.post("/knowledge-hub/update-progress")
async def update_learning_progress(
    user_id: str,
    module_id: str,
    progress_percentage: float,
    time_spent: int = 0,
    assessment_score: Optional[float] = None
):
    """Update user learning progress"""
    try:
        # Import and use knowledge hub
        try:
            from knowledge_hub import KnowledgeHub
            hub = KnowledgeHub()
            
            # Update progress
            hub.update_learning_progress(user_id, module_id, progress_percentage, time_spent, assessment_score)
            
            return {
                "success": True,
                "user_id": user_id,
                "module_id": module_id,
                "progress_percentage": progress_percentage,
                "time_spent": time_spent,
                "assessment_score": assessment_score
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Knowledge hub service not available"
            }
        
    except Exception as e:
        logger.error(f"Error updating learning progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating learning progress: {str(e)}")

@app.get("/knowledge-hub/dashboard/{user_id}")
async def get_user_dashboard(user_id: str):
    """Get user dashboard data"""
    try:
        # Import and use knowledge hub
        try:
            from knowledge_hub import KnowledgeHub
            hub = KnowledgeHub()
            
            # Get dashboard data
            dashboard = hub.get_user_dashboard(user_id)
            
            return {
                "success": True,
                "dashboard": dashboard
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Knowledge hub service not available"
            }
        
    except Exception as e:
        logger.error(f"Error getting user dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user dashboard: {str(e)}")

@app.post("/knowledge-hub/add-artifact")
async def add_knowledge_artifact(
    title: str,
    description: str,
    content: str,
    artifact_type: str,
    created_by: str,
    tags: Optional[List[str]] = None
):
    """Add a new knowledge artifact"""
    try:
        # Import and use knowledge hub
        try:
            from knowledge_hub import KnowledgeHub, KnowledgeType
            hub = KnowledgeHub()
            
            # Convert string type to enum
            type_enum = KnowledgeType(artifact_type)
            
            # Add artifact
            artifact_id = hub.add_knowledge_artifact(
                title, description, content, type_enum, created_by, tags
            )
            
            return {
                "success": True,
                "artifact_id": artifact_id,
                "title": title,
                "artifact_type": artifact_type,
                "created_by": created_by
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Knowledge hub service not available"
            }
        
    except Exception as e:
        logger.error(f"Error adding knowledge artifact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding knowledge artifact: {str(e)}")

@app.get("/knowledge-hub/search")
async def search_knowledge_base(
    query: str,
    artifact_type: Optional[str] = None,
    tags: Optional[str] = None
):
    """Search the knowledge base"""
    try:
        # Import and use knowledge hub
        try:
            from knowledge_hub import KnowledgeHub, KnowledgeType
            hub = KnowledgeHub()
            
            # Parse parameters
            type_enum = KnowledgeType(artifact_type) if artifact_type else None
            tag_list = tags.split(',') if tags else None
            
            # Search knowledge base
            results = hub.search_knowledge_base(query, type_enum, tag_list)
            
            return {
                "success": True,
                "query": query,
                "results": [
                    {
                        "artifact_id": artifact.artifact_id,
                        "title": artifact.title,
                        "description": artifact.description,
                        "artifact_type": artifact.artifact_type.value,
                        "created_by": artifact.created_by,
                        "created_at": artifact.created_at.isoformat(),
                        "tags": artifact.tags
                    }
                    for artifact in results
                ],
                "total_results": len(results)
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Knowledge hub service not available"
            }
        
    except Exception as e:
        logger.error(f"Error searching knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching knowledge base: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Team Calibration Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
