"""add_flow_execution_models

Revision ID: ca6c0929fdc0
Revises: e1ad8d3751a4
Create Date: 2025-11-17 12:39:35.711736

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ca6c0929fdc0'
down_revision = 'e1ad8d3751a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    flowstatus = sa.Enum('ACTIVE', 'COMPLETED', 'STALLED', 'TERMINATED', name='flowstatus')
    taskstatus = sa.Enum('PENDING', 'COMPLETED', 'REJECTED', name='taskstatus')
    activitytype = sa.Enum(
        'FLOW_STARTED', 'STAGE_COMPLETED', 'STAGE_REJECTED', 'TASK_ASSIGNED',
        'TASK_REASSIGNED', 'FLOW_COMPLETED', 'FLOW_TERMINATED',
        name='activitytype'
    )

    flowstatus.create(op.get_bind(), checkfirst=True)
    taskstatus.create(op.get_bind(), checkfirst=True)
    activitytype.create(op.get_bind(), checkfirst=True)

    # Create flow_instances table
    op.create_table(
        'flow_instances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('flow_template_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', flowstatus, nullable=False),
        sa.Column('current_stage_id', sa.Integer(), nullable=True),
        sa.Column('current_assignee_id', sa.Integer(), nullable=True),
        sa.Column('initiator_id', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['current_assignee_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['current_stage_id'], ['stages.id'], ),
        sa.ForeignKeyConstraint(['flow_template_id'], ['flow_templates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['initiator_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flow_instances_id'), 'flow_instances', ['id'], unique=False)
    op.create_index(op.f('ix_flow_instances_status'), 'flow_instances', ['status'], unique=False)

    # Create task_instances table
    op.create_table(
        'task_instances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('flow_instance_id', sa.Integer(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=False),
        sa.Column('assignee_id', sa.Integer(), nullable=False),
        sa.Column('status', taskstatus, nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['flow_instance_id'], ['flow_instances.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['stage_id'], ['stages.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_instances_assignee_id'), 'task_instances', ['assignee_id'], unique=False)
    op.create_index(op.f('ix_task_instances_id'), 'task_instances', ['id'], unique=False)
    op.create_index(op.f('ix_task_instances_status'), 'task_instances', ['status'], unique=False)

    # Create form_data_values table
    op.create_table(
        'form_data_values',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_instance_id', sa.Integer(), nullable=False),
        sa.Column('form_field_id', sa.Integer(), nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['form_field_id'], ['form_fields.id'], ),
        sa.ForeignKeyConstraint(['task_instance_id'], ['task_instances.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_form_data_values_id'), 'form_data_values', ['id'], unique=False)

    # Create activity_logs table
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('flow_instance_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', activitytype, nullable=False),
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['flow_instance_id'], ['flow_instances.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_logs_id'), 'activity_logs', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_activity_logs_id'), table_name='activity_logs')
    op.drop_table('activity_logs')
    op.drop_index(op.f('ix_form_data_values_id'), table_name='form_data_values')
    op.drop_table('form_data_values')
    op.drop_index(op.f('ix_task_instances_status'), table_name='task_instances')
    op.drop_index(op.f('ix_task_instances_id'), table_name='task_instances')
    op.drop_index(op.f('ix_task_instances_assignee_id'), table_name='task_instances')
    op.drop_table('task_instances')
    op.drop_index(op.f('ix_flow_instances_status'), table_name='flow_instances')
    op.drop_index(op.f('ix_flow_instances_id'), table_name='flow_instances')
    op.drop_table('flow_instances')

    # Drop enum types
    sa.Enum(name='activitytype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='taskstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='flowstatus').drop(op.get_bind(), checkfirst=True)
