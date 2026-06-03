"""
Knowledge Nexus Framework™ - Workflow Management Service

This service provides guided, end-to-end workflow management:
- Automated Pipeline: Orchestrate entire CMS reporting process
- Guided Remediation: Present guided workflows for flagged transactions
- Audit Trail: Log every user action and decision
"""

import asyncio
import logging
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import hashlib
from pathlib import Path
import yaml

# LLM service integration
try:
    import openai
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    logging.warning("OpenAI not available. Install with: pip install openai")

logger = logging.getLogger(__name__)

class WorkflowStatus(Enum):
    """Workflow execution status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class StepStatus(Enum):
    """Individual step status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class ActionType(Enum):
    """Types of user actions"""
    DATA_UPLOAD = "data_upload"
    DATA_CLEANING = "data_cleaning"
    DATA_VALIDATION = "data_validation"
    RULE_APPLICATION = "rule_application"
    FLAG_REVIEW = "flag_review"
    CORRECTION = "correction"
    APPROVAL = "approval"
    SUBMISSION = "submission"
    COMMENT = "comment"

@dataclass
class WorkflowStep:
    """Represents a step in the workflow"""
    step_id: str
    name: str
    description: str
    step_type: str
    status: StepStatus = StepStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class WorkflowAction:
    """Represents a user action in the workflow"""
    action_id: str
    user_id: str
    action_type: ActionType
    timestamp: datetime
    description: str
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    step_id: Optional[str] = None
    workflow_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class WorkflowInstance:
    """Represents a workflow execution instance"""
    workflow_id: str
    name: str
    description: str
    status: WorkflowStatus
    created_by: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    steps: List[WorkflowStep] = field(default_factory=list)
    actions: List[WorkflowAction] = field(default_factory=list)
    current_step: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class RemediationGuidance:
    """Guidance for remediating flagged transactions"""
    flag_id: str
    issue_type: str
    severity: str
    description: str
    rule_citation: str
    suggested_fix: str
    llm_explanation: str
    related_documents: List[str] = field(default_factory=list)
    examples: List[Dict[str, Any]] = field(default_factory=list)
    confidence_score: float = 1.0

class LLMService:
    """Service for generating explanations using LLM"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-3.5-turbo"):
        self.api_key = api_key
        self.model = model
        self.available = LLM_AVAILABLE and api_key is not None
        
        if self.available:
            openai.api_key = api_key

    async def explain_rule_violation(self, rule_id: str, violation_data: Dict[str, Any], 
                                   context: Dict[str, Any]) -> str:
        """Generate explanation for rule violation using LLM"""
        if not self.available:
            return self._generate_fallback_explanation(rule_id, violation_data)
        
        try:
            prompt = self._build_explanation_prompt(rule_id, violation_data, context)
            
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a CMS compliance expert. Explain rule violations clearly and provide actionable guidance."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating LLM explanation: {str(e)}")
            return self._generate_fallback_explanation(rule_id, violation_data)

    def _build_explanation_prompt(self, rule_id: str, violation_data: Dict[str, Any], 
                                context: Dict[str, Any]) -> str:
        """Build prompt for LLM explanation"""
        prompt = f"""
        Explain this CMS compliance rule violation:
        
        Rule ID: {rule_id}
        Violation Data: {json.dumps(violation_data, indent=2)}
        Context: {json.dumps(context, indent=2)}
        
        Please provide:
        1. A clear explanation of why this is a violation
        2. The specific rule or regulation being violated
        3. Step-by-step guidance on how to fix the issue
        4. Best practices to prevent similar violations
        
        Keep the explanation concise but comprehensive.
        """
        return prompt

    def _generate_fallback_explanation(self, rule_id: str, violation_data: Dict[str, Any]) -> str:
        """Generate fallback explanation when LLM is not available"""
        return f"""
        Rule Violation Explanation:
        
        Rule ID: {rule_id}
        Issue: Data validation failed for the following fields: {list(violation_data.keys())}
        
        This violation indicates that the submitted data does not meet CMS compliance requirements.
        Please review the flagged fields and ensure they contain valid, complete information
        according to the applicable CMS regulations.
        
        For detailed guidance, consult the CMS Open Payments Program guidance documents
        or contact your compliance team.
        """

class AuditTrail:
    """Manages immutable audit trail for compliance"""
    
    def __init__(self, audit_path: str = "data/audit_trail"):
        self.audit_path = Path(audit_path)
        self.audit_path.mkdir(parents=True, exist_ok=True)
        self.audit_file = self.audit_path / "audit_log.jsonl"
        self.logger = logging.getLogger(__name__)

    def log_action(self, action: WorkflowAction) -> None:
        """Log a user action to the audit trail"""
        try:
            audit_entry = {
                'action_id': action.action_id,
                'user_id': action.user_id,
                'action_type': action.action_type.value,
                'timestamp': action.timestamp.isoformat(),
                'description': action.description,
                'step_id': action.step_id,
                'workflow_id': action.workflow_id,
                'input_hash': self._hash_data(action.input_data),
                'output_hash': self._hash_data(action.output_data),
                'metadata': action.metadata
            }
            
            # Append to audit log file
            with open(self.audit_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(audit_entry) + '\n')
            
            self.logger.info(f"Logged action {action.action_id} for user {action.user_id}")
            
        except Exception as e:
            self.logger.error(f"Error logging action to audit trail: {str(e)}")

    def get_audit_trail(self, workflow_id: Optional[str] = None, 
                       user_id: Optional[str] = None,
                       start_date: Optional[datetime] = None,
                       end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Retrieve audit trail entries"""
        entries = []
        
        try:
            if not self.audit_file.exists():
                return entries
            
            with open(self.audit_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        
                        # Apply filters
                        if workflow_id and entry.get('workflow_id') != workflow_id:
                            continue
                        if user_id and entry.get('user_id') != user_id:
                            continue
                        
                        entry_timestamp = datetime.fromisoformat(entry['timestamp'])
                        if start_date and entry_timestamp < start_date:
                            continue
                        if end_date and entry_timestamp > end_date:
                            continue
                        
                        entries.append(entry)
                        
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            self.logger.error(f"Error retrieving audit trail: {str(e)}")
        
        return entries

    def _hash_data(self, data: Dict[str, Any]) -> str:
        """Generate hash for data integrity"""
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()

class WorkflowOrchestrator:
    """Orchestrates the entire CMS reporting workflow"""
    
    def __init__(self, llm_api_key: Optional[str] = None):
        self.llm_service = LLMService(llm_api_key)
        self.audit_trail = AuditTrail()
        self.workflows: Dict[str, WorkflowInstance] = {}
        self.logger = logging.getLogger(__name__)

    def create_workflow(self, name: str, description: str, created_by: str, 
                       workflow_template: str = "standard_cms_reporting") -> WorkflowInstance:
        """Create a new workflow instance"""
        workflow_id = str(uuid.uuid4())
        
        # Define standard CMS reporting workflow steps
        steps = self._get_workflow_steps(workflow_template)
        
        workflow = WorkflowInstance(
            workflow_id=workflow_id,
            name=name,
            description=description,
            status=WorkflowStatus.PENDING,
            created_by=created_by,
            created_at=datetime.now(),
            steps=steps
        )
        
        self.workflows[workflow_id] = workflow
        
        # Log workflow creation
        action = WorkflowAction(
            action_id=str(uuid.uuid4()),
            user_id=created_by,
            action_type=ActionType.DATA_UPLOAD,
            timestamp=datetime.now(),
            description=f"Created workflow: {name}",
            workflow_id=workflow_id
        )
        self.audit_trail.log_action(action)
        
        self.logger.info(f"Created workflow {workflow_id}: {name}")
        return workflow

    async def execute_workflow(self, workflow_id: str) -> WorkflowInstance:
        """Execute a workflow"""
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        workflow.status = WorkflowStatus.IN_PROGRESS
        workflow.started_at = datetime.now()
        
        self.logger.info(f"Starting workflow execution: {workflow_id}")
        
        try:
            # Execute steps in order
            for step in workflow.steps:
                if step.status == StepStatus.PENDING:
                    await self._execute_step(workflow, step)
                    
                    # Check if workflow should continue
                    if step.status == StepStatus.FAILED:
                        workflow.status = WorkflowStatus.FAILED
                        break
            
            # Mark workflow as completed if all steps succeeded
            if workflow.status == WorkflowStatus.IN_PROGRESS:
                workflow.status = WorkflowStatus.COMPLETED
                workflow.completed_at = datetime.now()
            
            self.logger.info(f"Workflow {workflow_id} completed with status: {workflow.status.value}")
            
        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            self.logger.error(f"Error executing workflow {workflow_id}: {str(e)}")
        
        return workflow

    async def _execute_step(self, workflow: WorkflowInstance, step: WorkflowStep) -> None:
        """Execute a single workflow step"""
        step.status = StepStatus.RUNNING
        step.start_time = datetime.now()
        workflow.current_step = step.step_id
        
        self.logger.info(f"Executing step: {step.name}")
        
        try:
            # Execute step based on type
            if step.step_type == "data_upload":
                await self._execute_data_upload_step(workflow, step)
            elif step.step_type == "data_cleaning":
                await self._execute_data_cleaning_step(workflow, step)
            elif step.step_type == "data_validation":
                await self._execute_data_validation_step(workflow, step)
            elif step.step_type == "rule_application":
                await self._execute_rule_application_step(workflow, step)
            elif step.step_type == "flag_review":
                await self._execute_flag_review_step(workflow, step)
            elif step.step_type == "report_generation":
                await self._execute_report_generation_step(workflow, step)
            else:
                raise ValueError(f"Unknown step type: {step.step_type}")
            
            step.status = StepStatus.COMPLETED
            
        except Exception as e:
            step.status = StepStatus.FAILED
            step.error_message = str(e)
            self.logger.error(f"Error executing step {step.step_id}: {str(e)}")
        
        finally:
            step.end_time = datetime.now()
            if step.start_time:
                step.duration = (step.end_time - step.start_time).total_seconds()

    async def _execute_data_upload_step(self, workflow: WorkflowInstance, step: WorkflowStep) -> None:
        """Execute data upload step"""
        # Simulate data upload processing
        await asyncio.sleep(1)
        step.output_data = {
            'records_uploaded': 1000,
            'file_size': '2.5MB',
            'upload_time': datetime.now().isoformat()
        }

    async def _execute_data_cleaning_step(self, workflow: WorkflowInstance, step: WorkflowStep) -> None:
        """Execute data cleaning step"""
        # Simulate data cleaning
        await asyncio.sleep(2)
        step.output_data = {
            'records_cleaned': 1000,
            'duplicates_removed': 25,
            'quality_score': 0.95
        }

    async def _execute_data_validation_step(self, workflow: WorkflowInstance, step: WorkflowStep) -> None:
        """Execute data validation step"""
        # Simulate data validation
        await asyncio.sleep(1.5)
        step.output_data = {
            'records_validated': 975,
            'validation_errors': 15,
            'validation_warnings': 10
        }

    async def _execute_rule_application_step(self, workflow: WorkflowInstance, step: WorkflowStep) -> None:
        """Execute rule application step"""
        # Simulate rule application
        await asyncio.sleep(2)
        step.output_data = {
            'rules_applied': 50,
            'flags_generated': 25,
            'compliance_score': 0.92
        }

    async def _execute_flag_review_step(self, workflow: WorkflowInstance, step: WorkflowStep) -> None:
        """Execute flag review step"""
        # Simulate flag review
        await asyncio.sleep(1)
        step.output_data = {
            'flags_reviewed': 25,
            'flags_resolved': 20,
            'flags_remaining': 5
        }

    async def _execute_report_generation_step(self, workflow: WorkflowInstance, step: WorkflowStep) -> None:
        """Execute report generation step"""
        # Simulate report generation
        await asyncio.sleep(1)
        step.output_data = {
            'report_generated': True,
            'report_size': '1.2MB',
            'submission_ready': True
        }

    def _get_workflow_steps(self, template: str) -> List[WorkflowStep]:
        """Get workflow steps based on template"""
        if template == "standard_cms_reporting":
            return [
                WorkflowStep(
                    step_id="upload",
                    name="Data Upload",
                    description="Upload CSV data files",
                    step_type="data_upload"
                ),
                WorkflowStep(
                    step_id="cleaning",
                    name="Data Cleaning",
                    description="Clean and standardize data",
                    step_type="data_cleaning",
                    dependencies=["upload"]
                ),
                WorkflowStep(
                    step_id="validation",
                    name="Data Validation",
                    description="Validate data integrity",
                    step_type="data_validation",
                    dependencies=["cleaning"]
                ),
                WorkflowStep(
                    step_id="rules",
                    name="Rule Application",
                    description="Apply CMS compliance rules",
                    step_type="rule_application",
                    dependencies=["validation"]
                ),
                WorkflowStep(
                    step_id="review",
                    name="Flag Review",
                    description="Review and resolve flags",
                    step_type="flag_review",
                    dependencies=["rules"]
                ),
                WorkflowStep(
                    step_id="report",
                    name="Report Generation",
                    description="Generate final report",
                    step_type="report_generation",
                    dependencies=["review"]
                )
            ]
        
        return []

    async def generate_remediation_guidance(self, flag_id: str, issue_type: str, 
                                          violation_data: Dict[str, Any],
                                          rule_context: Dict[str, Any]) -> RemediationGuidance:
        """Generate guided remediation for flagged transactions"""
        
        # Generate LLM explanation
        llm_explanation = await self.llm_service.explain_rule_violation(
            rule_id=rule_context.get('rule_id', 'unknown'),
            violation_data=violation_data,
            context=rule_context
        )
        
        # Create remediation guidance
        guidance = RemediationGuidance(
            flag_id=flag_id,
            issue_type=issue_type,
            severity=violation_data.get('severity', 'warning'),
            description=violation_data.get('description', ''),
            rule_citation=rule_context.get('rule_citation', ''),
            suggested_fix=violation_data.get('suggested_fix', ''),
            llm_explanation=llm_explanation,
            related_documents=rule_context.get('related_documents', []),
            examples=rule_context.get('examples', []),
            confidence_score=violation_data.get('confidence_score', 1.0)
        )
        
        return guidance

    def log_user_action(self, user_id: str, action_type: ActionType, 
                       description: str, workflow_id: Optional[str] = None,
                       step_id: Optional[str] = None, 
                       input_data: Optional[Dict[str, Any]] = None,
                       output_data: Optional[Dict[str, Any]] = None) -> str:
        """Log a user action"""
        action = WorkflowAction(
            action_id=str(uuid.uuid4()),
            user_id=user_id,
            action_type=action_type,
            timestamp=datetime.now(),
            description=description,
            step_id=step_id,
            workflow_id=workflow_id,
            input_data=input_data or {},
            output_data=output_data or {}
        )
        
        self.audit_trail.log_action(action)
        return action.action_id

    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow status and progress"""
        if workflow_id not in self.workflows:
            return None
        
        workflow = self.workflows[workflow_id]
        
        completed_steps = len([s for s in workflow.steps if s.status == StepStatus.COMPLETED])
        total_steps = len(workflow.steps)
        progress = (completed_steps / total_steps) * 100 if total_steps > 0 else 0
        
        return {
            'workflow_id': workflow_id,
            'name': workflow.name,
            'status': workflow.status.value,
            'progress': progress,
            'current_step': workflow.current_step,
            'completed_steps': completed_steps,
            'total_steps': total_steps,
            'created_at': workflow.created_at.isoformat(),
            'started_at': workflow.started_at.isoformat() if workflow.started_at else None,
            'completed_at': workflow.completed_at.isoformat() if workflow.completed_at else None
        }

    def get_workflow_audit_trail(self, workflow_id: str) -> List[Dict[str, Any]]:
        """Get audit trail for a specific workflow"""
        return self.audit_trail.get_audit_trail(workflow_id=workflow_id)

# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_workflow_manager():
        # Initialize workflow manager
        orchestrator = WorkflowOrchestrator()
        
        # Create a workflow
        workflow = orchestrator.create_workflow(
            name="Q1 2024 CMS Reporting",
            description="Quarterly CMS Open Payments reporting for Q1 2024",
            created_by="user123"
        )
        
        print(f"Created workflow: {workflow.workflow_id}")
        
        # Log some user actions
        action_id1 = orchestrator.log_user_action(
            user_id="user123",
            action_type=ActionType.DATA_UPLOAD,
            description="Uploaded Q1 2024 payment data",
            workflow_id=workflow.workflow_id
        )
        
        action_id2 = orchestrator.log_user_action(
            user_id="user123",
            action_type=ActionType.COMMENT,
            description="Reviewed data quality issues",
            workflow_id=workflow.workflow_id
        )
        
        print(f"Logged actions: {action_id1}, {action_id2}")
        
        # Execute workflow
        result = await orchestrator.execute_workflow(workflow.workflow_id)
        
        print(f"Workflow completed with status: {result.status.value}")
        
        # Get workflow status
        status = orchestrator.get_workflow_status(workflow.workflow_id)
        print(f"Final status: {status}")
        
        # Get audit trail
        audit_trail = orchestrator.get_workflow_audit_trail(workflow.workflow_id)
        print(f"Audit trail entries: {len(audit_trail)}")
        
        # Test remediation guidance
        guidance = await orchestrator.generate_remediation_guidance(
            flag_id="flag123",
            issue_type="missing_npi",
            violation_data={
                'severity': 'error',
                'description': 'Missing NPI for covered recipient',
                'suggested_fix': 'Provide valid 10-digit NPI'
            },
            rule_context={
                'rule_id': 'rule_npi_required',
                'rule_citation': '42 CFR 403.904(c)',
                'related_documents': ['CMS Guidance Document 2024-01']
            }
        )
        
        print(f"Generated guidance for flag: {guidance.flag_id}")
        print(f"LLM Explanation: {guidance.llm_explanation[:100]}...")
    
    # Run the test
    asyncio.run(test_workflow_manager())
