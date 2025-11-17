from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload
from typing import List
from datetime import datetime, timezone

from ..core.database import get_db
from ..core.dependencies import get_current_active_user
from ..models.user import User
from ..models.flow_instance import TaskInstance, TaskStatus
from ..schemas.user import UserResponse
from ..schemas.flow_instance import TaskInstanceDetailResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all active users"""
    users = db.query(User).filter(User.is_active == True).all()
    return users


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user


@router.get("/me/tasks", response_model=List[TaskInstanceDetailResponse])
async def get_my_tasks(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's assigned tasks (My Tasks view).

    Returns all pending tasks assigned to the current user with:
    - Flow instance title and template name
    - Stage name
    - Elapsed time since flow started

    Query filters:
    - assignee_id = current_user.id
    - status = PENDING

    Returns:
        List of task instances with flow context
    """
    return await get_user_tasks(current_user.id, db)


@router.get("/{user_id}/tasks", response_model=List[TaskInstanceDetailResponse])
async def get_user_tasks_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific user's assigned tasks (for dev mode user switching).

    In production, this should be restricted to admins only.
    """
    return await get_user_tasks(user_id, db)


async def get_user_tasks(user_id: int, db: Session) -> List[TaskInstanceDetailResponse]:
    """
    Helper function to get tasks for a specific user.

    Returns all pending tasks assigned to the user with:
    - Flow instance title and template name
    - Stage name
    - Elapsed time since flow started
    """
    # Query pending tasks assigned to user with all relationships loaded
    from ..models.flow_instance import FlowInstance
    from ..models.flow import FlowTemplate

    tasks = db.query(TaskInstance).options(
        selectinload(TaskInstance.stage),
        selectinload(TaskInstance.flow_instance).selectinload(FlowInstance.flow_template),
        selectinload(TaskInstance.assignee)
    ).filter(
        TaskInstance.assignee_id == user_id,
        TaskInstance.status == TaskStatus.PENDING
    ).all()

    # Build response with calculated fields
    result = []
    for task in tasks:
        flow_instance = task.flow_instance
        stage = task.stage

        # Calculate elapsed time
        if flow_instance.completed_at:
            delta = flow_instance.completed_at - flow_instance.started_at
        else:
            # Use timezone-naive datetime to match database timestamps
            delta = datetime.now() - flow_instance.started_at
        elapsed_time_seconds = int(delta.total_seconds())

        # Build flow_instance summary
        from ..schemas.flow_instance import FlowInstanceSummary, StageSummary
        from ..schemas.flow import FlowTemplateResponse

        flow_summary = FlowInstanceSummary(
            id=flow_instance.id,
            flow_template_id=flow_instance.flow_template_id,
            title=flow_instance.title,
            description=flow_instance.description,
            status=flow_instance.status,
            started_at=flow_instance.started_at,
            completed_at=flow_instance.completed_at,
            flow_template=FlowTemplateResponse.model_validate(flow_instance.flow_template) if flow_instance.flow_template else None
        )

        stage_summary = StageSummary(
            id=stage.id,
            name=stage.name,
            order=stage.order
        )

        result.append(TaskInstanceDetailResponse(
            id=task.id,
            flow_instance_id=task.flow_instance_id,
            stage_id=task.stage_id,
            assignee_id=task.assignee_id,
            status=task.status,
            assigned_at=task.assigned_at,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
            form_data_values=[],  # Not needed for My Tasks list view
            stage_name=stage.name,
            flow_title=flow_instance.title,
            flow_template_name=flow_instance.flow_template.name,
            elapsed_time_seconds=elapsed_time_seconds,
            flow_instance=flow_summary,
            stage=stage_summary
        ))

    return result
