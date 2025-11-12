from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class AssignmentType(str, enum.Enum):
    """Stage assignment types as defined in the PRD"""
    USER = "user"
    ROLE = "role"
    INITIATOR = "initiator"
    EXTERNAL = "external"


class FieldType(str, enum.Enum):
    """Form field types as defined in the PRD"""
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    ATTACHMENT = "attachment"
    CHECKBOX = "checkbox"


# Association table for many-to-many relationship between FlowRole and User
flow_role_users = Table(
    'flow_role_users',
    Base.metadata,
    Column('flow_role_id', Integer, ForeignKey('flow_roles.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)


class FlowTemplate(Base):
    """Flow Template model representing a workflow template"""
    __tablename__ = "flow_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Untitled Flow")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    stages = relationship("Stage", back_populates="flow_template", cascade="all, delete-orphan", order_by="Stage.order")
    roles = relationship("FlowRole", back_populates="flow_template", cascade="all, delete-orphan")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<FlowTemplate(id={self.id}, name={self.name})>"


class Stage(Base):
    """Stage model representing a single stage in a flow template"""
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    flow_template_id = Column(Integer, ForeignKey('flow_templates.id', ondelete='CASCADE'), nullable=False)
    order = Column(Integer, nullable=False)  # Position in the flow (1, 2, 3...)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)  # Step instructions

    # Assignment configuration
    assignment_type = Column(Enum(AssignmentType), nullable=False)
    assignment_target_id = Column(Integer, nullable=True)  # User ID or FlowRole ID

    is_approval_stage = Column(Boolean, default=False, nullable=False)

    # Relationships
    flow_template = relationship("FlowTemplate", back_populates="stages")
    form_fields = relationship("FormField", back_populates="stage", cascade="all, delete-orphan", order_by="FormField.order")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Stage(id={self.id}, name={self.name}, order={self.order})>"


class FormField(Base):
    """Form field model representing a form field within a stage"""
    __tablename__ = "form_fields"

    id = Column(Integer, primary_key=True, index=True)
    stage_id = Column(Integer, ForeignKey('stages.id', ondelete='CASCADE'), nullable=False)
    order = Column(Integer, nullable=False)  # Display order within the stage
    field_type = Column(Enum(FieldType), nullable=False)
    label = Column(String, nullable=False)
    required = Column(Boolean, default=False, nullable=False)

    # Relationship
    stage = relationship("Stage", back_populates="form_fields")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<FormField(id={self.id}, label={self.label}, type={self.field_type})>"


class FlowRole(Base):
    """Flow role model for role-based stage assignments"""
    __tablename__ = "flow_roles"

    id = Column(Integer, primary_key=True, index=True)
    flow_template_id = Column(Integer, ForeignKey('flow_templates.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Designer", "Approver", "Reviewer"

    # Relationships
    flow_template = relationship("FlowTemplate", back_populates="roles")
    users = relationship("User", secondary=flow_role_users, backref="flow_roles")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<FlowRole(id={self.id}, name={self.name})>"
