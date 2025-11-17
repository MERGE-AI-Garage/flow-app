"""
Task Assignment Service

Helper functions for resolving task assignments and stage progression
in flow execution. Implements assignment logic for USER, ROLE, and INITIATOR
assignment types as specified in the POC implementation plan.
"""

from typing import Optional
from sqlalchemy.orm import Session
from ..models.flow import Stage, FlowTemplate, AssignmentType, FlowRole
from ..models.user import User


def resolve_assignee(stage: Stage, initiator: User, db: Session) -> Optional[User]:
    """
    Resolve the assignee for a stage based on assignment type.

    Args:
        stage: The stage to resolve assignee for
        initiator: The user who initiated the flow
        db: Database session

    Returns:
        User object if assignee can be resolved, None otherwise

    Assignment Logic:
        - USER: Return user with ID = stage.assignment_target_id
        - ROLE: Return first user in role with ID = stage.assignment_target_id
        - INITIATOR: Return the initiator
        - EXTERNAL: Not supported in POC, returns None
    """
    if stage.assignment_type == AssignmentType.USER:
        # Direct user assignment
        if not stage.assignment_target_id:
            return None
        return db.query(User).filter(User.id == stage.assignment_target_id).first()

    elif stage.assignment_type == AssignmentType.ROLE:
        # Role-based assignment - pick first user in role
        if not stage.assignment_target_id:
            return None

        role = db.query(FlowRole).filter(FlowRole.id == stage.assignment_target_id).first()
        if not role or not role.users:
            return None

        # POC simplification: return first user in role
        return role.users[0]

    elif stage.assignment_type == AssignmentType.INITIATOR:
        # Assign back to initiator
        return initiator

    elif stage.assignment_type == AssignmentType.EXTERNAL:
        # Not supported in POC
        return None

    return None


def get_next_stage(flow_template: FlowTemplate, current_stage: Stage) -> Optional[Stage]:
    """
    Get the next stage in linear progression.

    Args:
        flow_template: The flow template containing stages
        current_stage: The current stage

    Returns:
        Next stage if exists, None if current stage is final

    Logic:
        - Stages are ordered by the 'order' field
        - Returns stage with order = current_stage.order + 1
        - Returns None if no next stage (flow completion)
    """
    if not flow_template.stages:
        return None

    # Find stage with order = current_stage.order + 1
    next_order = current_stage.order + 1
    for stage in flow_template.stages:
        if stage.order == next_order:
            return stage

    # No next stage found - this is the final stage
    return None


def get_first_stage(flow_template: FlowTemplate) -> Optional[Stage]:
    """
    Get the first stage in a flow template.

    Args:
        flow_template: The flow template

    Returns:
        Stage with order = 1, or None if no stages exist
    """
    if not flow_template.stages:
        return None

    # Find stage with order = 1 (first stage)
    for stage in flow_template.stages:
        if stage.order == 1:
            return stage

    # Fallback: return stage with lowest order
    return min(flow_template.stages, key=lambda s: s.order, default=None)
