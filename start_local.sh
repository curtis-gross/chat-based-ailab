#!/bin/bash

# Load local environment file if present
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  # Export keys cleanly, ignoring comments
  export $(cat .env | grep -v '^#' | grep -v '^$' | tr -d '\r' | xargs)
fi

# Detect and confirm GCP Project
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
fi

export GCP_PROJECT="$GCP_PROJECT"
export GOOGLE_CLOUD_PROJECT="$GCP_PROJECT"
echo "Using GCP Project: $GCP_PROJECT"

# Set dynamic GCS Bucket name based on project
export GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-${GCP_PROJECT}-ailab-gcs}"

# Check if NPM dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "⚠️  WARNING: node_modules directory not found."
  read -p "Would you like to run the interactive onboarding and setup wizard now? (y/n): " run_setup
  if [[ $run_setup =~ ^[Yy]$ ]]; then
    echo "💡 Note: You may need to run the wizard as 'sudo' (e.g., sudo ./setup.sh) if you hit permission barriers."
    ./setup.sh
    exit 0
  else
    echo "Proceeding with manual package installation..."
    npm install
  fi
fi

# Validate Gemini API credentials
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  WARNING: GEMINI_API_KEY is not set in your environment or .env file."
  read -p "Would you like to run the onboarding and setup wizard now to configure keys? (y/n): " run_setup
  if [[ $run_setup =~ ^[Yy]$ ]]; then
    echo "💡 Note: You may need to run the wizard as 'sudo' (e.g., sudo ./setup.sh) if you hit permission barriers."
    ./setup.sh
    exit 0
  else
    echo "⚠️  Proceeding without explicit GEMINI_API_KEY. The server will fall back to Google Cloud Application Default Credentials."
  fi
fi

export NODE_ENV=production

echo "==========================================================="
echo " Building frontend and starting local production server..."
echo " The application will be available at: http://localhost:8080"
echo "==========================================================="

npm run build
node server.js
