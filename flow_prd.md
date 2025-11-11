# Flow - Product Requirements Document

**Version:** 2.2  
**Status:** Draft  
**Last Updated:** October 26, 2025

## Project Overview

Flow is a visual, lightweight workflow management tool designed for small teams to manage linear, repeatable processes with clear handoffs between roles. The core philosophy is **clarity of process** - answering "Who has it now?" and "What needs to be done next?"

### Key Differentiators
- NOT a Kanban board or flexible to-do list
- Designed for LINEAR workflows only (no branching in v1.0)
- Focus on process visibility and handoff management
- Simple, auditable path for each task

## Core Problem Statement

Teams struggle with:
- **Process bottlenecks:** Unclear responsibility leads to stalled tasks
- **No clear end states:** Tasks need to be completed, terminated, or marked as stalled
- **Repetitive manual work:** Email chains and spreadsheet trackers create friction

## Target Users

### Persona 1: Sam (Requester/Intranet User)
- **Role:** Employee in any department (e.g., Sales)
- **Need:** Simple web form to submit requests (e.g., "New Vendor Approval")
- **Pain Point:** Current process uses Word docs, email, with no visibility

### Persona 2: Alex (Operations Lead)
- **Role:** Process manager (e.g., HR, Operations)
- **Need:** Visibility into multi-stage processes, bottleneck identification
- **Pain Point:** Can't see "who has it" or if something is stalled

## Sample Use Cases

1. **HR: New Hire Onboarding**  
   Offer Accepted → Background Check → IT Setup → Welcome & Orientation → Completed

2. **Procurement: Vendor Approval**  
   Submit Vendor → Security Review → Budget Approval → Legal Review → Vendor Active

3. **Accounts Payable: Invoice Processing**  
   Submit Invoice → Manager Approval → Process Payment → Payment Sent

4. **Marketing: Blog Post Pipeline**  
   Drafting → Graphic Design → Final Review → Staged for Publish → Published

5. **IT: Employee Offboarding**  
   Termination Set → Deactivate Accounts → Retrieve Equipment → Final Paycheck → Archive

## Technical Architecture

### User Authentication
- Email/password or Google Auth required
- All users must have accounts (except public request form submissions)

### Core Data Models

#### Flow Template (Flow Designer)
- Linear sequence of stages (vertical, top-to-bottom)
- Each stage has:
  - Name (string)
  - Assignment (User | Role | Initiator | External Guest)
  - Step Description (instructions)
  - Form Fields (text, number, date, attachment, checkbox)
  - Required fields flag
  - Approval stage flag (optional)
  - Expected duration (P1 feature)

#### Flow Role
- Simple role definition (e.g., "Designer", "Writer")
- Multiple users can be assigned to one role

#### Active Flow (Task Instance)
- Running instance of a Flow Template
- Tracks:
  - Current stage
  - Current assignee(s)
  - Total elapsed time (stopwatch)
  - Stage completion history
  - All collected form data
  - Status: Active | Completed | Terminated | Stalled (P1)

#### User Roles (Board-Level)
- **Admin:** Full control (create/edit flows, manage settings, add members)
- **Member:** Can be assigned tasks, create new tasks, complete assigned stages
- **Guest:** External users, only see/act on their assigned stages

## Feature Requirements: P0 (Must-Haves)

### Feature 1: Authentication & My Tasks View
- **1.1:** User login (email/password or Google Auth)
- **1.2:** Default view: "My Tasks" - personal inbox of currently assigned tasks, organized by flow type

### Feature 2: Flow Designer (Template Builder)
- **2.1:** Visual flow editor
  - Vertical, top-to-bottom stage display
  - Add stage button
  - Delete stage capability
  - Drag-and-drop reordering
- **2.2:** Stage naming
- **2.3:** Stage assignment to User | Role | Initiator | External Guest
- **2.4:** Flow role management (create roles, assign users)
- **2.5:** Mark stages as "Approval Stage"
- **2.6:** Stage-level form builder
  - Add step description/instructions
  - Add form fields: Text, Number, Date, Attachment, Checkbox
  - Mark fields as Required

### Feature 3: Active Flows (Task Views)
- **3.1:** Admin task list view showing:
  - Task title
  - Current stage
  - Current assignee
  - Total elapsed time
  - Stalled status (P1)
  - Sortable columns
- **3.2:** Flow initiation methods:
  - **3.2.a:** Manual "New Task" button (authenticated users)
  - **3.2.b:** Public request form (auto-generated from Stage 1 fields, shareable URL, no auth required)
- **3.3:** Task detail view:
  - Visual flow display (vertical, current stage highlighted)
  - Total elapsed time (prominent)
  - Stage form (current stage description + fields)
  - Read-only data from previous stages
  - Primary action button (e.g., "Complete & Handoff to Design") - disabled until required fields filled
  - Standard task details: title, description, checklist, attachments, comments with @mentions
  - Activity feed (chronological log of all actions)
- **3.4:** Total flow time tracking:
  - Auto-start timer on flow initiation
  - Display elapsed time (days, hours, minutes) in list and detail views
  - Stop timer on Completed or Terminated

### Feature 4: Handoffs & Approvals
- **4.1:** Standard handoff:
  - Mark current stage complete
  - Move to next stage
  - Reassign to next stage's role/user
  - Notify new assignee (appears in their "My Tasks")
- **4.2:** Approval handoff (for approval stages):
  - "Approve" button → move to next stage
  - "Request Changes" button → move to previous stage, reassign to that stage's owner
  - Both disabled until required fields completed
- **4.3:** Delegation & manual reassignment:
  - **4.3.a:** Admin can reassign current stage to any user
  - **4.3.b:** User can delegate their task to another user (original user becomes watcher)

### Feature 5: Roles & Permissions
- **5.1:** Board-level roles (Admin, Member, Guest)
- **5.2:** Member invites via email (Admin capability)

## Feature Requirements: P1 (Should-Haves)

- **Email Integration (Inbound):** Unique email address per flow to initiate tasks
- **Embeddable Request Form:** HTML snippet for external websites/intranets
- **Due Dates & Expected Timelines:**
  - Final due date for entire flow
  - Expected stage duration in Flow Designer
  - Auto-flag "Stalled" status when stage exceeds expected time
- **Flow States (Terminate & Archive):**
  - "Terminate Flow" button for admins
  - Archive view showing Completed, Terminated, and Stalled flows with total elapsed time
- **Labels/Tags:** Color-coded task categorization
- **Flow Templates:** Pre-built templates for common use cases

## Non-Goals (Out of Scope for v1.0)

- ❌ NO Kanban boards (all views are list-based)
- ❌ NO branching logic or decision nodes
- ❌ NO complex permissions
- ❌ NO time tracking, budgeting, or invoicing features
- ❌ NO on-premise installation (cloud/SaaS only)

## Design & UX Requirements

- **Responsive & Mobile-First:** Seamless on desktop and mobile browsers
- **Clean & Modern:** Uncluttered interface with subtle animations
- **Friendly & Encouraging:** Positive feedback throughout user journey

## Future Roadmap (v2.0+)

- Email reply-to-approve for external guests
- Conditional branching (if-then logic)
- Parallel stages (simultaneous execution)
- Advanced reporting dashboards
- Gantt chart timeline views
- AI-assisted voice/interview mode for form entry

## Technical Considerations for Implementation

### Required Functionality
1. User authentication system
2. Database schema for:
   - Users and roles
   - Flow templates (stages, fields, assignments)
   - Active flow instances
   - Form data storage
   - Activity logs
3. Timer/stopwatch service for elapsed time tracking
4. Notification system (in-app, email)
5. Public URL generation for request forms
6. Drag-and-drop UI for flow designer
7. Form builder with field validation
8. Real-time task list updates

### Key UI Components
- Flow Designer (admin interface)
- My Tasks list (user default view)
- Task detail view with stage progress indicator
- Form renderer (dynamic based on stage configuration)
- Activity feed component
- Admin task list with filters/sorting

### Data Flow
1. Admin creates Flow Template in Flow Designer
2. User initiates task (manual or via request form)
3. Task enters first stage, assigned to configured role/user
4. User completes stage form, clicks handoff button
5. System validates required fields
6. System updates task stage, reassigns, logs activity
7. Process repeats until flow reaches final stage or is terminated

### Security & Privacy
- Role-based access control (Admin, Member, Guest)
- Public forms must be rate-limited
- External guests only see their assigned tasks
- Activity logs for audit trail