# Flow App - POC Implementation Plan (Revised)

**Status:** Ready to Execute
**Started:** 2025-11-14
**Last Updated:** 2025-11-17 (Rollback update)
**Target:** Quick Proof of Concept (2-3 days)

## Overview

Streamlined implementation plan focused on delivering a working proof of concept quickly. This plan prioritizes the **minimum viable flow execution** - users can create flows, initiate them, and complete stages with handoffs.

**Current State:**
- ✅ Feature 1: Auth & My Tasks UI (ready, needs data)
- ✅ Feature 2: Flow Designer (fully functional)
- ⚠️ Feature 3: Flow Execution (ROLLED BACK - needs re-implementation)

**POC Goal:** End-to-end workflow - Create template → Initiate flow → Complete stages → See in My Tasks

---

## POC Scope: What We're Building

### Core Flow (P0 - Must Have)
1. ✅ User can design a flow template with stages (DONE)
2. User can initiate a new flow from a template
3. Tasks appear in "My Tasks" for assigned users
4. User can view task details with form fields
5. User can complete a stage and handoff to next assignee
6. Flow tracks elapsed time
7. Flow reaches "Completed" status at final stage

### Deferred to Post-POC (Can Wait)
- ❌ Approval stages (approve/reject buttons)
- ❌ Task reassignment and delegation
- ❌ Activity logs and audit trail
- ❌ Public request forms
- ❌ Role-based permissions enforcement
- ❌ Stalled status detection
- ❌ Admin task list view
- ❌ Email notifications
- ❌ File attachments in forms

---

## Implementation Phases (Streamlined)

## Phase 1: Backend Core ⚠️ ROLLED BACK

### Status Update (2025-11-17)
The flow_instance changes were **rolled back** to enable Cloud Run redeployment with updated database credentials. This phase needs to be re-implemented.

### What Needs to Be Done
- [ ] Flow execution models (FlowInstance, TaskInstance, FormDataValue, ActivityLog)
- [ ] Database migration
- [ ] Request/response schemas
- [ ] Model exports and registration

**Files to Create:**
- `backend/app/models/flow_instance.py`
- `backend/app/schemas/flow_instance.py`
- `alembic/versions/[new]_add_flow_execution_models.py`

**Note:** The models and schemas were previously completed but were rolled back. Reference the original implementation when recreating.

---

## Phase 2: Backend API (Simplified) ⚠️ BLOCKED

**Goal:** Minimal API to support flow execution

**Status:** BLOCKED - Waiting for Phase 1 (Backend Core) to be re-implemented after rollback.

### 2.1 Helper Service - Assignment Logic ⏳ PENDING
- **File:** `backend/app/services/task_assignment.py`
- **Functions:**
  - `resolve_assignee(stage, initiator)` - Handles USER/ROLE/INITIATOR assignment types
  - `get_next_stage(flow_template, current_stage)` - Linear stage progression
- **Simplifications:**
  - ROLE assignment defaults to first user in role (no complex logic)
  - No fallback handling for empty roles (POC assumes valid data)

### 2.2 Flow Initiation Endpoint ⏳
- **File:** `backend/app/routers/flow_instances.py` (NEW)
- **Endpoint:** `POST /api/flows/{flow_id}/instances`
- **Request Body:** `{ "title": "Task Title", "description": "Optional" }`
- **Logic:**
  1. Load flow template with stages
  2. Create FlowInstance (status=Active, started_at=now)
  3. Get first stage
  4. Resolve first stage assignee
  5. Create TaskInstance for first stage (status=Pending)
  6. Return FlowInstance with first task
- **Simplification:** No validation beyond required fields

### 2.3 Get User Tasks Endpoint ⏳
- **File:** `backend/app/routers/users.py` (MODIFY)
- **Endpoint:** `GET /api/users/me/tasks`
- **Logic:**
  1. Query TaskInstances where assignee_id = current_user AND status = Pending
  2. Load flow_instance relationship (for title, elapsed time)
  3. Load stage relationship (for stage name)
  4. Return list of tasks with flow context
- **Simplification:** No filtering, sorting, or pagination

### 2.4 Get Active Flow Endpoint ⏳
- **File:** `backend/app/routers/flow_instances.py`
- **Endpoint:** `GET /api/flow-instances/{id}`
- **Logic:**
  1. Load FlowInstance with all relationships (flow_template, stages, current task)
  2. Load current stage.form_fields (for form rendering)
  3. Load previous stage form data (read-only context)
  4. Calculate elapsed time (now - flow_instance.started_at)
  5. Return full flow instance detail
- **Simplification:** No activity log, no attachments

### 2.5 Complete Task Endpoint ⏳
- **File:** `backend/app/routers/tasks.py`
- **Endpoint:** `POST /api/tasks/{task_id}/complete`
- **Request Body:** `{ "form_data": { "field_id": "value", ... } }`
- **Logic:**
  1. Validate current user is assignee
  2. Validate required fields are present
  3. Save form data as FormDataValue records
  4. Mark current TaskInstance as Completed
  5. Get next stage
  6. If next stage exists:
     - Resolve next assignee
     - Create new TaskInstance (status=Pending)
     - Update FlowInstance (current_stage_id, current_assignee_id)
  7. If no next stage:
     - Mark FlowInstance as Completed (status=Completed, completed_at=now)
  8. Return updated FlowInstance
- **Simplification:** No approval logic, no rejection, no delegation

### 2.6 Register Routers ⏳
- **File:** `backend/app/main.py` (MODIFY)
- Add router imports and registrations:
  ```python
  from app.routers import flow_instances, tasks
  app.include_router(flow_instances.router)
  app.include_router(tasks.router)
  ```

**Phase 2 Estimated Time:** 3-4 hours

---

## Phase 3: Frontend Core Components 🚀 NEXT

**Goal:** Reusable components for task views

### 3.1 Form Renderer Component ⏳
- **File:** `frontend/src/components/FormRenderer.tsx` (NEW)
- **Props:** `{ fields: FormField[], values: Record<string, any>, onChange: (fieldId, value) => void }`
- **Renders:**
  - TEXT → `<input type="text">`
  - NUMBER → `<input type="number">`
  - DATE → `<input type="date">`
  - CHECKBOX → `<input type="checkbox">`
  - TEXTAREA → `<textarea>`
- **Validation:** Highlight required empty fields
- **Simplification:** No file uploads, no rich text

### 3.2 Timer Display Component ⏳
- **File:** `frontend/src/components/TimerDisplay.tsx` (NEW)
- **Props:** `{ startedAt: string }` (ISO timestamp)
- **Display:** Calculate elapsed time and format as "X days, Y hours, Z minutes"
- **Simplification:** No live ticking (static calculation on page load)

### 3.3 Flow Progress Component ⏳
- **File:** `frontend/src/components/FlowProgress.tsx` (NEW)
- **Props:** `{ stages: Stage[], currentStageId: number }`
- **Display:** Vertical list with current stage highlighted
- **Simplification:** No completion checkmarks, just highlight current

### 3.4 Flow Diagram Component ⏳
- **File:** `frontend/src/components/FlowDiagram.tsx` (NEW)
- **Props:** `{ stages: Stage[], currentStageId?: number }`
- **Display:** Mermaid-style diagram showing flow stages vertically
- **Features:**
  - Visual flow representation (top-down)
  - Stage names and assignees
  - Current stage highlighted (if provided)
  - Arrows showing progression
  - Clean, modern styling with Tailwind/Daisy UI
- **Implementation:** Use Mermaid.js library or custom CSS/SVG rendering
- **Usage:** Available in **Active Flows** and **My Tasks** views only (NOT in Flow Designer)
- **Simplification:** Linear flow only (no branching), static diagram (no interactivity for POC)

**Phase 3 Estimated Time:** 3-4 hours (added 1 hour for diagram component)

---

## Phase 4: Frontend Task Pages 🚀 CRITICAL

**Goal:** Build the three key user flows

### 4.1 New Task Page ⏳
- **File:** `frontend/src/pages/NewTask.tsx` (NEW)
- **Route:** `/new-task`
- **UI:**
  1. Dropdown to select flow template (load from `/api/flows`)
  2. Title input (required)
  3. Description textarea (optional)
  4. "Start Flow" button
- **Actions:**
  - POST to `/api/flows/{flow_id}/instances`
  - On success: redirect to `/flows/{flow_instance_id}` (active flow view)
- **Simplification:** No form validation beyond required title

### 4.2 Active Flow Page (Single Flow View) ⏳
- **File:** `frontend/src/pages/ActiveFlow.tsx` (NEW)
- **Route:** `/flows/:id`
- **UI:**
  1. Header: Flow title, elapsed timer
  2. **FlowDiagram component** (visual diagram with current stage highlighted)
  3. Toggle button to switch between diagram and list view (FlowProgress component)
  4. Current stage name and instructions
  5. FormRenderer (current stage fields) - only if user is current assignee
  6. "Complete & Handoff to [Next Stage Name]" button (or "Complete Flow" if final stage)
  7. Optional: Previous stage data (read-only)
- **Actions:**
  - Load flow instance via `GET /api/flow-instances/{id}`
  - On complete: POST to `/tasks/{task_id}/complete` with form data
  - On success: redirect to `/my-tasks` with success message
- **Simplification:** No activity feed, no comments, no reassignment

### 4.3 Update My Tasks Page ⏳
- **File:** `frontend/src/pages/MyTasks.tsx` (MODIFY)
- **Replace empty state with:**
  1. Load tasks via `GET /api/users/me/tasks`
  2. Group by flow template name (optional, can be flat list for POC)
  3. Each task shows:
     - Flow title
     - Current stage name
     - Elapsed time
     - **Optional: Mini diagram preview** (collapsed by default, expandable)
     - Click → navigate to `/flows/{flow_instance_id}` (Active Flow view)
- **Simplification:** No sorting, no filtering, no search

### 4.4 Update API Client ⏳
- **File:** `frontend/src/api.ts` (MODIFY)
- Add methods:
  ```typescript
  flowInstances: {
    create: (flowId: number, data: { title: string; description?: string }) => Promise<FlowInstance>
  },
  tasks: {
    get: (taskId: number) => Promise<TaskInstance>,
    complete: (taskId: number, formData: Record<string, any>) => Promise<FlowInstance>
  }
  ```

### 4.5 Update Navigation ⏳
- **File:** `frontend/src/components/Layout.tsx` (MODIFY)
- Add "New Task" button to navbar (primary CTA)

### 4.6 Update Routing ⏳
- **File:** `frontend/src/App.tsx` (MODIFY)
- Add routes:
  ```tsx
  <Route path="/new-task" element={<NewTask />} />
  <Route path="/flows/:id" element={<ActiveFlow />} />
  ```

**Phase 4 Estimated Time:** 4-5 hours

---

## Phase 5: Testing & Polish ⏳

### 5.1 End-to-End Test Flow ⏳
1. Create flow template: "Blog Post Pipeline"
   - Stage 1: Drafting (assigned to Writer)
   - Stage 2: Review (assigned to Editor)
   - Stage 3: Publish (assigned to Admin)
2. Initiate new task via "New Task" button
3. Verify task appears in Writer's "My Tasks"
4. Complete Stage 1 with form data
5. Verify task appears in Editor's "My Tasks"
6. Complete Stage 2
7. Verify task appears in Admin's "My Tasks"
8. Complete Stage 3
9. Verify flow marked as Completed
10. Verify flow no longer in anyone's "My Tasks"

### 5.2 Basic Error Handling ⏳
- Add try/catch blocks around API calls
- Display user-friendly error messages (alerts for POC)
- Handle missing/invalid data gracefully

### 5.3 UI Polish ⏳
- Ensure consistent Daisy UI styling
- Add loading states for async operations
- Add success messages after completing tasks

**Phase 5 Estimated Time:** 1-2 hours

---

## Success Criteria (POC)

- ✅ User can create a flow template with 3 stages (DONE)
- ✅ User can initiate a new flow instance
- ✅ First assignee sees task in "My Tasks"
- ✅ User can view task detail with form fields
- ✅ User can complete stage with form data
- ✅ Next assignee receives task automatically
- ✅ Elapsed time displays accurately
- ✅ Flow completes at final stage
- ✅ No crashes or major bugs in happy path

---

## What We're NOT Building (Deferred)

### Post-POC Phase 1 (After Demo)
- Admin active flows list view (all flows across users) with diagram support
- Flow filtering and sorting
- Activity logs display
- Approval stage logic (approve/reject)
- Better form validation and error messages
- Interactive flow diagram (click stages to navigate)
- Diagram export (PNG, SVG)
- Flow Designer diagram preview (separate from editing interface)

### Post-POC Phase 2 (Future)
- Task reassignment and delegation
- Role-based permission enforcement
- Public request forms
- Email notifications
- Stalled status detection
- File attachment support
- Comments and @mentions
- Due dates and SLA tracking

---

## File Checklist

### To Create
- [ ] `backend/app/services/task_assignment.py`
- [ ] `backend/app/routers/flow_instances.py`
- [ ] `backend/app/routers/tasks.py`
- [ ] `frontend/src/components/FormRenderer.tsx`
- [ ] `frontend/src/components/TimerDisplay.tsx`
- [ ] `frontend/src/components/FlowProgress.tsx`
- [ ] `frontend/src/components/FlowDiagram.tsx`
- [ ] `frontend/src/pages/NewTask.tsx`
- [ ] `frontend/src/pages/ActiveFlow.tsx`

### To Modify
- [ ] `backend/app/main.py` (register routers)
- [ ] `backend/app/routers/users.py` (implement /me/tasks)
- [ ] `frontend/src/api.ts` (add flowInstances, tasks methods)
- [ ] `frontend/src/App.tsx` (add routes)
- [ ] `frontend/src/components/Layout.tsx` (add "New Task" button)
- [ ] `frontend/src/pages/MyTasks.tsx` (populate with real data)

---

## Estimated Timeline

**Total POC Time:** 11-15 hours (2-3 focused work days)

| Phase | Time Estimate | Status |
|-------|---------------|--------|
| Phase 1: Backend Models | 2 hours | ⚠️ ROLLED BACK - needs re-implementation |
| Phase 2: Backend API | 3-4 hours | ⏳ BLOCKED (waiting for Phase 1) |
| Phase 3: Frontend Components | 3-4 hours | ⏳ PENDING |
| Phase 4: Frontend Pages | 4-5 hours | ⏳ PENDING |
| Phase 5: Testing & Polish | 1-2 hours | ⏳ PENDING |

**Note:** Added 1 hour for FlowDiagram component with Mermaid-style visualization (Active Flows & My Tasks only)

---

## Next Immediate Actions (Updated After Rollback)

**Priority: Re-implement Phase 1 (Backend Core) first**

1. ⚠️ Re-create flow execution models (`flow_instance.py`)
2. ⚠️ Re-create flow execution schemas (`flow_instance.py` in schemas)
3. ⚠️ Generate new Alembic migration
4. ⚠️ Apply migration to database
5. ⚠️ Verify model exports and registration
6. Create `task_assignment.py` service
7. Create `flow_instances.py` router with POST and GET endpoints
8. Create `tasks.py` router with POST complete endpoint
9. Modify `users.py` to implement real /me/tasks
10. Register routers in `main.py`
11. Test all endpoints via Swagger UI
12. Build frontend components (FormRenderer, Timer, Progress, Diagram)
13. Build NewTask page
14. Build ActiveFlow page
15. Update MyTasks page with real data and diagram support
16. End-to-end test

---

## Development Methodology: Context7 Approach

**IMPORTANT:** This implementation follows the **Context7 methodology** as defined in CLAUDE.md and `.claude/WORKFLOW.md`.

### Context7 Principles

All code changes must follow this structured approach:

1. **Understand Context**
   - Review relevant files and architecture before making changes
   - Understand dependencies and relationships
   - Check CLAUDE.md for architectural constraints

2. **Plan with TodoWrite**
   - Break work into clear, trackable tasks
   - Use TodoWrite tool at the start of any multi-step work
   - Keep exactly ONE task as "in_progress" at a time
   - Mark tasks completed immediately after finishing

3. **Make Atomic Changes**
   - One focused change at a time
   - Each change should be testable independently
   - Avoid batching multiple unrelated fixes

4. **Document as You Go**
   - Update CLAUDE.md for architectural changes
   - Add inline comments for complex logic
   - Keep documentation in sync with code

5. **Test Before Moving On**
   - Verify each change works before proceeding
   - Check dev server output for errors
   - Use defensive programming patterns (array safety, null checks)

6. **Follow Standards**
   - Adhere to AI Garage architecture specifications
   - Use approved services only (GCP, AI Garage, Anthropic)
   - Maintain consistency with existing code patterns

7. **Ask When Uncertain**
   - Use AskUserQuestion for clarification
   - Don't assume or guess requirements
   - Prefer explicit confirmation over implicit assumptions

### Context7 Implementation in This Plan

This POC implementation demonstrates Context7 best practices:

1. **Context Understanding:**
   - Reviewed existing codebase (FlowDesigner, MyTasks, models)
   - Analyzed PRD requirements and architectural constraints
   - Identified gap: Flow Execution is the critical missing piece

2. **Planning with TodoWrite:**
   - This plan will be tracked using TodoWrite for each phase
   - One task in-progress at a time
   - Immediate completion marking after verification

3. **Atomic Changes:**
   - Each endpoint/component is a separate, testable unit
   - Backend first (data layer), then frontend (presentation layer)
   - No mixing of unrelated features

4. **Documentation:**
   - This plan documents all architectural decisions
   - ADRs capture compliance reasoning
   - Inline comments will explain complex logic (assignment resolution, form data handling)

5. **Testing First:**
   - Each backend endpoint tested via Swagger UI before frontend integration
   - Each frontend component tested in isolation
   - End-to-end test scenario defined in Phase 5

6. **Standards Adherence:**
   - Explicit AI Garage Standards Compliance section
   - Only approved services (GCP, AI Garage, Anthropic)
   - Clear migration path from POC to production

7. **Clarification Built-In:**
   - Plan identifies simplifications vs. future features
   - Deferred items explicitly listed
   - Production considerations documented upfront

---

## Architecture Decisions (POC)

### Simplifications for Speed
1. **No pagination** - Load all tasks/templates (fine for POC scale)
2. **No caching** - Fetch fresh data on every page load
3. **Basic validation** - Required fields only, no complex rules
4. **Alert dialogs** - Use browser alerts instead of toast notifications
5. **No optimistic updates** - Wait for API responses before updating UI
6. **Static timer** - Calculate elapsed time on load (no live updates)
7. **First user in role** - ROLE assignment picks first user without rotation logic

### What We're Keeping Simple
- Form data stored as JSON (no type coercion or validation)
- Linear stage progression (no branching)
- Single assignee per stage (no parallel assignments)
- Auto-assignment only (no manual override in POC)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Timer complexity | ✅ Store start timestamp, calculate on-the-fly |
| Assignment resolution | ✅ Simple service with clear branching |
| Form data schema | ✅ Use JSON field for flexibility |
| Missing error handling | Add try/catch around all API calls |
| UI state bugs | Use defensive programming (array safety, null checks) |

---

## Post-POC Priorities

**Once POC is working, prioritize in this order:**

1. **Admin Task List** - View all tasks across users (Feature 3.1 from PRD)
2. **Activity Logs** - Display audit trail in task detail
3. **Approval Stages** - Add approve/reject buttons (Feature 4.2 from PRD)
4. **Task Reassignment** - Allow manual assignee changes (Feature 4.3 from PRD)
5. **Better Error Handling** - Toast notifications instead of alerts
6. **Form Validation** - Field-level validation beyond required
7. **Role-Based Permissions** - Enforce admin vs member capabilities

---

## AI Garage Standards Compliance

This implementation plan strictly adheres to the AI Garage architecture specifications defined in CLAUDE.md:

### ✅ Technology Stack Compliance

**Backend (Approved):**
- ✅ **Language:** Python (as specified)
- ✅ **Framework:** FastAPI (as specified)
- ✅ **Database:** PostgreSQL via Cloud SQL (currently local for development, production-ready for GCP)
- ✅ **ORM:** SQLAlchemy (standard Python ORM)
- ✅ **Migrations:** Alembic (standard for SQLAlchemy)

**Frontend (Approved):**
- ✅ **Framework:** React with TypeScript (as specified)
- ✅ **Styling:** Tailwind CSS + Daisy UI (as specified)
- ✅ **Build Tool:** Vite (standard for React)
- ✅ **Type Safety:** TypeScript for all components (as specified)

**Authentication (Approved):**
- ✅ **Current:** JWT tokens with development mode bypass
- ✅ **Production Path:** Firebase Authentication (GCP) - documented for future migration
- ✅ **Note:** Using standard JWT temporarily; Firebase Auth integration is POC deferral, not architectural deviation

**Hosting & Deployment (Approved):**
- ✅ **Target:** Cloud Run (GCP) for containerized deployment
- ✅ **Current:** Local development servers (standard practice)
- ✅ **Production Ready:** Docker configuration will use Cloud Run (GCP approved)

**File Storage (Future):**
- ✅ **Planned:** Cloud Storage Buckets (GCP) when file attachments are implemented (post-POC)

### ✅ Vendor Compliance

All services use approved vendors only:
- ✅ **GCP (Google Cloud Platform):** PostgreSQL via Cloud SQL, Firebase Auth (future), Cloud Run, Cloud Storage
- ✅ **AI Garage:** No custom garage services needed for this POC
- ✅ **Anthropic:** Not applicable for this application

### ❌ Services NOT Used (Compliance Verified)

**Prohibited/Unapproved Services:**
- ❌ AWS services (not using)
- ❌ Azure services (not using)
- ❌ MongoDB or other non-approved databases (not using)
- ❌ Auth0 or other third-party auth (not using)
- ❌ Netlify, Vercel, or other non-GCP hosting (not using)

### 📋 Production Deployment Considerations (Post-POC)

When moving to production, ensure:
1. **Database:** Migrate from local PostgreSQL to GCP Cloud SQL
2. **Authentication:** Complete Firebase Authentication integration
3. **Hosting:** Deploy backend to Cloud Run (containerized)
4. **Hosting:** Deploy frontend to Cloud Run or Cloud Storage + CDN
5. **File Storage:** Use Cloud Storage Buckets for attachments
6. **Environment Variables:** Use GCP Secret Manager

### Architecture Decision Records (ADRs)

**ADR-001: Local PostgreSQL for POC**
- **Decision:** Use local PostgreSQL during POC development
- **Rationale:** Faster iteration, no cloud costs during development
- **Compliance:** PostgreSQL is approved; local vs. Cloud SQL is deployment detail
- **Migration Path:** Direct migration to Cloud SQL using same schema

**ADR-002: JWT Tokens with Development Mode Bypass**
- **Decision:** Implement JWT authentication with temporary development bypass
- **Rationale:** Unblocks development while Firebase Auth integration is deferred
- **Compliance:** Firebase Authentication (GCP) is the approved service for production
- **Migration Path:** Replace JWT validation with Firebase Auth SDK (documented in CLAUDE.md)

**ADR-003: No AI/LLM Integration in POC**
- **Decision:** Defer any AI features to post-POC phases
- **Rationale:** Core workflow management doesn't require AI
- **Compliance:** If AI features are added later, use Vertex AI (GCP) or Claude (Anthropic) only

**ADR-004: Mermaid-Style Flow Diagram Visualization**
- **Decision:** Add FlowDiagram component to visualize flow stages in diagram format
- **Rationale:** Visual flow representation improves user understanding and process clarity
- **Implementation:** Use Mermaid.js library or custom CSS/SVG for linear flow diagrams
- **Scope:** Available in Active Flows and My Tasks pages only (NOT in Flow Designer for POC)
- **Compliance:** Standard frontend library, no additional services required
- **Future:** Flow Designer preview mode can be added post-POC

---

## Notes

- Database schema is complete and flexible enough for POC + future features
- Frontend TypeScript types already defined in `types.ts`
- Authentication is disabled in dev mode (no blocker)
- All patterns (models, schemas, routers) are established and easy to follow
- Focus on happy path first, add error handling after core flow works
- **AI Garage Standards:** This plan strictly follows approved services and vendors as defined in CLAUDE.md
- **Context7 Methodology:** This plan demonstrates Context7 best practices (context understanding, atomic changes, testing first)
- **Flow Visualization:** Mermaid-style diagram component added for Active Flows and My Tasks views (NOT in Flow Designer)
