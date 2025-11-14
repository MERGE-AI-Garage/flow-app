from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class FlowStatus(str, enum.Enum):
    """Flow instance status as defined in the PRD"""
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"
    STALLED = "stalled"


class TaskStatus(str, enum.Enum):
    """Task instance status for individual stage tracking"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class CompletionAction(str, enum.Enum):
    """Action taken to complete a task"""
    COMPLETE = "complete"
    APPROVE = "approve"
    REQUEST_CHANGES = "request_changes"
    DELEGATE = "delegate"


class ActivityType(str, enum.Enum):
    """Types of activities that can be logged"""
    FLOW_STARTED = "flow_started"
    STAGE_COMPLETED = "stage_completed"
    STAGE_APPROVED = "stage_approved"
    STAGE_REJECTED = "stage_rejected"
    TASK_REASSIGNED = "task_reassigned"
    TASK_DELEGATED = "task_delegated"
    COMMENT_ADDED = "comment_added"
    FLOW_COMPLETED = "flow_completed"
    FLOW_TERMINATED = "flow_terminated"


class FlowInstance(Base):
    """Flow Instance model representing a running workflow"""
    __tablename__ = "flow_instances"

    id = Column(Integer, primary_key=True, index=True)
    flow_template_id = Column(Integer, ForeignKey('flow_templates.id'), nullable=False)

    # Basic info
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Current state
    current_stage_id = Column(Integer, ForeignKey('stages.id'), nullable=True)
    current_assignee_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    status = Column(Enum(FlowStatus), nullable=False, default=FlowStatus.ACTIVE)

    # Tracking
    initiated_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_elapsed_seconds = Column(Integer, default=0, nullable=False)  # Cached for completed flows

    # Relationships
    flow_template = relationship("FlowTemplate")
    current_stage = relationship("Stage", foreign_keys=[current_stage_id])
    current_assignee = relationship("User", foreign_keys=[current_assignee_id])
    initiated_by = relationship("User", foreign_keys=[initiated_by_id])
    task_instances = relationship("TaskInstance", back_populates="flow_instance", cascade="all, delete-orphan")
    form_values = relationship("FormDataValue", back_populates="flow_instance", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="flow_instance", cascade="all, delete-orphan", order_by="ActivityLog.created_at.desc()")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<FlowInstance(id={self.id}, title={self.title}, status={self.status})>"


class TaskInstance(Base):
    """Task Instance model tracking individual stage assignments"""
    __tablename__ = "task_instances"

    id = Column(Integer, primary_key=True, index=True)
    flow_instance_id = Column(Integer, ForeignKey('flow_instances.id', ondelete='CASCADE'), nullable=False)
    stage_id = Column(Integer, ForeignKey('stages.id'), nullable=False)
    assignee_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Tracking
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    elapsed_seconds = Column(Integer, default=0, nullable=False)
    completion_action = Column(Enum(CompletionAction), nullable=True)

    # Relationships
    flow_instance = relationship("FlowInstance", back_populates="task_instances")
    stage = relationship("Stage")
    assignee = relationship("User")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<TaskInstance(id={self.id}, stage_id={self.stage_id}, assignee_id={self.assignee_id}, status={self.status})>"


class FormDataValue(Base):
    """Form Data Value model storing submitted form field values"""
    __tablename__ = "form_data_values"

    id = Column(Integer, primary_key=True, index=True)
    flow_instance_id = Column(Integer, ForeignKey('flow_instances.id', ondelete='CASCADE'), nullable=False)
    form_field_id = Column(Integer, ForeignKey('form_fields.id'), nullable=False)
    task_instance_id = Column(Integer, ForeignKey('task_instances.id', ondelete='CASCADE'), nullable=False)

    # Value stored as JSON for flexibility (supports strings, numbers, arrays for attachments, etc.)
    value = Column(JSON, nullable=False)

    # Relationships
    flow_instance = relationship("FlowInstance", back_populates="form_values")
    form_field = relationship("FormField")
    task_instance = relationship("TaskInstance")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<FormDataValue(id={self.id}, form_field_id={self.form_field_id})>"


class ActivityLog(Base):
    """Activity Log model for audit trail of flow actions"""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    flow_instance_id = Column(Integer, ForeignKey('flow_instances.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Activity details
    action_type = Column(Enum(ActivityType), nullable=False)
    description = Column(Text, nullable=False)  # Human-readable action description
    meta = Column(JSON, nullable=True)  # Additional structured data (previous assignee, stage names, etc.)

    # Relationships
    flow_instance = relationship("FlowInstance", back_populates="activity_logs")
    user = relationship("User")

    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, action_type={self.action_type})>"
