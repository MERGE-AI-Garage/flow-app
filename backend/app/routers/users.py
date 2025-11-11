from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..core.database import get_db
from ..core.dependencies import get_current_active_user
from ..models.user import User
from ..schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user


@router.get("/me/tasks")
async def get_my_tasks(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's assigned tasks (My Tasks view)
    This is Feature 1.2 from the PRD.

    Returns tasks organized by flow type, filtered to show only
    tasks currently assigned to the logged-in user.
    """
    # TODO: This will be fully implemented when Flow models are created
    # For now, return an empty structure to demonstrate the API
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role
        },
        "tasks": []  # Will contain active flows assigned to this user
    }
