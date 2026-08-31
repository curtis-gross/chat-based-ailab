#!/bin/bash

# Auto-detect compatible Python version for gcloud (requires Python 3.10-3.14)
if [ -z "$CLOUDSDK_PYTHON" ]; then
    for py_bin in "/opt/homebrew/bin/python3.11" "/opt/homebrew/bin/python3.14" "/usr/local/bin/python3" "/usr/bin/python3" "python3" "python"; do
        if command -v "$py_bin" &> /dev/null; then
            PY_VER=$("$py_bin" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || true)
            if [[ "$PY_VER" =~ ^3\.(10|11|12|13|14)$ ]]; then
                export CLOUDSDK_PYTHON=$(command -v "$py_bin")
                break
            fi
        fi
    done
fi

# Exit on any error
set -e


# Check gcloud authentication
echo "Checking gcloud authentication..."
if ! gcloud auth print-access-token &> /dev/null; then
  echo "Error: You are not authenticated with gcloud."
  echo "Please run 'gcloud auth login' and 'gcloud auth application-default login' to authenticate."
  exit 1
fi
echo "gcloud authentication verified."

# Configuration
# CHANGE THIS TO YOUR APP NAME
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
if [ "$GIT_BRANCH" = "main" ] || [ "$GIT_BRANCH" = "HEAD" ] || [ -z "$GIT_BRANCH" ]; then
  SERVICE_NAME="chat-based-ailab"
else
  SERVICE_NAME=$(echo "$GIT_BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\{1,\}/-/g' | sed 's/^-//' | sed 's/-$//')
fi
REGION="us-central1"

# Project Selection
DETECTED_PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
if [ -t 0 ]; then
  if [ -n "$DETECTED_PROJECT" ]; then
    echo "Detected active Google Cloud Project: $DETECTED_PROJECT"
    read -p "Is this correct? (y/n) [y]: " CONFIRM_PROJECT
    CONFIRM_PROJECT=${CONFIRM_PROJECT:-y}
    if [[ "$CONFIRM_PROJECT" =~ ^[Yy]$ ]]; then
      GCP_PROJECT="$DETECTED_PROJECT"
    else
      read -p "Enter Google Cloud Project ID: " GCP_PROJECT
    fi
  else
    read -p "Enter Google Cloud Project ID: " GCP_PROJECT
  fi

  while [ -z "$GCP_PROJECT" ]; do
    echo "Error: Project ID cannot be empty."
    read -p "Enter Google Cloud Project ID: " GCP_PROJECT
  done
else
  GCP_PROJECT="${GCP_PROJECT:-$DETECTED_PROJECT}"
  if [ -z "$GCP_PROJECT" ]; then
    echo "Error: GCP_PROJECT is not set and stdin is not a TTY."
    exit 1
  fi
fi
export GCP_PROJECT="$GCP_PROJECT"

echo "Using GCP Project: $GCP_PROJECT"
echo "Deploying $SERVICE_NAME to Cloud Run..."
GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-${GCP_PROJECT}-ailab-gcs}"

# GCS Bucket Verification/Creation
echo "Checking GCS bucket: gs://$GCS_BUCKET_NAME in project $GCP_PROJECT..."
if ! gcloud storage buckets describe "gs://${GCS_BUCKET_NAME}" --project "$GCP_PROJECT" &> /dev/null; then
    echo "GCS Bucket gs://${GCS_BUCKET_NAME} does not exist. Creating bucket in project $GCP_PROJECT..."
    gcloud storage buckets create "gs://${GCS_BUCKET_NAME}" --project "$GCP_PROJECT" --location="$REGION"
    echo "GCS Bucket gs://${GCS_BUCKET_NAME} successfully created."
else
    echo "GCS Bucket gs://${GCS_BUCKET_NAME} verified."
fi

gcloud run deploy $SERVICE_NAME \
  --project $GCP_PROJECT \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars="GCS_BUCKET_NAME=${GCS_BUCKET_NAME},GCP_PROJECT=${GCP_PROJECT}" \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest

echo "Deployment complete."
