"""
Knowledge Nexus Framework™ - Knowledge Sharing and Training Hub

This component provides:
- Role-Based Training: On-demand training modules for different team members
- Learning System: Track expertise and recommend personalized training
- Knowledge Artifact Repository: Centralized repository for team collaboration
"""

import asyncio
import logging
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
import hashlib
from pathlib import Path
import yaml
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)

class UserRole(Enum):
    """User roles in the system"""
    DATA_ANALYST = "data_analyst"
    COMPLIANCE_SPECIALIST = "compliance_specialist"
    REGULATORY_EXPERT = "regulatory_expert"
    TEAM_LEAD = "team_lead"
    ADMINISTRATOR = "administrator"

class TrainingLevel(Enum):
    """Training difficulty levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class KnowledgeType(Enum):
    """Types of knowledge artifacts"""
    TRAINING_MODULE = "training_module"
    BEST_PRACTICE = "best_practice"
    RULE_INTERPRETATION = "rule_interpretation"
    CASE_STUDY = "case_study"
    FAQ = "faq"
    TEMPLATE = "template"
    GUIDANCE_DOCUMENT = "guidance_document"

class CompletionStatus(Enum):
    """Training completion status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CERTIFIED = "certified"

@dataclass
class TrainingModule:
    """Represents a training module"""
    module_id: str
    title: str
    description: str
    content: str
    level: TrainingLevel
    target_roles: List[UserRole]
    estimated_duration: int  # minutes
    prerequisites: List[str] = field(default_factory=list)
    learning_objectives: List[str] = field(default_factory=list)
    assessment_questions: List[Dict[str, Any]] = field(default_factory=list)
    resources: List[str] = field(default_factory=list)
    created_by: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0"
    tags: List[str] = field(default_factory=list)

@dataclass
class KnowledgeArtifact:
    """Represents a knowledge artifact"""
    artifact_id: str
    title: str
    description: str
    content: str
    artifact_type: KnowledgeType
    tags: List[str] = field(default_factory=list)
    created_by: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0"
    related_artifacts: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UserProgress:
    """Tracks user learning progress"""
    user_id: str
    module_id: str
    status: CompletionStatus
    progress_percentage: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_accessed: Optional[datetime] = None
    time_spent: int = 0  # minutes
    assessment_score: Optional[float] = None
    attempts: int = 0

@dataclass
class UserExpertise:
    """Tracks user expertise levels"""
    user_id: str
    role: UserRole
    expertise_areas: Dict[str, float] = field(default_factory=dict)  # area -> score (0-1)
    completed_modules: Set[str] = field(default_factory=set)
    certifications: List[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class LearningRecommendation:
    """Learning recommendation for a user"""
    user_id: str
    recommended_module_id: str
    reason: str
    priority: float  # 0-1
    estimated_impact: float  # 0-1
    prerequisites_met: bool

class TrainingContentGenerator:
    """Generates training content for different roles"""
    
    def __init__(self):
        self.role_competencies = {
            UserRole.DATA_ANALYST: [
                "data_cleaning", "data_validation", "csv_processing", 
                "data_quality", "excel_advanced", "sql_basics"
            ],
            UserRole.COMPLIANCE_SPECIALIST: [
                "cms_regulations", "reporting_requirements", "audit_trails",
                "compliance_monitoring", "risk_assessment", "documentation"
            ],
            UserRole.REGULATORY_EXPERT: [
                "regulatory_intelligence", "rule_interpretation", "guidance_analysis",
                "legislative_tracking", "compliance_strategy", "stakeholder_management"
            ],
            UserRole.TEAM_LEAD: [
                "team_management", "project_coordination", "quality_assurance",
                "stakeholder_communication", "process_optimization", "training_delivery"
            ]
        }

    def generate_training_modules(self) -> List[TrainingModule]:
        """Generate standard training modules for all roles"""
        modules = []
        
        # Data Analyst modules
        modules.extend(self._generate_data_analyst_modules())
        
        # Compliance Specialist modules
        modules.extend(self._generate_compliance_specialist_modules())
        
        # Regulatory Expert modules
        modules.extend(self._generate_regulatory_expert_modules())
        
        # Team Lead modules
        modules.extend(self._generate_team_lead_modules())
        
        return modules

    def _generate_data_analyst_modules(self) -> List[TrainingModule]:
        """Generate training modules for data analysts"""
        return [
            TrainingModule(
                module_id="da_001",
                title="CMS Data Structure Fundamentals",
                description="Understanding the structure and format of CMS Open Payments data",
                content=self._get_module_content("da_001"),
                level=TrainingLevel.BEGINNER,
                target_roles=[UserRole.DATA_ANALYST],
                estimated_duration=45,
                learning_objectives=[
                    "Understand CMS data file formats",
                    "Identify key data fields and their purposes",
                    "Recognize common data quality issues"
                ],
                assessment_questions=self._get_assessment_questions("da_001"),
                tags=["data_structure", "cms", "fundamentals"]
            ),
            TrainingModule(
                module_id="da_002",
                title="Data Cleaning and Standardization",
                description="Techniques for cleaning and standardizing CMS data",
                content=self._get_module_content("da_002"),
                level=TrainingLevel.INTERMEDIATE,
                target_roles=[UserRole.DATA_ANALYST],
                estimated_duration=60,
                prerequisites=["da_001"],
                learning_objectives=[
                    "Apply data cleaning techniques",
                    "Standardize inconsistent data formats",
                    "Handle missing and duplicate data"
                ],
                assessment_questions=self._get_assessment_questions("da_002"),
                tags=["data_cleaning", "standardization", "quality"]
            ),
            TrainingModule(
                module_id="da_003",
                title="Advanced Data Validation",
                description="Advanced techniques for validating CMS data integrity",
                content=self._get_module_content("da_003"),
                level=TrainingLevel.ADVANCED,
                target_roles=[UserRole.DATA_ANALYST],
                estimated_duration=75,
                prerequisites=["da_001", "da_002"],
                learning_objectives=[
                    "Implement automated validation rules",
                    "Use ML techniques for anomaly detection",
                    "Cross-reference data with external sources"
                ],
                assessment_questions=self._get_assessment_questions("da_003"),
                tags=["validation", "ml", "anomaly_detection"]
            )
        ]

    def _generate_compliance_specialist_modules(self) -> List[TrainingModule]:
        """Generate training modules for compliance specialists"""
        return [
            TrainingModule(
                module_id="cs_001",
                title="CMS Open Payments Program Overview",
                description="Comprehensive overview of the CMS Open Payments program",
                content=self._get_module_content("cs_001"),
                level=TrainingLevel.BEGINNER,
                target_roles=[UserRole.COMPLIANCE_SPECIALIST],
                estimated_duration=90,
                learning_objectives=[
                    "Understand the purpose and scope of Open Payments",
                    "Identify covered recipients and applicable manufacturers",
                    "Know key reporting requirements and deadlines"
                ],
                assessment_questions=self._get_assessment_questions("cs_001"),
                tags=["cms_overview", "program_fundamentals", "requirements"]
            ),
            TrainingModule(
                module_id="cs_002",
                title="De Minimis Thresholds and Exceptions",
                description="Understanding de minimis thresholds and reporting exceptions",
                content=self._get_module_content("cs_002"),
                level=TrainingLevel.INTERMEDIATE,
                target_roles=[UserRole.COMPLIANCE_SPECIALIST],
                estimated_duration=60,
                prerequisites=["cs_001"],
                learning_objectives=[
                    "Calculate de minimis thresholds correctly",
                    "Identify applicable exceptions",
                    "Apply threshold rules to real scenarios"
                ],
                assessment_questions=self._get_assessment_questions("cs_002"),
                tags=["de_minimis", "thresholds", "exceptions"]
            ),
            TrainingModule(
                module_id="cs_003",
                title="Audit Trail and Documentation Requirements",
                description="Requirements for maintaining audit trails and documentation",
                content=self._get_module_content("cs_003"),
                level=TrainingLevel.ADVANCED,
                target_roles=[UserRole.COMPLIANCE_SPECIALIST],
                estimated_duration=45,
                prerequisites=["cs_001"],
                learning_objectives=[
                    "Understand audit trail requirements",
                    "Implement proper documentation practices",
                    "Prepare for compliance audits"
                ],
                assessment_questions=self._get_assessment_questions("cs_003"),
                tags=["audit_trail", "documentation", "compliance"]
            )
        ]

    def _generate_regulatory_expert_modules(self) -> List[TrainingModule]:
        """Generate training modules for regulatory experts"""
        return [
            TrainingModule(
                module_id="re_001",
                title="Regulatory Intelligence and Monitoring",
                description="Techniques for monitoring and interpreting regulatory changes",
                content=self._get_module_content("re_001"),
                level=TrainingLevel.ADVANCED,
                target_roles=[UserRole.REGULATORY_EXPERT],
                estimated_duration=120,
                learning_objectives=[
                    "Set up regulatory monitoring systems",
                    "Interpret regulatory guidance documents",
                    "Assess impact of regulatory changes"
                ],
                assessment_questions=self._get_assessment_questions("re_001"),
                tags=["regulatory_intelligence", "monitoring", "interpretation"]
            ),
            TrainingModule(
                module_id="re_002",
                title="Complex Rule Interpretation",
                description="Interpreting complex and ambiguous regulatory rules",
                content=self._get_module_content("re_002"),
                level=TrainingLevel.EXPERT,
                target_roles=[UserRole.REGULATORY_EXPERT],
                estimated_duration=90,
                prerequisites=["re_001"],
                learning_objectives=[
                    "Analyze complex regulatory scenarios",
                    "Develop internal guidance for ambiguous rules",
                    "Communicate regulatory interpretations effectively"
                ],
                assessment_questions=self._get_assessment_questions("re_002"),
                tags=["rule_interpretation", "complex_scenarios", "guidance"]
            )
        ]

    def _generate_team_lead_modules(self) -> List[TrainingModule]:
        """Generate training modules for team leads"""
        return [
            TrainingModule(
                module_id="tl_001",
                title="Team Management and Coordination",
                description="Managing CMS compliance teams effectively",
                content=self._get_module_content("tl_001"),
                level=TrainingLevel.INTERMEDIATE,
                target_roles=[UserRole.TEAM_LEAD],
                estimated_duration=75,
                learning_objectives=[
                    "Manage team workflows and responsibilities",
                    "Coordinate cross-functional activities",
                    "Ensure quality and compliance standards"
                ],
                assessment_questions=self._get_assessment_questions("tl_001"),
                tags=["team_management", "coordination", "leadership"]
            ),
            TrainingModule(
                module_id="tl_002",
                title="Process Optimization and Continuous Improvement",
                description="Optimizing CMS compliance processes for efficiency",
                content=self._get_module_content("tl_002"),
                level=TrainingLevel.ADVANCED,
                target_roles=[UserRole.TEAM_LEAD],
                estimated_duration=60,
                prerequisites=["tl_001"],
                learning_objectives=[
                    "Identify process improvement opportunities",
                    "Implement continuous improvement practices",
                    "Measure and track process performance"
                ],
                assessment_questions=self._get_assessment_questions("tl_002"),
                tags=["process_optimization", "continuous_improvement", "performance"]
            )
        ]

    def _get_module_content(self, module_id: str) -> str:
        """Get detailed content for a training module"""
        content_templates = {
            "da_001": """
            # CMS Data Structure Fundamentals
            
            ## Overview
            The CMS Open Payments program requires manufacturers to report certain payments and transfers of value to covered recipients. Understanding the data structure is crucial for effective data processing.
            
            ## Key Data Fields
            - **Covered Recipient Information**: Name, NPI, specialty, address
            - **Payment Information**: Amount, date, nature of payment
            - **Manufacturer Information**: Name, identifier, contact details
            - **Research Information**: Research ID, clinical trial information
            
            ## Common Data Quality Issues
            1. Inconsistent name formats
            2. Missing or invalid NPIs
            3. Incorrect date formats
            4. Duplicate records
            
            ## Best Practices
            - Always validate NPI format (10 digits)
            - Standardize date formats to YYYY-MM-DD
            - Check for duplicate records before processing
            """,
            "cs_001": """
            # CMS Open Payments Program Overview
            
            ## Program Purpose
            The Open Payments program promotes transparency by publishing information about financial relationships between the health care industry and health care providers.
            
            ## Covered Recipients
            - Physicians (MD, DO, DDS, DMD, DPM, OD, DC, DDS, DMD)
            - Teaching hospitals
            - Non-physician practitioners (in some cases)
            
            ## Applicable Manufacturers
            - Pharmaceutical companies
            - Medical device manufacturers
            - Biological product manufacturers
            
            ## Reporting Requirements
            - Annual reporting deadline: March 31st
            - Quarterly reporting for certain payments
            - De minimis threshold: $11.04 (2024)
            """
        }
        
        return content_templates.get(module_id, f"Content for module {module_id}")

    def _get_assessment_questions(self, module_id: str) -> List[Dict[str, Any]]:
        """Get assessment questions for a training module"""
        question_templates = {
            "da_001": [
                {
                    "question": "What is the correct format for an NPI?",
                    "options": ["9 digits", "10 digits", "11 digits", "12 digits"],
                    "correct_answer": 1,
                    "explanation": "NPIs must be exactly 10 digits long."
                },
                {
                    "question": "Which of the following is NOT a common data quality issue?",
                    "options": ["Inconsistent name formats", "Missing NPIs", "Correct date formats", "Duplicate records"],
                    "correct_answer": 2,
                    "explanation": "Correct date formats are not a data quality issue."
                }
            ],
            "cs_001": [
                {
                    "question": "What is the current de minimis threshold for 2024?",
                    "options": ["$10.00", "$11.04", "$12.00", "$15.00"],
                    "correct_answer": 1,
                    "explanation": "The de minimis threshold for 2024 is $11.04."
                }
            ]
        }
        
        return question_templates.get(module_id, [])

class LearningAnalytics:
    """Analyzes learning patterns and generates recommendations"""
    
    def __init__(self):
        self.user_progress: Dict[str, List[UserProgress]] = defaultdict(list)
        self.user_expertise: Dict[str, UserExpertise] = {}
        self.role_competencies = {
            UserRole.DATA_ANALYST: ["data_cleaning", "data_validation", "csv_processing"],
            UserRole.COMPLIANCE_SPECIALIST: ["cms_regulations", "reporting_requirements", "audit_trails"],
            UserRole.REGULATORY_EXPERT: ["regulatory_intelligence", "rule_interpretation", "guidance_analysis"],
            UserRole.TEAM_LEAD: ["team_management", "project_coordination", "quality_assurance"]
        }

    def update_user_progress(self, user_id: str, module_id: str, 
                           progress_percentage: float, time_spent: int = 0,
                           assessment_score: Optional[float] = None) -> None:
        """Update user progress for a training module"""
        progress = UserProgress(
            user_id=user_id,
            module_id=module_id,
            status=self._determine_status(progress_percentage),
            progress_percentage=progress_percentage,
            last_accessed=datetime.now(),
            time_spent=time_spent,
            assessment_score=assessment_score
        )
        
        # Update or add progress
        existing_progress = None
        for p in self.user_progress[user_id]:
            if p.module_id == module_id:
                existing_progress = p
                break
        
        if existing_progress:
            existing_progress.progress_percentage = progress_percentage
            existing_progress.status = progress.status
            existing_progress.last_accessed = progress.last_accessed
            existing_progress.time_spent += time_spent
            if assessment_score is not None:
                existing_progress.assessment_score = assessment_score
                existing_progress.attempts += 1
        else:
            progress.started_at = datetime.now()
            if progress_percentage == 100:
                progress.completed_at = datetime.now()
            self.user_progress[user_id].append(progress)

    def generate_learning_recommendations(self, user_id: str, 
                                        available_modules: List[TrainingModule]) -> List[LearningRecommendation]:
        """Generate personalized learning recommendations"""
        recommendations = []
        
        if user_id not in self.user_expertise:
            return recommendations
        
        user_expertise = self.user_expertise[user_id]
        completed_modules = user_expertise.completed_modules
        
        for module in available_modules:
            # Skip if user's role doesn't match
            if user_expertise.role not in module.target_roles:
                continue
            
            # Skip if already completed
            if module.module_id in completed_modules:
                continue
            
            # Check prerequisites
            prerequisites_met = all(prereq in completed_modules for prereq in module.prerequisites)
            
            # Calculate priority based on role competencies and current expertise
            priority = self._calculate_priority(module, user_expertise)
            
            # Calculate estimated impact
            impact = self._calculate_impact(module, user_expertise)
            
            if priority > 0.3:  # Only recommend if priority is above threshold
                recommendation = LearningRecommendation(
                    user_id=user_id,
                    recommended_module_id=module.module_id,
                    reason=self._generate_recommendation_reason(module, user_expertise),
                    priority=priority,
                    estimated_impact=impact,
                    prerequisites_met=prerequisites_met
                )
                recommendations.append(recommendation)
        
        # Sort by priority
        recommendations.sort(key=lambda x: x.priority, reverse=True)
        return recommendations[:5]  # Return top 5 recommendations

    def _determine_status(self, progress_percentage: float) -> CompletionStatus:
        """Determine completion status based on progress percentage"""
        if progress_percentage == 0:
            return CompletionStatus.NOT_STARTED
        elif progress_percentage < 100:
            return CompletionStatus.IN_PROGRESS
        else:
            return CompletionStatus.COMPLETED

    def _calculate_priority(self, module: TrainingModule, user_expertise: UserExpertise) -> float:
        """Calculate priority score for a module"""
        priority = 0.0
        
        # Base priority by level
        level_priorities = {
            TrainingLevel.BEGINNER: 0.8,
            TrainingLevel.INTERMEDIATE: 0.6,
            TrainingLevel.ADVANCED: 0.4,
            TrainingLevel.EXPERT: 0.2
        }
        priority += level_priorities.get(module.level, 0.5)
        
        # Adjust based on user's current expertise in related areas
        for tag in module.tags:
            if tag in user_expertise.expertise_areas:
                expertise_score = user_expertise.expertise_areas[tag]
                if expertise_score < 0.5:  # Low expertise, higher priority
                    priority += 0.3
                elif expertise_score > 0.8:  # High expertise, lower priority
                    priority -= 0.2
        
        return min(max(priority, 0.0), 1.0)

    def _calculate_impact(self, module: TrainingModule, user_expertise: UserExpertise) -> float:
        """Calculate estimated impact of completing a module"""
        impact = 0.5  # Base impact
        
        # Higher impact for modules that fill knowledge gaps
        for tag in module.tags:
            if tag in user_expertise.expertise_areas:
                current_expertise = user_expertise.expertise_areas[tag]
                if current_expertise < 0.3:
                    impact += 0.3  # High impact for low expertise areas
                elif current_expertise < 0.6:
                    impact += 0.2  # Medium impact for medium expertise areas
        
        return min(max(impact, 0.0), 1.0)

    def _generate_recommendation_reason(self, module: TrainingModule, user_expertise: UserExpertise) -> str:
        """Generate human-readable reason for recommendation"""
        reasons = []
        
        # Check for low expertise areas
        for tag in module.tags:
            if tag in user_expertise.expertise_areas:
                expertise_score = user_expertise.expertise_areas[tag]
                if expertise_score < 0.3:
                    reasons.append(f"Low expertise in {tag}")
                elif expertise_score < 0.6:
                    reasons.append(f"Moderate expertise in {tag}")
        
        # Check for role alignment
        if user_expertise.role in module.target_roles:
            reasons.append("Aligned with your role")
        
        # Check for level appropriateness
        if module.level == TrainingLevel.BEGINNER:
            reasons.append("Good foundation module")
        elif module.level == TrainingLevel.INTERMEDIATE:
            reasons.append("Builds on existing knowledge")
        
        return "; ".join(reasons) if reasons else "Recommended for skill development"

class KnowledgeRepository:
    """Manages the knowledge artifact repository"""
    
    def __init__(self, repository_path: str = "data/knowledge_repository"):
        self.repository_path = Path(repository_path)
        self.repository_path.mkdir(parents=True, exist_ok=True)
        self.artifacts: Dict[str, KnowledgeArtifact] = {}
        self.load_artifacts()

    def add_artifact(self, artifact: KnowledgeArtifact) -> bool:
        """Add a knowledge artifact to the repository"""
        try:
            self.artifacts[artifact.artifact_id] = artifact
            self.save_artifacts()
            logger.info(f"Added knowledge artifact: {artifact.artifact_id}")
            return True
        except Exception as e:
            logger.error(f"Error adding knowledge artifact: {str(e)}")
            return False

    def search_artifacts(self, query: str, artifact_type: Optional[KnowledgeType] = None,
                        tags: Optional[List[str]] = None) -> List[KnowledgeArtifact]:
        """Search for knowledge artifacts"""
        results = []
        query_lower = query.lower()
        
        for artifact in self.artifacts.values():
            # Filter by type if specified
            if artifact_type and artifact.artifact_type != artifact_type:
                continue
            
            # Filter by tags if specified
            if tags and not any(tag in artifact.tags for tag in tags):
                continue
            
            # Search in title, description, and content
            if (query_lower in artifact.title.lower() or
                query_lower in artifact.description.lower() or
                query_lower in artifact.content.lower() or
                any(query_lower in tag.lower() for tag in artifact.tags)):
                results.append(artifact)
        
        # Sort by relevance (title matches first, then description, then content)
        results.sort(key=lambda x: (
            query_lower not in x.title.lower(),
            query_lower not in x.description.lower(),
            query_lower not in x.content.lower()
        ))
        
        return results

    def get_artifacts_by_type(self, artifact_type: KnowledgeType) -> List[KnowledgeArtifact]:
        """Get all artifacts of a specific type"""
        return [artifact for artifact in self.artifacts.values() 
                if artifact.artifact_type == artifact_type]

    def get_related_artifacts(self, artifact_id: str) -> List[KnowledgeArtifact]:
        """Get artifacts related to a specific artifact"""
        if artifact_id not in self.artifacts:
            return []
        
        artifact = self.artifacts[artifact_id]
        related = []
        
        for related_id in artifact.related_artifacts:
            if related_id in self.artifacts:
                related.append(self.artifacts[related_id])
        
        return related

    def load_artifacts(self) -> None:
        """Load artifacts from repository"""
        try:
            artifacts_file = self.repository_path / "artifacts.json"
            if artifacts_file.exists():
                with open(artifacts_file, 'r', encoding='utf-8') as f:
                    artifacts_data = json.load(f)
                
                for artifact_id, artifact_data in artifacts_data.items():
                    artifact = self._dict_to_artifact(artifact_data)
                    self.artifacts[artifact_id] = artifact
                
                logger.info(f"Loaded {len(self.artifacts)} knowledge artifacts")
        except Exception as e:
            logger.error(f"Error loading knowledge artifacts: {str(e)}")

    def save_artifacts(self) -> None:
        """Save artifacts to repository"""
        try:
            artifacts_file = self.repository_path / "artifacts.json"
            artifacts_data = {}
            
            for artifact_id, artifact in self.artifacts.items():
                artifacts_data[artifact_id] = self._artifact_to_dict(artifact)
            
            with open(artifacts_file, 'w', encoding='utf-8') as f:
                json.dump(artifacts_data, f, indent=2, default=str)
            
            logger.info(f"Saved {len(self.artifacts)} knowledge artifacts")
        except Exception as e:
            logger.error(f"Error saving knowledge artifacts: {str(e)}")

    def _dict_to_artifact(self, data: Dict[str, Any]) -> KnowledgeArtifact:
        """Convert dictionary to KnowledgeArtifact"""
        return KnowledgeArtifact(
            artifact_id=data['artifact_id'],
            title=data['title'],
            description=data['description'],
            content=data['content'],
            artifact_type=KnowledgeType(data['artifact_type']),
            tags=data['tags'],
            created_by=data['created_by'],
            created_at=datetime.fromisoformat(data['created_at']),
            updated_at=datetime.fromisoformat(data['updated_at']),
            version=data['version'],
            related_artifacts=data['related_artifacts'],
            metadata=data['metadata']
        )

    def _artifact_to_dict(self, artifact: KnowledgeArtifact) -> Dict[str, Any]:
        """Convert KnowledgeArtifact to dictionary"""
        return {
            'artifact_id': artifact.artifact_id,
            'title': artifact.title,
            'description': artifact.description,
            'content': artifact.content,
            'artifact_type': artifact.artifact_type.value,
            'tags': artifact.tags,
            'created_by': artifact.created_by,
            'created_at': artifact.created_at.isoformat(),
            'updated_at': artifact.updated_at.isoformat(),
            'version': artifact.version,
            'related_artifacts': artifact.related_artifacts,
            'metadata': artifact.metadata
        }

class KnowledgeHub:
    """Main knowledge hub orchestrator"""
    
    def __init__(self, repository_path: str = "data/knowledge_repository"):
        self.content_generator = TrainingContentGenerator()
        self.learning_analytics = LearningAnalytics()
        self.knowledge_repository = KnowledgeRepository(repository_path)
        self.training_modules = self.content_generator.generate_training_modules()
        self.logger = logging.getLogger(__name__)

    def initialize_user(self, user_id: str, role: UserRole) -> UserExpertise:
        """Initialize user expertise tracking"""
        expertise = UserExpertise(
            user_id=user_id,
            role=role,
            expertise_areas=self._get_initial_expertise_areas(role)
        )
        
        self.learning_analytics.user_expertise[user_id] = expertise
        return expertise

    def get_training_modules_for_role(self, role: UserRole) -> List[TrainingModule]:
        """Get training modules suitable for a specific role"""
        return [module for module in self.training_modules 
                if role in module.target_roles]

    def get_learning_recommendations(self, user_id: str) -> List[LearningRecommendation]:
        """Get personalized learning recommendations for a user"""
        return self.learning_analytics.generate_learning_recommendations(
            user_id, self.training_modules
        )

    def update_learning_progress(self, user_id: str, module_id: str, 
                               progress_percentage: float, time_spent: int = 0,
                               assessment_score: Optional[float] = None) -> None:
        """Update user learning progress"""
        self.learning_analytics.update_user_progress(
            user_id, module_id, progress_percentage, time_spent, assessment_score
        )
        
        # Update expertise if module is completed
        if progress_percentage == 100 and user_id in self.learning_analytics.user_expertise:
            self._update_expertise_from_completion(user_id, module_id, assessment_score)

    def search_knowledge_base(self, query: str, artifact_type: Optional[KnowledgeType] = None,
                            tags: Optional[List[str]] = None) -> List[KnowledgeArtifact]:
        """Search the knowledge base"""
        return self.knowledge_repository.search_artifacts(query, artifact_type, tags)

    def add_knowledge_artifact(self, title: str, description: str, content: str,
                             artifact_type: KnowledgeType, created_by: str,
                             tags: Optional[List[str]] = None) -> str:
        """Add a new knowledge artifact"""
        artifact = KnowledgeArtifact(
            artifact_id=str(uuid.uuid4()),
            title=title,
            description=description,
            content=content,
            artifact_type=artifact_type,
            tags=tags or [],
            created_by=created_by
        )
        
        if self.knowledge_repository.add_artifact(artifact):
            return artifact.artifact_id
        else:
            raise Exception("Failed to add knowledge artifact")

    def get_user_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Get user dashboard data"""
        if user_id not in self.learning_analytics.user_expertise:
            return {}
        
        user_expertise = self.learning_analytics.user_expertise[user_id]
        progress = self.learning_analytics.user_progress.get(user_id, [])
        
        # Calculate statistics
        total_modules = len([m for m in self.training_modules 
                           if user_expertise.role in m.target_roles])
        completed_modules = len([p for p in progress if p.status == CompletionStatus.COMPLETED])
        in_progress_modules = len([p for p in progress if p.status == CompletionStatus.IN_PROGRESS])
        
        # Get recommendations
        recommendations = self.get_learning_recommendations(user_id)
        
        return {
            'user_id': user_id,
            'role': user_expertise.role.value,
            'total_modules': total_modules,
            'completed_modules': completed_modules,
            'in_progress_modules': in_progress_modules,
            'completion_percentage': (completed_modules / total_modules * 100) if total_modules > 0 else 0,
            'expertise_areas': user_expertise.expertise_areas,
            'recommendations': [
                {
                    'module_id': rec.recommended_module_id,
                    'reason': rec.reason,
                    'priority': rec.priority,
                    'estimated_impact': rec.estimated_impact,
                    'prerequisites_met': rec.prerequisites_met
                }
                for rec in recommendations
            ],
            'recent_activity': self._get_recent_activity(user_id)
        }

    def _get_initial_expertise_areas(self, role: UserRole) -> Dict[str, float]:
        """Get initial expertise areas for a role"""
        base_expertise = {
            UserRole.DATA_ANALYST: {
                "data_cleaning": 0.3,
                "data_validation": 0.2,
                "csv_processing": 0.4
            },
            UserRole.COMPLIANCE_SPECIALIST: {
                "cms_regulations": 0.4,
                "reporting_requirements": 0.3,
                "audit_trails": 0.2
            },
            UserRole.REGULATORY_EXPERT: {
                "regulatory_intelligence": 0.6,
                "rule_interpretation": 0.5,
                "guidance_analysis": 0.4
            },
            UserRole.TEAM_LEAD: {
                "team_management": 0.5,
                "project_coordination": 0.4,
                "quality_assurance": 0.3
            }
        }
        
        return base_expertise.get(role, {})

    def _update_expertise_from_completion(self, user_id: str, module_id: str, 
                                        assessment_score: Optional[float]) -> None:
        """Update user expertise based on completed module"""
        if user_id not in self.learning_analytics.user_expertise:
            return
        
        user_expertise = self.learning_analytics.user_expertise[user_id]
        
        # Find the completed module
        completed_module = None
        for module in self.training_modules:
            if module.module_id == module_id:
                completed_module = module
                break
        
        if not completed_module:
            return
        
        # Update expertise areas based on module tags
        expertise_increase = 0.1  # Base increase
        if assessment_score is not None:
            expertise_increase *= (assessment_score / 100)  # Scale by assessment score
        
        for tag in completed_module.tags:
            if tag in user_expertise.expertise_areas:
                user_expertise.expertise_areas[tag] = min(
                    user_expertise.expertise_areas[tag] + expertise_increase, 1.0
                )
            else:
                user_expertise.expertise_areas[tag] = expertise_increase
        
        # Add to completed modules
        user_expertise.completed_modules.add(module_id)
        user_expertise.last_updated = datetime.now()

    def _get_recent_activity(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent learning activity for a user"""
        progress = self.learning_analytics.user_progress.get(user_id, [])
        
        # Sort by last accessed and get recent activity
        recent_progress = sorted(progress, key=lambda x: x.last_accessed or datetime.min, reverse=True)[:5]
        
        activity = []
        for p in recent_progress:
            # Find module details
            module = None
            for m in self.training_modules:
                if m.module_id == p.module_id:
                    module = m
                    break
            
            if module:
                activity.append({
                    'module_id': p.module_id,
                    'module_title': module.title,
                    'progress_percentage': p.progress_percentage,
                    'status': p.status.value,
                    'last_accessed': p.last_accessed.isoformat() if p.last_accessed else None,
                    'time_spent': p.time_spent
                })
        
        return activity

# Example usage and testing
if __name__ == "__main__":
    # Initialize knowledge hub
    hub = KnowledgeHub()
    
    # Initialize a user
    user_expertise = hub.initialize_user("user123", UserRole.DATA_ANALYST)
    print(f"Initialized user: {user_expertise.user_id}, Role: {user_expertise.role.value}")
    
    # Get training modules for the user's role
    modules = hub.get_training_modules_for_role(UserRole.DATA_ANALYST)
    print(f"Available modules for data analyst: {len(modules)}")
    
    for module in modules:
        print(f"  - {module.title} ({module.level.value})")
    
    # Get learning recommendations
    recommendations = hub.get_learning_recommendations("user123")
    print(f"\nLearning recommendations: {len(recommendations)}")
    
    for rec in recommendations:
        print(f"  - {rec.recommended_module_id}: {rec.reason} (Priority: {rec.priority:.2f})")
    
    # Simulate learning progress
    hub.update_learning_progress("user123", "da_001", 50, time_spent=30)
    hub.update_learning_progress("user123", "da_001", 100, time_spent=45, assessment_score=85)
    
    # Get user dashboard
    dashboard = hub.get_user_dashboard("user123")
    print(f"\nUser Dashboard:")
    print(f"  Completion: {dashboard['completion_percentage']:.1f}%")
    print(f"  Completed: {dashboard['completed_modules']}")
    print(f"  In Progress: {dashboard['in_progress_modules']}")
    
    # Add a knowledge artifact
    artifact_id = hub.add_knowledge_artifact(
        title="CMS Data Quality Best Practices",
        description="Best practices for maintaining data quality in CMS reporting",
        content="Detailed content about data quality practices...",
        artifact_type=KnowledgeType.BEST_PRACTICE,
        created_by="user123",
        tags=["data_quality", "best_practices", "cms"]
    )
    print(f"\nAdded knowledge artifact: {artifact_id}")
    
    # Search knowledge base
    search_results = hub.search_knowledge_base("data quality")
    print(f"Search results: {len(search_results)}")
    
    for result in search_results:
        print(f"  - {result.title} ({result.artifact_type.value})")
