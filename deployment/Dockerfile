# Multi-stage build for React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Accept build args for Google credentials
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_API_KEY
ARG VITE_GOOGLE_APP_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_GOOGLE_API_KEY=${VITE_GOOGLE_API_KEY}
ENV VITE_GOOGLE_APP_ID=${VITE_GOOGLE_APP_ID}

# Build frontend for production
RUN npm run build

# Python backend stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Copy artifacts directory (golden examples)
COPY ./artifacts ./artifacts

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
