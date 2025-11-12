from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from ..models.flow import AssignmentType, FieldType


# FormField Schemas
class FormFieldBase(BaseModel):
    field_type: FieldType
    label: str
    required: bool = False
    order: int


class FormFieldCreate(FormFieldBase):
    pass


class FormFieldUpdate(BaseModel):
    field_type: Optional[FieldType] = None
    label: Optional[str] = None
    required: Optional[bool] = None
    order: Optional[int] = None


class FormFieldResponse(FormFieldBase):
    id: int
    stage_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Stage Schemas
class StageBase(BaseModel):
    name: str
    order: int
    description: Optional[str] = None
    assignment_type: AssignmentType
    assignment_target_id: Optional[int] = None
    is_approval_stage: bool = False


class StageCreate(StageBase):
    form_fields: List[FormFieldCreate] = []


class StageUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    description: Optional[str] = None
    assignment_type: Optional[AssignmentType] = None
    assignment_target_id: Optional[int] = None
    is_approval_stage: Optional[bool] = None


class StageResponse(StageBase):
    id: int
    flow_template_id: int
    form_fields: List[FormFieldResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# FlowRole Schemas
class FlowRoleBase(BaseModel):
    name: str


class FlowRoleCreate(FlowRoleBase):
    user_ids: List[int] = []


class FlowRoleUpdate(BaseModel):
    name: Optional[str] = None
    user_ids: Optional[List[int]] = None


class FlowRoleResponse(FlowRoleBase):
    id: int
    flow_template_id: int
    user_ids: List[int] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# FlowTemplate Schemas
class FlowTemplateBase(BaseModel):
    name: str = "Untitled Flow"
    description: Optional[str] = None
    is_active: bool = True


class FlowTemplateCreate(FlowTemplateBase):
    pass


class FlowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FlowTemplateResponse(FlowTemplateBase):
    id: int
    stages: List[StageResponse] = []
    roles: List[FlowRoleResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Simplified response for listing (without nested data)
class FlowTemplateListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    stage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Bulk update schema for stages (used when reordering or updating multiple stages)
class StagesBulkUpdate(BaseModel):
    stages: List[StageUpdate]
