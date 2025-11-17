"""
Tasks Router

API endpoints for managing task instances.
Supports completing tasks with form data and progressing to next stage.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from datetime import datetime, timezone
from ..core.dependencies import get_db, get_current_user
from ..models.user import User
from ..models.flow import FlowTemplate, Stage, FormField
from ..models.flow_instance import (
    FlowInstance,
    TaskInstance,
    FormDataValue,
    ActivityLog,
    FlowStatus,
    TaskStatus,
    ActivityType
)
from ..schemas.flow_instance import (
    TaskCompleteRequest,
    TaskCompleteResponse,
    FlowInstanceDetailResponse
)
from ..services.task_assignment import resolve_assignee, get_next_stage

router = APIRouter(prefix="/tasks", tags=["tasks"])


def calculate_elapsed_time(started_at: datetime, completed_at: datetime = None) -> int:
    """Calculate elapsed time in seconds between started_at and completed_at (or now)"""
    if completed_at:
        delta = completed_at - started_at
    else:
        delta = datetime.now(timezone.utc) - started_at
    return int(delta.total_seconds())


@router.post("/{task_id}/complete", response_model=TaskCompleteResponse)
def complete_task(
    task_id: int,
    task_complete_data: TaskCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Complete a task with form data and progress the flow to the next stage.

    Steps:
    1. Validate current user is the assignee
    2. Load task with stage and form fields
    3. Validate required fields are present in form_data
    4. Save form data as FormDataValue records
    5. Mark current TaskInstance as Completed
    6. Get next stage
    7. If next stage exists:
       - Resolve next assignee
       - Create new TaskInstance (status=Pending)
       - Update FlowInstance (current_stage_id, current_assignee_id)
       - Create activity log for stage completed
    8. If no next stage:
       - Mark FlowInstance as Completed (status=Completed, completed_at=now)
       - Create activity log for flow completed
    9. Return updated FlowInstance

    Args:
        task_id: ID of the task to complete
        task_complete_data: Form data submitted by the user
        db: Database session
        current_user: User completing the task

    Returns:
        Updated flow instance with completion message
    """
    # 1. Load task with all relationships
    task = db.query(TaskInstance).options(
        selectinload(TaskInstance.stage).selectinload(Stage.form_fields),
        selectinload(TaskInstance.flow_instance).selectinload(FlowInstance.flow_template).selectinload(FlowTemplate.stages)
    ).filter(TaskInstance.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Validate current user is assignee
    if task.assignee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this task"
        )

    # Validate task is still pending
    if task.status != TaskStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task is already {task.status.value}"
        )

    # 2. Validate required fields
    stage = task.stage
    form_data = task_complete_data.form_data

    # Check all required fields are present
    for field in stage.form_fields:
        if field.required and field.id not in form_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Required field '{field.label}' (id={field.id}) is missing"
            )

    # 3. Save form data
    for field_id, value in form_data.items():
        # Verify field exists and belongs to this stage
        field = db.query(FormField).filter(
            FormField.id == field_id,
            FormField.stage_id == stage.id
        ).first()

        if not field:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid field ID {field_id} for this stage"
            )

        # Create FormDataValue
        form_data_value = FormDataValue(
            task_instance_id=task.id,
            form_field_id=field_id,
            value=value  # Stored as JSON, handles any type
        )
        db.add(form_data_value)

    # 4. Mark task as completed
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.now(timezone.utc)

    # 5. Get flow instance and template
    flow_instance = task.flow_instance
    flow_template = flow_instance.flow_template

    # 6. Get next stage
    next_stage = get_next_stage(flow_template, stage)

    if next_stage:
        # 7a. Flow continues to next stage

        # Resolve next assignee
        next_assignee = resolve_assignee(next_stage, flow_instance.initiator, db)
        if not next_assignee:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not resolve assignee for next stage (assignment_type={next_stage.assignment_type})"
            )

        # Create new TaskInstance for next stage
        next_task = TaskInstance(
            flow_instance_id=flow_instance.id,
            stage_id=next_stage.id,
            assignee_id=next_assignee.id,
            status=TaskStatus.PENDING,
            assigned_at=datetime.now(timezone.utc)
        )
        db.add(next_task)

        # Update FlowInstance
        flow_instance.current_stage_id = next_stage.id
        flow_instance.current_assignee_id = next_assignee.id

        # Create activity log for stage completed
        activity_log = ActivityLog(
            flow_instance_id=flow_instance.id,
            activity_type=ActivityType.STAGE_COMPLETED,
            actor_id=current_user.id,
            details={
                "stage_name": stage.name,
                "stage_id": stage.id,
                "next_stage_name": next_stage.name,
                "next_stage_id": next_stage.id,
                "next_assignee_email": next_assignee.email
            }
        )
        db.add(activity_log)

        message = f"Task completed. Flow progressed to stage '{next_stage.name}' assigned to {next_assignee.email}"

    else:
        # 7b. No next stage - flow is complete

        # Mark flow as completed
        flow_instance.status = FlowStatus.COMPLETED
        flow_instance.completed_at = datetime.now(timezone.utc)
        flow_instance.current_stage_id = None
        flow_instance.current_assignee_id = None

        # Create activity log for flow completed
        activity_log = ActivityLog(
            flow_instance_id=flow_instance.id,
            activity_type=ActivityType.FLOW_COMPLETED,
            actor_id=current_user.id,
            details={
                "final_stage_name": stage.name,
                "final_stage_id": stage.id
            }
        )
        db.add(activity_log)

        message = "Task completed. Flow is now complete!"

    # Commit all changes
    db.commit()
    db.refresh(flow_instance)

    # 8. Load updated flow instance with all relationships for response
    flow_instance_refreshed = db.query(FlowInstance).options(
        selectinload(FlowInstance.flow_template),
        selectinload(FlowInstance.current_stage),
        selectinload(FlowInstance.current_assignee),
        selectinload(FlowInstance.initiator),
        selectinload(FlowInstance.tasks).selectinload(TaskInstance.stage),
        selectinload(FlowInstance.tasks).selectinload(TaskInstance.assignee),
        selectinload(FlowInstance.tasks).selectinload(TaskInstance.form_data_values),
        selectinload(FlowInstance.activity_logs).selectinload(ActivityLog.actor)
    ).filter(FlowInstance.id == flow_instance.id).first()

    # Calculate elapsed time
    elapsed_time = calculate_elapsed_time(
        flow_instance_refreshed.started_at,
        flow_instance_refreshed.completed_at
    )

    # Build detailed response
    flow_detail = FlowInstanceDetailResponse(
        id=flow_instance_refreshed.id,
        flow_template_id=flow_instance_refreshed.flow_template_id,
        title=flow_instance_refreshed.title,
        description=flow_instance_refreshed.description,
        status=flow_instance_refreshed.status,
        current_stage_id=flow_instance_refreshed.current_stage_id,
        current_assignee_id=flow_instance_refreshed.current_assignee_id,
        initiator_id=flow_instance_refreshed.initiator_id,
        started_at=flow_instance_refreshed.started_at,
        completed_at=flow_instance_refreshed.completed_at,
        created_at=flow_instance_refreshed.created_at,
        updated_at=flow_instance_refreshed.updated_at,
        flow_template_name=flow_instance_refreshed.flow_template.name,
        current_stage_name=flow_instance_refreshed.current_stage.name if flow_instance_refreshed.current_stage else None,
        current_assignee_email=flow_instance_refreshed.current_assignee.email if flow_instance_refreshed.current_assignee else None,
        initiator_email=flow_instance_refreshed.initiator.email,
        elapsed_time_seconds=elapsed_time,
        tasks=flow_instance_refreshed.tasks,
        activity_logs=flow_instance_refreshed.activity_logs
    )

    return TaskCompleteResponse(
        flow_instance=flow_detail,
        message=message
    )
