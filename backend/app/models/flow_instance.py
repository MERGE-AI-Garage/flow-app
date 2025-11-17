from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class FlowStatus(str, enum.Enum):
    """Flow instance status"""
    ACTIVE = "active"
    COMPLETED = "completed"
    STALLED = "stalled"
    TERMINATED = "terminated"


class TaskStatus(str, enum.Enum):
    """Task instance status"""
    PENDING = "pending"
    COMPLETED = "completed"
    REJECTED = "rejected"


class ActivityType(str, enum.Enum):
    """Activity log event types"""
    FLOW_STARTED = "flow_started"
    STAGE_COMPLETED = "stage_completed"
    STAGE_REJECTED = "stage_rejected"
    TASK_ASSIGNED = "task_assigned"
    TASK_REASSIGNED = "task_reassigned"
    FLOW_COMPLETED = "flow_completed"
    FLOW_TERMINATED = "flow_terminated"


class FlowInstance(Base):
    """Flow instance model representing a running workflow"""
    __tablename__ = "flow_instances"

    id = Column(Integer, primary_key=True, index=True)
    flow_template_id = Column(Integer, ForeignKey('flow_templates.id', ondelete='CASCADE'), nullable=False)
    title = Column(String, nullable=False)  # User-provided title for this instance
    description = Column(Text, nullable=True)

    # Status tracking
    status = Column(Enum(FlowStatus), default=FlowStatus.ACTIVE, nullable=False, index=True)
    current_stage_id = Column(Integer, ForeignKey('stages.id'), nullable=True)
    current_assignee_id = Column(Integer, ForeignKey('users.id'), nullable=True)

    # User who initiated this flow
    initiator_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    flow_template = relationship("FlowTemplate", foreign_keys=[flow_template_id])
    current_stage = relationship("Stage", foreign_keys=[current_stage_id])
    current_assignee = relationship("User", foreign_keys=[current_assignee_id])
    initiator = relationship("User", foreign_keys=[initiator_id])
    tasks = relationship("TaskInstance", back_populates="flow_instance", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="flow_instance", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FlowInstance(id={self.id}, title={self.title}, status={self.status})>"


class TaskInstance(Base):
    """Task instance model representing a single stage assignment"""
    __tablename__ = "task_instances"

    id = Column(Integer, primary_key=True, index=True)
    flow_instance_id = Column(Integer, ForeignKey('flow_instances.id', ondelete='CASCADE'), nullable=False)
    stage_id = Column(Integer, ForeignKey('stages.id'), nullable=False)
    assignee_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Status tracking
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False, index=True)

    # Timestamps
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    flow_instance = relationship("FlowInstance", back_populates="tasks")
    stage = relationship("Stage")
    assignee = relationship("User")
    form_data_values = relationship("FormDataValue", back_populates="task_instance", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TaskInstance(id={self.id}, stage={self.stage_id}, assignee={self.assignee_id}, status={self.status})>"


class FormDataValue(Base):
    """Form data value model storing form submissions for each task"""
    __tablename__ = "form_data_values"

    id = Column(Integer, primary_key=True, index=True)
    task_instance_id = Column(Integer, ForeignKey('task_instances.id', ondelete='CASCADE'), nullable=False)
    form_field_id = Column(Integer, ForeignKey('form_fields.id'), nullable=False)

    # Value stored as JSON to handle different field types
    value = Column(JSON, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    task_instance = relationship("TaskInstance", back_populates="form_data_values")
    form_field = relationship("FormField")

    def __repr__(self):
        return f"<FormDataValue(id={self.id}, task={self.task_instance_id}, field={self.form_field_id})>"


class ActivityLog(Base):
    """Activity log model for audit trail of flow events"""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    flow_instance_id = Column(Integer, ForeignKey('flow_instances.id', ondelete='CASCADE'), nullable=False)
    activity_type = Column(Enum(ActivityType), nullable=False)

    # Who performed the action
    actor_id = Column(Integer, ForeignKey('users.id'), nullable=True)

    # Event details stored as JSON
    details = Column(JSON, nullable=True)

    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    flow_instance = relationship("FlowInstance", back_populates="activity_logs")
    actor = relationship("User")

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, flow={self.flow_instance_id}, type={self.activity_type})>"
