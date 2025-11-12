# Flow App - Google Cloud Run Deployment Guide

This guide provides step-by-step instructions for deploying the Flow application to Google Cloud Run.

## Prerequisites

- Google Cloud account with billing enabled
- GitHub repository for the Flow app
- `gcloud` CLI installed and authenticated
- PostgreSQL database (Cloud SQL recommended for production)

## Architecture

The deployment uses a single Docker container that includes:
- **Frontend**: Vite-built static files (vanilla JS + Tailwind CSS)
- **Backend**: FastAPI application serving both API and static files
- **Database**: PostgreSQL via Cloud SQL (or external PostgreSQL)

## Setup Steps

### 1. Create GCP Project

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Create the project
gcloud projects create $flow-proto-478014

# Set as active project
gcloud config set project $flow-proto-478014

# Link billing account (required)
gcloud billing projects link $flow-proto-478014 --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create flow-app \
  --repository-format=docker \
  --location=us-central1 \
  --description="Flow app Docker images"
```

### 4. Set Up Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance
gcloud sql instances create flow-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create flow_db --instance=flow-db

# Create database user
gcloud sql users create flow_user \
  --instance=flow-db \
  --password=YOUR_SECURE_PASSWORD

# Get connection name (save this for later)
gcloud sql instances describe flow-db --format='value(connectionName)'
# Output format: PROJECT_ID:REGION:INSTANCE_NAME
```

### 5. Generate Secrets

```bash
# Generate a secure SECRET_KEY for JWT tokens
openssl rand -hex 32

# Save this value - you'll need it for GitHub secrets
```

### 6. Set Up Workload Identity Federation

This allows GitHub Actions to authenticate with GCP without storing service account keys.

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --description="Service account for GitHub Actions" \
  --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Bind service account to workload identity
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/flow-app"

# Get the Workload Identity Provider resource name (save for GitHub secrets)
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

### 7. Configure GitHub Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `WIF_PROVIDER_DEV` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` | Workload Identity Provider |
| `WIF_SERVICE_ACCOUNT_DEV` | `github-actions@PROJECT_ID.iam.gserviceaccount.com` | Service account email |
| `CLOUD_SQL_CONNECTION_NAME_DEV` | `PROJECT_ID:REGION:INSTANCE_NAME` | Cloud SQL connection name |
| `DATABASE_URL_DEV` | `postgresql://flow_user:PASSWORD@/flow_db?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME` | Database connection string |
| `SECRET_KEY` | Generated from step 5 | JWT secret key |
| `GOOGLE_CLIENT_ID` | From Google OAuth Console | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | From Google OAuth Console | Google OAuth client secret |

### 8. Set Up Google OAuth

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `https://YOUR-SERVICE-NAME-HASH.run.app/auth/google/callback` (you'll update this after first deployment)
   - `http://localhost:8000/auth/google/callback` (for local development)
5. Save the Client ID and Client Secret for GitHub secrets

### 9. Update Deployment Configuration

Edit `.github/workflows/deploy-dev.yml` and update:

```yaml
env:
  PROJECT_ID: your-project-id  # Your GCP project ID
  REGION: us-central1  # Your preferred region
  SERVICE_NAME: flow-app-dev  # Your service name
  ARTIFACT_REPO: flow-app  # Your Artifact Registry repo name
```

### 10. Deploy

Push to your configured branch (default: `main`):

```bash
git add .
git commit -m "Configure Cloud Run deployment"
git push origin main
```

Monitor the deployment in the GitHub Actions tab.

### 11. Post-Deployment

After first successful deployment:

1. Get your service URL:
   ```bash
   gcloud run services describe flow-app-dev \
     --region=us-central1 \
     --format='value(status.url)'
   ```

2. Update Google OAuth redirect URI with the actual service URL

3. Run database migrations (if needed):
   ```bash
   # Connect to Cloud SQL and run migrations
   gcloud sql connect flow-db --user=flow_user
   # Then run: alembic upgrade head
   ```

4. Test the application at your service URL

## Local Testing

Test the Docker build locally before deploying:

```bash
# Build the image
docker build -t flow-app:local .

# Run locally
docker run -p 8080:8080 \
  -e DATABASE_URL="your-local-db-url" \
  -e SECRET_KEY="your-secret-key" \
  -e GOOGLE_CLIENT_ID="your-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-client-secret" \
  -e GOOGLE_REDIRECT_URI="http://localhost:8080/auth/google/callback" \
  -e FRONTEND_URL="http://localhost:8080" \
  -e BACKEND_URL="http://localhost:8080" \
  flow-app:local

# Test
curl http://localhost:8080/health
```

## Environment Variables

The application requires these environment variables in Cloud Run:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@/db?host=/cloudsql/...` |
| `SECRET_KEY` | JWT signing key | Random hex string |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `30` |
| `GOOGLE_CLIENT_ID` | OAuth client ID | From Google Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | From Google Console |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `https://yourapp.run.app/auth/google/callback` |
| `FRONTEND_URL` | Frontend base URL | Same as service URL |
| `BACKEND_URL` | Backend base URL | Same as service URL |

## Troubleshooting

### Build Failures

- Check GitHub Actions logs for build errors
- Verify all dependencies in `requirements.txt` and `package.json`
- Test Docker build locally

### Deployment Failures

- Verify Workload Identity Federation is correctly configured
- Check that all required APIs are enabled
- Ensure service account has necessary permissions

### Database Connection Issues

- Verify Cloud SQL connection name is correct
- Check that `--add-cloudsql-instances` flag is set in deployment
- Ensure database user has proper permissions

### OAuth Issues

- Verify redirect URI matches exactly (including protocol and path)
- Check that OAuth credentials are correctly set in secrets
- Ensure OAuth consent screen is configured

## Cost Optimization

- **Cloud Run**: Only pay when requests are being processed
  - Set `--min-instances=0` for development (cold starts)
  - Increase for production if needed
- **Cloud SQL**:
  - Use `db-f1-micro` for development ($7-10/month)
  - Upgrade to `db-g1-small` or higher for production
  - Consider connection pooling (PgBouncer)

## Security Best Practices

1. **Never commit secrets** to Git
2. **Use Secret Manager** for sensitive values in production
3. **Restrict Cloud Run access** with IAM if needed
4. **Enable Cloud SQL SSL** for production
5. **Rotate secrets** regularly
6. **Use private networking** for Cloud SQL (not public IP)
7. **Set up Cloud Armor** for DDoS protection if needed

## Monitoring

Set up monitoring and logging:

```bash
# View logs
gcloud run services logs read flow-app-dev --region=us-central1

# Set up alerts in Cloud Monitoring
# - Response latency
# - Error rate
# - Database connection pool exhaustion
```

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
