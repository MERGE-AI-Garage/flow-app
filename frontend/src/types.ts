// User Types
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Assignment Types
export enum AssignmentType {
  USER = 'user',
  ROLE = 'role',
  INITIATOR = 'initiator',
  EXTERNAL = 'external'
}

// Form Field Types - Must match backend FieldType enum
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  ATTACHMENT = 'attachment',
  CHECKBOX = 'checkbox'
}

export interface FormField {
  id: number;
  stage_id: number;
  field_type: FieldType;
  label: string;
  is_required: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

// Stage Types
export interface Stage {
  id: number;
  flow_template_id: number;
  name: string;
  order: number;
  description: string | null;
  assignment_type: AssignmentType;
  assignment_target_id: number | null;
  is_approval_stage: boolean;
  form_fields: FormField[];
  created_at: string;
  updated_at: string;
}

// Flow Template Types
export interface FlowTemplate {
  id: number;
  name: string;
  description: string | null;
  created_by_user_id: number;
  is_active: boolean;
  stages: Stage[];
  created_at: string;
  updated_at: string;
}

// Flow Template List Item (simplified for list view)
export interface FlowTemplateListItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  stage_count: number;
  created_at: string;
  updated_at: string;
}

// Flow Instance Types
export enum FlowStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  STALLED = 'stalled'
}

export interface FlowInstance {
  id: number;
  flow_template_id: number;
  requester_user_id: number;
  status: FlowStatus;
  created_at: string;
  updated_at: string;
}

// Task Instance Types
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export interface TaskInstance {
  id: number;
  flow_instance_id: number;
  stage_id: number;
  assigned_to_user_id: number;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// API Request/Response Types
export interface CreateFlowTemplateRequest {
  name: string;
  description?: string;
}

export interface UpdateFlowTemplateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateStageRequest {
  name: string;
  order: number;
  description?: string;
  assignment_type: AssignmentType;
  assignment_target_id?: number;
  is_approval_stage?: boolean;
}

export interface UpdateStageRequest {
  name?: string;
  order?: number;
  description?: string;
  assignment_type?: AssignmentType;
  assignment_target_id?: number;
  is_approval_stage?: boolean;
}

export interface CreateFormFieldRequest {
  field_type: FieldType;
  label: string;
  is_required?: boolean;
  order: number;
}

export interface UpdateFormFieldRequest {
  field_type?: FieldType;
  label?: string;
  is_required?: boolean;
  order?: number;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUserResponse {
  email: string;
  full_name: string | null;
  id: number;
}

// Flow Instance Request/Response Types
export interface CreateFlowInstanceRequest {
  flow_template_id: number;
  title: string;
  description?: string;
}

export interface FlowInstanceDetailResponse {
  id: number;
  flow_template_id: number;
  title: string;
  description: string | null;
  status: FlowStatus;
  current_stage_id: number | null;
  current_assignee_id: number | null;
  requester_user_id: number;
  started_at: string;
  completed_at: string | null;
  elapsed_time: string;
  flow_template: FlowTemplate;
  current_stage: Stage | null;
  current_assignee: User | null;
  initiator: User;
  created_at: string;
  updated_at: string;
}

export interface TaskInstanceDetailResponse extends TaskInstance {
  flow_instance?: FlowInstanceDetailResponse;
  stage?: Stage;
}

export interface CompleteTaskRequest {
  form_data: Record<number, any>;
}

export interface TaskCompleteResponse {
  message: string;
  flow_instance: FlowInstanceDetailResponse;
}
