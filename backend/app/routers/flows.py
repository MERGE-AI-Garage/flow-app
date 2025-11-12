from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List
from ..core.dependencies import get_db, get_current_user
from ..models.user import User
from ..models.flow import FlowTemplate, Stage, FormField, FlowRole
from ..schemas.flow import (
    FlowTemplateCreate,
    FlowTemplateUpdate,
    FlowTemplateResponse,
    FlowTemplateListResponse,
    StageCreate,
    StageUpdate,
    StageResponse,
    FormFieldCreate,
    FormFieldUpdate,
    FormFieldResponse,
    FlowRoleCreate,
    FlowRoleUpdate,
    FlowRoleResponse,
)

router = APIRouter(prefix="/flows", tags=["flows"])


# ========== Flow Template Endpoints ==========

@router.get("", response_model=List[FlowTemplateListResponse])
def list_flow_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all flow templates with stage count"""
    flows = db.query(FlowTemplate).filter(FlowTemplate.is_active == True).all()

    # Transform to include stage_count
    result = []
    for flow in flows:
        result.append({
            "id": flow.id,
            "name": flow.name,
            "description": flow.description,
            "is_active": flow.is_active,
            "stage_count": len(flow.stages),
            "created_at": flow.created_at,
            "updated_at": flow.updated_at,
        })

    return result


@router.post("", response_model=FlowTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_flow_template(
    flow: FlowTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new flow template"""
    db_flow = FlowTemplate(
        name=flow.name,
        description=flow.description,
        is_active=flow.is_active
    )
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)

    return db_flow


@router.get("/{flow_id}", response_model=FlowTemplateResponse)
def get_flow_template(
    flow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific flow template with all stages and form fields"""
    flow = db.query(FlowTemplate).options(
        selectinload(FlowTemplate.stages).selectinload(Stage.form_fields),
        selectinload(FlowTemplate.roles)
    ).filter(FlowTemplate.id == flow_id).first()

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow template not found"
        )

    # Transform roles to include user_ids
    response_data = {
        "id": flow.id,
        "name": flow.name,
        "description": flow.description,
        "is_active": flow.is_active,
        "stages": flow.stages,
        "roles": [
            {
                "id": role.id,
                "flow_template_id": role.flow_template_id,
                "name": role.name,
                "user_ids": [user.id for user in role.users],
                "created_at": role.created_at,
                "updated_at": role.updated_at,
            }
            for role in flow.roles
        ],
        "created_at": flow.created_at,
        "updated_at": flow.updated_at,
    }

    return response_data


@router.put("/{flow_id}", response_model=FlowTemplateResponse)
def update_flow_template(
    flow_id: int,
    flow_update: FlowTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a flow template"""
    flow = db.query(FlowTemplate).filter(FlowTemplate.id == flow_id).first()

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow template not found"
        )

    # Update fields
    if flow_update.name is not None:
        flow.name = flow_update.name
    if flow_update.description is not None:
        flow.description = flow_update.description
    if flow_update.is_active is not None:
        flow.is_active = flow_update.is_active

    db.commit()
    db.refresh(flow)

    return flow


@router.delete("/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flow_template(
    flow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a flow template"""
    flow = db.query(FlowTemplate).filter(FlowTemplate.id == flow_id).first()

    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow template not found"
        )

    db.delete(flow)
    db.commit()

    return None


# ========== Stage Endpoints ==========

@router.post("/{flow_id}/stages", response_model=StageResponse, status_code=status.HTTP_201_CREATED)
def create_stage(
    flow_id: int,
    stage: StageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new stage in a flow template"""
    # Verify flow exists
    flow = db.query(FlowTemplate).filter(FlowTemplate.id == flow_id).first()
    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow template not found"
        )

    # Create stage
    db_stage = Stage(
        flow_template_id=flow_id,
        name=stage.name,
        order=stage.order,
        description=stage.description,
        assignment_type=stage.assignment_type,
        assignment_target_id=stage.assignment_target_id,
        is_approval_stage=stage.is_approval_stage
    )
    db.add(db_stage)
    db.flush()  # Get the stage ID without committing

    # Create form fields
    for field in stage.form_fields:
        db_field = FormField(
            stage_id=db_stage.id,
            field_type=field.field_type,
            label=field.label,
            required=field.required,
            order=field.order
        )
        db.add(db_field)

    db.commit()
    db.refresh(db_stage)

    return db_stage


@router.put("/{flow_id}/stages/{stage_id}", response_model=StageResponse)
def update_stage(
    flow_id: int,
    stage_id: int,
    stage_update: StageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a stage"""
    stage = db.query(Stage).filter(
        Stage.id == stage_id,
        Stage.flow_template_id == flow_id
    ).first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    # Update fields
    if stage_update.name is not None:
        stage.name = stage_update.name
    if stage_update.order is not None:
        stage.order = stage_update.order
    if stage_update.description is not None:
        stage.description = stage_update.description
    if stage_update.assignment_type is not None:
        stage.assignment_type = stage_update.assignment_type
    if stage_update.assignment_target_id is not None:
        stage.assignment_target_id = stage_update.assignment_target_id
    if stage_update.is_approval_stage is not None:
        stage.is_approval_stage = stage_update.is_approval_stage

    db.commit()
    db.refresh(stage)

    return stage


@router.delete("/{flow_id}/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(
    flow_id: int,
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a stage"""
    stage = db.query(Stage).filter(
        Stage.id == stage_id,
        Stage.flow_template_id == flow_id
    ).first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    db.delete(stage)
    db.commit()

    return None


# ========== Form Field Endpoints ==========

@router.post("/{flow_id}/stages/{stage_id}/fields", response_model=FormFieldResponse, status_code=status.HTTP_201_CREATED)
def create_form_field(
    flow_id: int,
    stage_id: int,
    field: FormFieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new form field in a stage"""
    # Verify stage exists and belongs to flow
    stage = db.query(Stage).filter(
        Stage.id == stage_id,
        Stage.flow_template_id == flow_id
    ).first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    db_field = FormField(
        stage_id=stage_id,
        field_type=field.field_type,
        label=field.label,
        required=field.required,
        order=field.order
    )
    db.add(db_field)
    db.commit()
    db.refresh(db_field)

    return db_field


@router.put("/{flow_id}/stages/{stage_id}/fields/{field_id}", response_model=FormFieldResponse)
def update_form_field(
    flow_id: int,
    stage_id: int,
    field_id: int,
    field_update: FormFieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a form field"""
    # Verify field exists and belongs to stage/flow
    field = db.query(FormField).join(Stage).filter(
        FormField.id == field_id,
        FormField.stage_id == stage_id,
        Stage.flow_template_id == flow_id
    ).first()

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form field not found"
        )

    # Update fields
    if field_update.field_type is not None:
        field.field_type = field_update.field_type
    if field_update.label is not None:
        field.label = field_update.label
    if field_update.required is not None:
        field.required = field_update.required
    if field_update.order is not None:
        field.order = field_update.order

    db.commit()
    db.refresh(field)

    return field


@router.delete("/{flow_id}/stages/{stage_id}/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_field(
    flow_id: int,
    stage_id: int,
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a form field"""
    field = db.query(FormField).join(Stage).filter(
        FormField.id == field_id,
        FormField.stage_id == stage_id,
        Stage.flow_template_id == flow_id
    ).first()

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form field not found"
        )

    db.delete(field)
    db.commit()

    return None


# ========== Flow Role Endpoints ==========

@router.get("/{flow_id}/roles", response_model=List[FlowRoleResponse])
def list_flow_roles(
    flow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all roles for a flow"""
    # Verify flow exists
    flow = db.query(FlowTemplate).filter(FlowTemplate.id == flow_id).first()
    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow template not found"
        )

    roles = db.query(FlowRole).filter(FlowRole.flow_template_id == flow_id).all()

    # Transform to include user_ids
    result = []
    for role in roles:
        result.append({
            "id": role.id,
            "flow_template_id": role.flow_template_id,
            "name": role.name,
            "user_ids": [user.id for user in role.users],
            "created_at": role.created_at,
            "updated_at": role.updated_at,
        })

    return result


@router.post("/{flow_id}/roles", response_model=FlowRoleResponse, status_code=status.HTTP_201_CREATED)
def create_flow_role(
    flow_id: int,
    role: FlowRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new role for a flow"""
    # Verify flow exists
    flow = db.query(FlowTemplate).filter(FlowTemplate.id == flow_id).first()
    if not flow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flow template not found"
        )

    db_role = FlowRole(
        flow_template_id=flow_id,
        name=role.name
    )
    db.add(db_role)
    db.flush()

    # Assign users to role
    if role.user_ids:
        users = db.query(User).filter(User.id.in_(role.user_ids)).all()
        db_role.users = users

    db.commit()
    db.refresh(db_role)

    return {
        "id": db_role.id,
        "flow_template_id": db_role.flow_template_id,
        "name": db_role.name,
        "user_ids": [user.id for user in db_role.users],
        "created_at": db_role.created_at,
        "updated_at": db_role.updated_at,
    }


@router.put("/{flow_id}/roles/{role_id}", response_model=FlowRoleResponse)
def update_flow_role(
    flow_id: int,
    role_id: int,
    role_update: FlowRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a flow role"""
    role = db.query(FlowRole).filter(
        FlowRole.id == role_id,
        FlowRole.flow_template_id == flow_id
    ).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Update name
    if role_update.name is not None:
        role.name = role_update.name

    # Update assigned users
    if role_update.user_ids is not None:
        users = db.query(User).filter(User.id.in_(role_update.user_ids)).all()
        role.users = users

    db.commit()
    db.refresh(role)

    return {
        "id": role.id,
        "flow_template_id": role.flow_template_id,
        "name": role.name,
        "user_ids": [user.id for user in role.users],
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


@router.delete("/{flow_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flow_role(
    flow_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a flow role"""
    role = db.query(FlowRole).filter(
        FlowRole.id == role_id,
        FlowRole.flow_template_id == flow_id
    ).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    db.delete(role)
    db.commit()

    return None
