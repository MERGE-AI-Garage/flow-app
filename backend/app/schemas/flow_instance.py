from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.flow_instance import FlowStatus, TaskStatus, CompletionAction, ActivityType


# FlowInstance Schemas
class FlowInstanceBase(BaseModel):
    title: str
    description: Optional[str] = None


class FlowInstanceCreate(FlowInstanceBase):
    flow_template_id: int


class FlowInstanceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[FlowStatus] = None


class FlowInstanceListItem(FlowInstanceBase):
    """Simplified flow instance for list views"""
    id: int
    flow_template_id: int
    status: FlowStatus
    current_stage_id: Optional[int]
    current_assignee_id: Optional[int]
    initiated_by_id: int
    started_at: datetime
    completed_at: Optional[datetime]
    elapsed_seconds: int  # Calculated field

    class Config:
        from_attributes = True


class FlowInstanceResponse(FlowInstanceBase):
    """Full flow instance details with nested relationships"""
    id: int
    flow_template_id: int
    status: FlowStatus
    current_stage_id: Optional[int]
    current_assignee_id: Optional[int]
    initiated_by_id: int
    started_at: datetime
    completed_at: Optional[datetime]
    total_elapsed_seconds: int
    elapsed_seconds: int  # Calculated field
    created_at: datetime
    updated_at: datetime

    # Nested relationships (populated via relationships)
    current_stage: Optional[Any] = None  # StageResponse from flow schemas
    current_assignee: Optional[Any] = None  # UserResponse
    initiated_by: Optional[Any] = None  # UserResponse

    class Config:
        from_attributes = True


# TaskInstance Schemas
class TaskInstanceBase(BaseModel):
    flow_instance_id: int
    stage_id: int
    assignee_id: int


class TaskInstanceCreate(TaskInstanceBase):
    pass


class TaskInstanceUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    completion_action: Optional[CompletionAction] = None


class TaskListItem(BaseModel):
    """Simplified task for 'My Tasks' list view"""
    id: int
    flow_instance_id: int
    flow_title: str
    flow_template_name: str
    stage_id: int
    stage_name: str
    stage_order: int
    assignee_id: int
    status: TaskStatus
    started_at: Optional[datetime]
    elapsed_seconds: int  # Time spent on this specific task
    flow_elapsed_seconds: int  # Total flow elapsed time

    class Config:
        from_attributes = True


class TaskResponse(TaskInstanceBase):
    """Full task details for task detail view"""
    id: int
    status: TaskStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    elapsed_seconds: int
    completion_action: Optional[CompletionAction]
    created_at: datetime
    updated_at: datetime

    # Nested relationships
    flow_instance: Optional[Any] = None  # FlowInstanceResponse
    stage: Optional[Any] = None  # StageResponse with form_fields
    assignee: Optional[Any] = None  # UserResponse

    class Config:
        from_attributes = True


# Form Data Schemas
class FormDataSubmission(BaseModel):
    """Form field values submitted for a stage"""
    field_values: Dict[int, Any]  # Map of form_field_id → value


class FormDataValueResponse(BaseModel):
    """Individual form field value"""
    id: int
    form_field_id: int
    task_instance_id: int
    value: Any  # JSON field, can be string, number, list, etc.
    field_label: str  # Joined from form_field
    field_type: str  # Joined from form_field
    created_at: datetime

    class Config:
        from_attributes = True


class StageFormDataResponse(BaseModel):
    """All form data for a specific stage"""
    stage_id: int
    stage_name: str
    field_values: List[FormDataValueResponse]


# Activity Log Schemas
class ActivityLogBase(BaseModel):
    action_type: ActivityType
    description: str
    meta: Optional[Dict[str, Any]] = None


class ActivityLogCreate(ActivityLogBase):
    flow_instance_id: int
    user_id: int


class ActivityLogResponse(ActivityLogBase):
    id: int
    flow_instance_id: int
    user_id: int
    created_at: datetime

    # Nested relationships
    user: Optional[Any] = None  # UserResponse

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    """Create a comment activity log"""
    description: str


# Action Request Schemas
class CompleteStageRequest(BaseModel):
    """Request to complete current stage and handoff to next"""
    field_values: Dict[int, Any]  # form_field_id → value mapping
    comment: Optional[str] = None


class ApprovalActionRequest(BaseModel):
    """Request for approval or rejection (approval stages only)"""
    action: CompletionAction  # APPROVE or REQUEST_CHANGES
    comment: Optional[str] = None
    field_values: Optional[Dict[int, Any]] = None  # Optional additional data


class ReassignTaskRequest(BaseModel):
    """Request to reassign task to another user"""
    new_assignee_id: int
    reason: Optional[str] = None


class DelegateTaskRequest(BaseModel):
    """Request to delegate task to another user"""
    delegate_to_id: int
    reason: Optional[str] = None
