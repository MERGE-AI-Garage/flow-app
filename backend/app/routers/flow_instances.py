"""
Flow Instances Router

API endpoints for managing flow instances (running workflows).
Supports creating flow instances and retrieving flow instance details.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List
from datetime import datetime, timezone
from ..core.dependencies import get_db, get_current_user
from ..models.user import User
from ..models.flow import FlowTemplate, Stage
from ..models.flow_instance import (
    FlowInstance,
    TaskInstance,
    ActivityLog,
    FlowStatus,
    TaskStatus,
    ActivityType
)
from ..schemas.flow_instance import (
    FlowInstanceCreate,
    FlowInstanceResponse,
    FlowInstanceDetailResponse,
    FlowInstanceListResponse
)
from ..services.task_assignment import resolve_assignee, get_first_stage

router = APIRouter(prefix="/flow-instances", tags=["flow-instances"])


def calculate_elapsed_time(started_at: datetime, completed_at: datetime = None) -> int:
    """Calculate elapsed time in seconds between started_at and completed_at (or now)"""
    if completed_at:
        delta = completed_at - started_at
    else:
        # Use timezone-naive datetime to match database timestamps
        delta = datetime.now() - started_at
    return int(delta.total_seconds())


@router.post("", response_model=FlowInstanceDetailResponse, status_code=status.HTTP_201_CREATED)
def create_flow_instance(
    flow_instance_data: FlowInstanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new flow instance (initiate a workflow).

    Steps:
    1. Load flow template with stages
    2. Create FlowInstance (status=Active, started_at=now)
    3. Get first stage
    4. Resolve first stage assignee
    5. Create TaskInstance for first stage (status=Pending)
    6. Create activity log for flow started
    7. Return FlowInstance with first task

    Args:
        flow_instance_data: Title and description for the flow instance
        db: Database session
        current_user: User who is initiating the flow

    Returns:
        Created flow instance with detail information
    """
    # 1. Load flow template with stages
    flow_template = db.query(FlowTemplate).options(
        selectinload(FlowTemplate.stages).selectinload(Stage.form_fields)
    ).filter(FlowTemplate.id == flow_instance_data.flow_template_id).first()

    if not flow_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow template not found"
        )

    if not flow_template.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Flow template is not active"
        )

    # 3. Get first stage
    first_stage = get_first_stage(flow_template)
    if not first_stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Flow template has no stages defined"
        )

    # 4. Resolve first stage assignee
    first_assignee = resolve_assignee(first_stage, current_user, db)
    if not first_assignee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not resolve assignee for first stage (assignment_type={first_stage.assignment_type})"
        )

    # 2. Create FlowInstance
    flow_instance = FlowInstance(
        flow_template_id=flow_template.id,
        title=flow_instance_data.title,
        description=flow_instance_data.description,
        status=FlowStatus.ACTIVE,
        current_stage_id=first_stage.id,
        current_assignee_id=first_assignee.id,
        initiator_id=current_user.id,
        started_at=datetime.now(timezone.utc)
    )
    db.add(flow_instance)
    db.flush()  # Get flow_instance.id without committing

    # 5. Create TaskInstance for first stage
    first_task = TaskInstance(
        flow_instance_id=flow_instance.id,
        stage_id=first_stage.id,
        assignee_id=first_assignee.id,
        status=TaskStatus.PENDING,
        assigned_at=datetime.now(timezone.utc)
    )
    db.add(first_task)

    # 6. Create activity log for flow started
    activity_log = ActivityLog(
        flow_instance_id=flow_instance.id,
        activity_type=ActivityType.FLOW_STARTED,
        actor_id=current_user.id,
        details={
            "flow_template_name": flow_template.name,
            "first_stage_name": first_stage.name,
            "first_assignee_email": first_assignee.email
        }
    )
    db.add(activity_log)

    # Commit all changes
    db.commit()
    db.refresh(flow_instance)

    # 7. Build response with calculated fields
    elapsed_time = calculate_elapsed_time(flow_instance.started_at, flow_instance.completed_at)

    response = FlowInstanceDetailResponse(
        id=flow_instance.id,
        flow_template_id=flow_instance.flow_template_id,
        title=flow_instance.title,
        description=flow_instance.description,
        status=flow_instance.status,
        current_stage_id=flow_instance.current_stage_id,
        current_assignee_id=flow_instance.current_assignee_id,
        initiator_id=flow_instance.initiator_id,
        started_at=flow_instance.started_at,
        completed_at=flow_instance.completed_at,
        created_at=flow_instance.created_at,
        updated_at=flow_instance.updated_at,
        flow_template_name=flow_template.name,
        current_stage_name=first_stage.name,
        current_assignee_email=first_assignee.email,
        initiator_email=current_user.email,
        elapsed_time_seconds=elapsed_time,
        tasks=[],  # Empty for new flow
        activity_logs=[]  # Empty for new flow (could include flow_started if needed)
    )

    return response


@router.get("/{flow_instance_id}", response_model=FlowInstanceDetailResponse)
def get_flow_instance(
    flow_instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific flow instance with full details.

    Loads:
    - Flow instance
    - Flow template (for name)
    - Current stage (for name)
    - Current assignee and initiator (for emails)
    - All tasks with form data
    - Activity logs

    Returns:
        Flow instance with all relationships loaded and calculated fields
    """
    # Load flow instance with all relationships
    flow_instance = db.query(FlowInstance).options(
        selectinload(FlowInstance.flow_template),
        selectinload(FlowInstance.current_stage),
        selectinload(FlowInstance.current_assignee),
        selectinload(FlowInstance.initiator),
        selectinload(FlowInstance.tasks).selectinload(TaskInstance.stage),
        selectinload(FlowInstance.tasks).selectinload(TaskInstance.assignee),
        selectinload(FlowInstance.tasks).selectinload(TaskInstance.form_data_values),
        selectinload(FlowInstance.activity_logs).selectinload(ActivityLog.actor)
    ).filter(FlowInstance.id == flow_instance_id).first()

    if not flow_instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow instance not found"
        )

    # Calculate elapsed time
    elapsed_time = calculate_elapsed_time(flow_instance.started_at, flow_instance.completed_at)

    # Build response with calculated fields
    response = FlowInstanceDetailResponse(
        id=flow_instance.id,
        flow_template_id=flow_instance.flow_template_id,
        title=flow_instance.title,
        description=flow_instance.description,
        status=flow_instance.status,
        current_stage_id=flow_instance.current_stage_id,
        current_assignee_id=flow_instance.current_assignee_id,
        initiator_id=flow_instance.initiator_id,
        started_at=flow_instance.started_at,
        completed_at=flow_instance.completed_at,
        created_at=flow_instance.created_at,
        updated_at=flow_instance.updated_at,
        flow_template_name=flow_instance.flow_template.name,
        current_stage_name=flow_instance.current_stage.name if flow_instance.current_stage else None,
        current_assignee_email=flow_instance.current_assignee.email if flow_instance.current_assignee else None,
        initiator_email=flow_instance.initiator.email,
        elapsed_time_seconds=elapsed_time,
        tasks=flow_instance.tasks,
        activity_logs=flow_instance.activity_logs
    )

    return response


@router.get("", response_model=List[FlowInstanceListResponse])
def list_flow_instances(
    status: FlowStatus = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all flow instances with optional status filter.

    Args:
        status: Optional filter by flow status (active, completed, stalled, terminated)
        db: Database session
        current_user: Current user

    Returns:
        List of flow instances with summary information
    """
    query = db.query(FlowInstance).options(
        selectinload(FlowInstance.flow_template),
        selectinload(FlowInstance.current_stage),
        selectinload(FlowInstance.current_assignee),
        selectinload(FlowInstance.initiator)
    )

    # Apply status filter if provided
    if status:
        query = query.filter(FlowInstance.status == status)

    flow_instances = query.all()

    # Build response list
    result = []
    for flow_instance in flow_instances:
        elapsed_time = calculate_elapsed_time(flow_instance.started_at, flow_instance.completed_at)

        result.append(FlowInstanceListResponse(
            id=flow_instance.id,
            flow_template_id=flow_instance.flow_template_id,
            flow_template_name=flow_instance.flow_template.name,
            title=flow_instance.title,
            description=flow_instance.description,
            status=flow_instance.status,
            current_stage_name=flow_instance.current_stage.name if flow_instance.current_stage else None,
            current_assignee_email=flow_instance.current_assignee.email if flow_instance.current_assignee else None,
            initiator_email=flow_instance.initiator.email,
            started_at=flow_instance.started_at,
            completed_at=flow_instance.completed_at,
            elapsed_time_seconds=elapsed_time
        ))

    return result
