from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.flow_instance import FlowStatus, TaskStatus, ActivityType


# FormDataValue Schemas
class FormDataValueBase(BaseModel):
    form_field_id: int
    value: Any  # JSON value - can be string, number, boolean, etc.


class FormDataValueCreate(FormDataValueBase):
    pass


class FormDataValueResponse(FormDataValueBase):
    id: int
    task_instance_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# TaskInstance Schemas
class TaskInstanceBase(BaseModel):
    stage_id: int
    assignee_id: int
    status: TaskStatus = TaskStatus.PENDING


class TaskInstanceCreate(TaskInstanceBase):
    flow_instance_id: int


class TaskInstanceUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    assignee_id: Optional[int] = None


class TaskInstanceResponse(TaskInstanceBase):
    id: int
    flow_instance_id: int
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    form_data_values: List[FormDataValueResponse] = []

    class Config:
        from_attributes = True


# Forward declaration for circular reference
class FlowInstanceSummary(BaseModel):
    """Simplified flow instance info for task responses"""
    id: int
    flow_template_id: int
    title: str
    description: Optional[str] = None
    status: FlowStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    flow_template: Optional[Any] = None  # Will contain flow template basic info

    class Config:
        from_attributes = True


class StageSummary(BaseModel):
    """Simplified stage info for task responses"""
    id: int
    name: str
    order: int

    class Config:
        from_attributes = True


# TaskInstance response with stage and flow info (for "My Tasks" view)
class TaskInstanceDetailResponse(TaskInstanceResponse):
    stage_name: str
    flow_title: str
    flow_template_name: str
    elapsed_time_seconds: Optional[int] = None  # Calculated field
    flow_instance: Optional[FlowInstanceSummary] = None  # Full flow instance object
    stage: Optional[StageSummary] = None  # Stage object


# ActivityLog Schemas
class ActivityLogBase(BaseModel):
    activity_type: ActivityType
    actor_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None


class ActivityLogCreate(ActivityLogBase):
    flow_instance_id: int


class ActivityLogResponse(ActivityLogBase):
    id: int
    flow_instance_id: int
    created_at: datetime

    class Config:
        from_attributes = True


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
    current_stage_id: Optional[int] = None
    current_assignee_id: Optional[int] = None


class FlowInstanceResponse(FlowInstanceBase):
    id: int
    flow_template_id: int
    status: FlowStatus
    current_stage_id: Optional[int] = None
    current_assignee_id: Optional[int] = None
    initiator_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    tasks: List[TaskInstanceResponse] = []
    activity_logs: List[ActivityLogResponse] = []

    class Config:
        from_attributes = True


# FlowInstance response with calculated fields and nested data
class FlowInstanceDetailResponse(FlowInstanceResponse):
    flow_template_name: str
    current_stage_name: Optional[str] = None
    current_assignee_email: Optional[str] = None
    initiator_email: str
    elapsed_time_seconds: Optional[int] = None  # Calculated field


# Simplified response for listing flow instances
class FlowInstanceListResponse(BaseModel):
    id: int
    flow_template_id: int
    flow_template_name: str
    title: str
    description: Optional[str] = None
    status: FlowStatus
    current_stage_name: Optional[str] = None
    current_assignee_email: Optional[str] = None
    initiator_email: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    elapsed_time_seconds: Optional[int] = None

    class Config:
        from_attributes = True


# Task completion request schema
class TaskCompleteRequest(BaseModel):
    form_data: Dict[int, Any] = Field(
        description="Form data keyed by form_field_id"
    )


# Task completion response (returns updated flow instance)
class TaskCompleteResponse(BaseModel):
    flow_instance: FlowInstanceDetailResponse
    message: str
