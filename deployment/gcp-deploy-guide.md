# GCP Cloud Run Deployment Guide

This guide walks through setting up automated deployments to Google Cloud Run using GitHub Actions.

## Prerequisites

- GCP account with billing enabled
- GitHub repository
- `gcloud` CLI installed and authenticated

## Setup Steps

### 1. Create GCP Project

```bash
gcloud projects create PROJECT_ID
```

Replace `PROJECT_ID` with your desired project identifier.

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com  # Only if using Cloud SQL
```

### 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create REPO_NAME \
  --repository-format=docker \
  --location=us-central1
```

Replace `REPO_NAME` with your desired repository name.

### 4. Set Up Workload Identity Federation

Configure Workload Identity Federation to allow GitHub Actions to authenticate with GCP without storing service account keys.

- Refer to [GCP documentation](https://cloud.google.com/iam/docs/workload-identity-federation)
- Or check existing setup in `.github/workflows/deploy-*.yml` files for reference

### 5. Copy Workflow Template

Use `deploy-dev.yml` as a template for your deployment workflow:

```bash
cp .github/workflows/deploy-dev.yml .github/workflows/deploy-YOUR-ENV.yml
```

### 6. Update Workflow Configuration

Edit your new workflow file and update the following values:

- **PROJECT_ID**: Your GCP project ID
- **SERVICE_NAME**: Name for your Cloud Run service
- **REGION**: GCP region (e.g., `us-central1`)
- **Branch trigger**: Set the branch that triggers deployment
- **Environment variables**: Remove any unnecessary env vars or secrets specific to the template

### 7. Add GitHub Secrets

Navigate to your repository: **Settings > Secrets and variables > Actions**

Add any required secrets for your deployment (e.g., database credentials, API keys).

### 8. Create Dockerfile

Copy the existing Dockerfile from this project and adapt it for your application:

```bash
cp Dockerfile Dockerfile.new
```

Modify the Dockerfile to match your application's requirements (base image, dependencies, build steps, etc.).

### 9. Trigger Deployment

Push changes to your configured trigger branch:

```bash
git add .
git commit -m "Set up Cloud Run deployment"
git push origin YOUR-BRANCH
```

The deployment will run automatically via GitHub Actions.

## Verification

After pushing, check:

1. GitHub Actions tab for workflow execution status
2. GCP Cloud Run console for service deployment status
3. Service URL provided by Cloud Run for testing

## Troubleshooting

- Check GitHub Actions logs for deployment errors
- Verify all required secrets are set in GitHub
- Ensure Workload Identity Federation is properly configured
- Confirm all GCP APIs are enabled in your project