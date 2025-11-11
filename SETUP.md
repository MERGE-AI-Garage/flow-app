# Quick Setup Guide

## 1. Install Dependencies

```bash
# Python backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

## 2. Configure Environment

Create `.env` file in the root directory:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/flow_db
SECRET_KEY=generate-with-openssl-rand-hex-32

# Optional (for Google OAuth)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

## 3. Setup Database

### Option A: Local PostgreSQL

Install PostgreSQL and create database:
```bash
createdb flow_db
```

### Option B: Google Cloud SQL

```bash
# Create instance
gcloud sql instances create flow-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create flow_db --instance=flow-db

# Create user
gcloud sql users create flow_user \
  --instance=flow-db \
  --password=YOUR_PASSWORD

# Update .env with connection string
# DATABASE_URL=postgresql://flow_user:YOUR_PASSWORD@/flow_db?host=/cloudsql/PROJECT:REGION:INSTANCE
```

## 4. Run Migrations

```bash
alembic upgrade head
```

## 5. Start the Application

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 7. Create Your First User

1. Navigate to http://localhost:3000/register.html
2. Register with email and password
3. You'll be automatically logged in and redirected to My Tasks

## Troubleshooting

**"No module named pydantic_settings"**
```bash
pip install pydantic-settings
```

**"relation does not exist"**
```bash
alembic upgrade head
```

**Frontend build errors**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Database connection errors**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- For Cloud SQL, ensure Cloud SQL Proxy is running
