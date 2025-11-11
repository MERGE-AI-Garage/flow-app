# Flow - Workflow Management Application

A visual, lightweight workflow management tool designed for small teams to manage linear, repeatable processes with clear handoffs between roles.

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Database**: PostgreSQL (Google Cloud SQL)
- **Authentication**: JWT + Google OAuth

## Project Structure

```
flow-app/
├── backend/
│   └── app/
│       ├── core/          # Configuration, database, security
│       ├── models/        # SQLAlchemy models
│       ├── routers/       # API endpoints
│       └── schemas/       # Pydantic schemas
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page-specific JS
│   │   ├── api.js         # API client
│   │   └── style.css      # Tailwind styles
│   ├── index.html         # My Tasks page
│   ├── login.html         # Login page
│   └── register.html      # Registration page
└── alembic/               # Database migrations
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL database (local or Google Cloud SQL)

### 1. Clone and Setup Environment

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

#### For Local PostgreSQL:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/flow_db
SECRET_KEY=your-secret-key-generate-with-openssl-rand-hex-32
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

#### For Google Cloud SQL:
```env
# Using Unix socket (recommended for Cloud Run)
DATABASE_URL=postgresql://user:password@/flow_db?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME

# Or using TCP (for Cloud SQL Proxy)
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/flow_db
```

### 3. Setup Google Cloud SQL (Production)

```bash
# Create Cloud SQL instance
gcloud sql instances create flow-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create flow_db --instance=flow-db

# Create user
gcloud sql users create flow_user \
  --instance=flow-db \
  --password=YOUR_SECURE_PASSWORD

# Get connection name
gcloud sql instances describe flow-db --format="value(connectionName)"
```

### 4. Run Database Migrations

```bash
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### 5. Run the Application

#### Development Mode:

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 6. Setup Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URIs:
   - http://localhost:8000/auth/google/callback (development)
   - https://your-domain.com/auth/google/callback (production)
6. Copy Client ID and Secret to `.env` file

## Feature 1 Implementation Status ✅

**Feature 1: Authentication & My Tasks View (P0)**

- ✅ **1.1**: User login with email/password
- ✅ **1.1**: Google OAuth integration
- ✅ **1.2**: "My Tasks" default view (inbox of assigned tasks)

### API Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `GET /auth/google/login` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback

#### Users
- `GET /users/me` - Get current user info
- `GET /users/me/tasks` - Get user's assigned tasks (My Tasks)

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `hashed_password` - Bcrypt hashed password (nullable for OAuth-only users)
- `full_name` - User's full name
- `role` - User role (admin, member, guest)
- `is_active` - Account status
- `google_id` - Google OAuth identifier
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

## Next Steps

To continue development with Feature 2 (Flow Designer):

1. Create Flow Template model
2. Create Flow Role model
3. Implement flow designer UI
4. Add drag-and-drop stage management
5. Implement form builder for stages

## Troubleshooting

### Database Connection Issues

**Local PostgreSQL:**
```bash
# Check if PostgreSQL is running
pg_isready

# Create database manually if needed
createdb flow_db
```

**Google Cloud SQL:**
```bash
# Use Cloud SQL Proxy for local development
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
```

### Common Errors

1. **"Could not validate credentials"**
   - Check if JWT token is valid
   - Ensure SECRET_KEY is set in .env

2. **"Connection refused" (database)**
   - Verify DATABASE_URL is correct
   - Check if database service is running

3. **Google OAuth not working**
   - Verify redirect URI matches Google Console
   - Check GOOGLE_CLIENT_ID and SECRET are set

## License

Proprietary - All rights reserved
