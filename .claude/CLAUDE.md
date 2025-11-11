# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flow is a visual, lightweight workflow management tool designed for small teams to manage linear, repeatable processes with clear handoffs between roles. The core philosophy is **clarity of process** - answering "Who has it now?" and "What needs to be done next?"

### Key Differentiators
- NOT a Kanban board or flexible to-do list
- Designed for LINEAR workflows only (no branching in v1.0)
- Focus on process visibility and handoff management
- Simple, auditable path for each task

### Core Problem Statement
Teams struggle with:
- **Process bottlenecks:** Unclear responsibility leads to stalled tasks
- **No clear end states:** Tasks need to be completed, terminated, or marked as stalled
- **Repetitive manual work:** Email chains and spreadsheet trackers create friction

### Target Users
- **Requesters/Intranet Users:** Employees submitting requests via simple web forms
- **Operations Leads:** Process managers needing visibility into multi-stage processes and bottleneck identification

### Sample Use Cases
- HR: New Hire Onboarding
- Procurement: Vendor Approval
- Accounts Payable: Invoice Processing
- Marketing: Blog Post Pipeline
- IT: Employee Offboarding

## Repository Information

- **GitHub Repository**: https://github.com/ssmidt-merge/flow-app
- **PRD**: See flow_prd.md for complete product requirements and technical specifications

## Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (local or Google Cloud SQL)

### Quick Start
```bash
# Backend (Terminal 1)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Environment Configuration
Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret (generate with `openssl rand -hex 32`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials

### Running Tests
```bash
# Backend tests
pytest

# Frontend (when implemented)
cd frontend && npm test
```

## Architecture

### Tech Stack
- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Frontend**: Vanilla JavaScript with Tailwind CSS via Vite
- **Database**: PostgreSQL (Google Cloud SQL for production)
- **Authentication**: JWT tokens + Google OAuth 2.0

### Project Structure
```
backend/app/
  ├── core/          # Config, database, security, dependencies
  ├── models/        # SQLAlchemy models (User, Flow, etc.)
  ├── routers/       # API endpoints grouped by domain
  └── schemas/       # Pydantic request/response schemas

frontend/
  ├── src/
  │   ├── pages/     # Page-specific JavaScript modules
  │   ├── api.js     # Centralized API client with auth
  │   └── style.css  # Tailwind CSS with custom components
  ├── *.html         # Multi-page application
  └── vite.config.js # Build configuration

alembic/             # Database migration scripts
```

### Authentication Flow
1. User logs in via email/password or Google OAuth
2. Backend issues JWT token with user email as subject
3. Frontend stores token in localStorage
4. All API requests include `Authorization: Bearer {token}` header
5. Backend validates token via `get_current_user` dependency

### API Patterns
- REST endpoints prefixed by domain (`/auth`, `/users`, `/flows`)
- Pydantic schemas for request validation and response serialization
- SQLAlchemy models with relationship loading
- Dependency injection for database sessions and auth

### Database Conventions
- All tables use `id` as primary key (Integer, auto-increment)
- Timestamps: `created_at` and `updated_at` (UTC, auto-managed)
- Soft deletes not implemented (use `is_active` flags where needed)
- Enums defined as Python enums and stored as PostgreSQL enum types

### Frontend State Management
- No framework - uses vanilla JavaScript with ES modules
- Authentication state in localStorage
- API client (api.js) handles token injection and 401 redirects
- Each page is self-contained with its own JS module

## Implementation Status

### Feature 1: Authentication & My Tasks View (P0) ✅
- [x] Email/password registration and login
- [x] Google OAuth integration
- [x] JWT-based authentication
- [x] "My Tasks" view (currently empty, will populate when flows exist)
- [x] User profile management

### Next: Feature 2: Flow Designer (P0)
- [ ] Flow Template model (stages, assignments, form fields)
- [ ] Flow Role model and management
- [ ] Visual flow designer UI with drag-and-drop
- [ ] Stage-level form builder
- [ ] Approval stage configuration
