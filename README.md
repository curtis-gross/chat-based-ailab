# Focus Group AI

This is a comprehensive full-stack application built with React, Node.js, and Google Cloud Vertex AI to simulate real-world customer focus groups using synthetic personas. Follow the guide below to set up your environment and run the application locally or deploy it to Google Cloud Run.

## Architecture

```mermaid
graph TD
    User([User Browser]) -->|HTTP / WebSockets| CloudRun[Google Cloud Run: Node.js Express App]
    subgraph Google Cloud Platform
        CloudRun -->|SDK Calls| VertexAI[Vertex AI / Gemini API]
        CloudRun -->|Read/Write Run State & Snapshots| GCS[GCS Bucket: snapshots/ & runs/]
        CloudRun -->|Secrets Retrieval| SecretManager[Secret Manager: GEMINI_API_KEY]
    end
    CloudRun -->|External Review & Media APIs| ExternalSources[External Ingestion: Trustpilot, Steam, YouTube, Web Grounding]
    CloudRun -->|Orchestrates| MultiAgentMesh[Multi-Agent Orchestrator Mesh]
    subgraph Multi-Agent Mesh
        MultiAgentMesh --> ConversationalAgent[Trends & Insights Conversational Agent]
        MultiAgentMesh --> StrategizeAgent[Strategize Conversational Agent]
        MultiAgentMesh --> CreativeAgent[Creative Gen Agent]
        MultiAgentMesh --> AuditAgent[Audit Conversational Agent]
        MultiAgentMesh --> OrchestrationAgent[Campaign Orchestration Agent]
        MultiAgentMesh --> IntakeAgent[Intake Agent]
        MultiAgentMesh --> FeasibilityAgent[Feasibility Agent]
        MultiAgentMesh --> PrioritizationAgent[Prioritization Agent]
        MultiAgentMesh --> ResearchAgent[Research Agent]
        MultiAgentMesh --> PersonalizedExpAgent[Personalized Storefront Experience]
        MultiAgentMesh --> PersonalizeComsAgent[Personalize Coms 1-to-1 Engine]
        MultiAgentMesh --> FullAuditAgent[Full Cross-Pipeline Audit Agent]
        MultiAgentMesh --> CreativeWorkflowAgent[GenMedia Deep Dive Workflow Agent]
        MultiAgentMesh --> ValidationAgent[Validation Agent]
        MultiAgentMesh --> IntegrationAgent[Integration Agent]
        MultiAgentMesh --> JudgeAgent[Judge Agent]
    end
    subgraph Conversational Insights Agent Pipeline
        ConversationalAgent -->|1st Step: Intent Analyzer & Skill Dispatcher| FlashLiteDispatcher[Gemini 3.5 Flash Lite Analyzer]
        FlashLiteDispatcher -->|Multimodal ABCD Framework Ad Analysis| VideoModel[Gemini 3.7 Flash Multimodal]
        FlashLiteDispatcher -->|Video & Comments Sentiment Analysis| VideoModel
        VideoModel -->|Extract Market & Cultural Video Trends| TrendEngine[Video Trend Mining & Velocity Engine]
        TrendEngine -->|Render Interactive Trends Table & Velocity Visual| ChatUI
        FlashLiteDispatcher -->|Competitor Benchmark & Matrix Analysis| FlashLiteReason[Gemini 3.5 Flash Lite Intelligence]
        FlashLiteDispatcher -->|YouTube Search: Top 5 by Views (Last Year)| YTSearchEngine[YouTube Search & Insights Engine]
        YTSearchEngine -->|Ingest Top 5 Videos, View Counts & Takeaways| ChatUI
        YTSearchEngine -->|Persist Video Search Results| GCS
        FlashLiteDispatcher -->|Reddit 100-Comment Ingestion & Keyword Mining| RedditEngine[Reddit Live Ingestion & Grounding Engine]
        RedditEngine -->|Extract Comment Sentiment, Keywords & Permalinks| FlashLiteReason
        FlashLiteDispatcher -->|Subreddit Intelligence: Top 5 Annual + Top 5 Weekly Threads with Sentiment Enrichment| RedditEngine
        RedditEngine -->|Persist Analyzed Threads, Subreddits & Results| GCS
        FlashLiteDispatcher -->|Query Analyzed Reddit Threads & Subreddits Catalog| GCS
        FlashLiteDispatcher -->|Website Landing Page Conversion Audit| FlashLiteReason
        FlashLiteDispatcher -->|Video Catalog Indexing & Querying| GCS
        FlashLiteDispatcher -->|Unified Insights Catalog: Videos + Reddit| GCS
        FlashLiteDispatcher -->|Bulk Cross-Campaign Synthesis & Sentiment Deep Dive| FlashLiteReason
        FlashLiteDispatcher -->|Session Check: Load Saved Run vs Generate Fresh Bulk Analysis| GCS
        ConversationalAgent -->|Persist Insights Sessions & History Drawer| GCS
        ConversationalAgent -->|Render Interactive Chat Stream & Rich Cards| ChatUI[Centralized Chat UI]
    end
    subgraph Strategize Agent Pipeline
        StrategizeAgent -->|1st Step: Intent Analyzer & Skill Dispatcher| FlashLiteDispatcher
        FlashLiteDispatcher -->|Squirt Synthetic Dataset Access| SquirtSynthetic[Squirt Consumer Dataset]
        FlashLiteDispatcher -->|1-on-1 Direct Persona Interviews & Focus Group Broadcasting| FlashLiteReason
        FlashLiteDispatcher -->|Synthesize 3 Strategic Segments & 3 Baseline Controls| FlashLiteReason
        FlashLiteDispatcher -->|Generate Tailored Persona Visual Ads & Creative Hooks| FlashLiteImage[Gemini 3.1 Flash Lite Image]
        StrategizeAgent -->|Synchronize Personas Across App| PersonaState[Global Persona State]
        StrategizeAgent -->|Persist Strategy Runs, Personas, Visuals & History Drawer| GCS
    end
    subgraph Creative Agent Pipeline
        CreativeAgent -->|1st Step: Intent Analyzer & Skill Dispatcher| FlashLiteDispatcher
        CreativeAgent -->|Ingest Ad/Product Image| ImgUpload[Uploaded Creative Asset]
        FlashLiteDispatcher -->|Auto Asset Resolver: Session / Catalog / Gallery Lookup| GCSCatalog[GCS: creative_catalog.json]
        FlashLiteDispatcher -->|Generate 9 Aspect Ratios: 1:1, 16:9, 9:16, 4:3, etc.| FlashLiteImage[Gemini 3.1 Flash Lite Image]
        FlashLiteDispatcher -->|Prompt-Driven Image Editing & Transformation| FlashLiteImage
        FlashLiteDispatcher -->|5-Step Video Workflow: Storyboard Creation (3-7 Scenes, 10s)| FlashLiteReason
        FlashLiteReason -->|Step 4: Keyframe Scene Visuals Table & Script| FlashLiteImage
        FlashLiteImage -->|Step 5: Multi-Scene Video Synthesis & Consistency| OmniVideoModel[Gemini Omni 1.1 Flash Preview]
        FlashLiteDispatcher -->|Extract Rich Visual Scene & Styling Metadata| FlashMetadata[Gemini 3.5 Flash Metadata Engine]
        FlashMetadata -->|Index & Persist Asset Ledger| GCSCatalog
        FlashLiteDispatcher -->|Natural Language Conversational Asset Retrieval| GCSCatalog
        CreativeAgent -->|Persist Creative Sessions| GCS
    end
    subgraph Audit Agent Pipeline
        AuditAgent -->|1st Step: Intent Analyzer & Skill Dispatcher| FlashLiteDispatcher
        AuditAgent -->|Ingest Product Visual| AuditImgUpload[Uploaded Marketing Asset]
        AuditAgent -->|Ingest YouTube Link / Creator Video| AuditVideoUpload[Creator Partner YouTube Video]
        FlashLiteDispatcher -->|Multi-Criteria Evaluation: Hierarchy, Brand, Lighting, Conversion| FlashLiteReason
        FlashLiteDispatcher -->|Extract Visual Scene Description & AI Metadata Tags| FlashLiteReason
        FlashLiteDispatcher -->|Generate Pros & Cons Analysis Ledger| FlashLiteReason
        FlashLiteDispatcher -->|Competitor Head-to-Head: Big Names, House Brands & Functional Challengers| FlashLiteReason
        FlashLiteDispatcher -->|10-Point Creator Partner Legal, FTC & Brand Compliance Audit| VideoModel[Gemini 3.7 Flash Multimodal]
        VideoModel -->|Generate 10-Point Sign-Off Sheet, Claims & Timestamp Demos| AuditAgent
        FlashLiteDispatcher -->|Natural Language Past Audits Search & Instant Scorecard Retrieval| GCSAuditStore[GCS: audit_agent_history & gallery]
        AuditAgent -->|Persist Audit History, Recent Bar & Asset Gallery| GCSAuditStore
    end
    subgraph Orchestration Agent Pipeline
        OrchestrationAgent -->|1st Step: Fast-Track Presets & Qualifying Dialogue| FlashLiteDispatcher
        FlashLiteDispatcher -->|Ingest Synthetic Personas & Purchase Telemetry| PersonaState
        FlashLiteDispatcher -->|Ingest Squirt Telemetry & Competitor Displacement Data| SquirtSynthetic
        FlashLiteDispatcher -->|Generate 15 RSA Headlines, 4 Long Headlines & 4 Descriptions| FlashLiteReason
        FlashLiteDispatcher -->|Formulate Exact, Phrase & Broad Match Keywords with CPCs| FlashLiteReason
        FlashLiteDispatcher -->|Draft Sitelinks, Callouts & Structured Snippets| FlashLiteReason
        FlashLiteDispatcher -->|Map Custom Intent & In-Market Audience Signals| FlashLiteReason
        OrchestrationAgent -->|Render Interactive Google Ads Table & Live SERP Mockup| AdsTableUI[Google Ads Campaign Manager UI]
        OrchestrationAgent -->|1-Click Google Ads Editor CSV & TSV Export| EditorExport[Google Ads Editor CSV]
        OrchestrationAgent -->|Persist Campaign Packages & Load Last Run| GCS
    end
    subgraph Personalized Experience Pipeline
        PersonalizedExpAgent -->|Load Saved Personas| GCS
        PersonalizedExpAgent -->|Copy & Layout Orchestration| FlashLiteText[Gemini 3.5 Flash Lite Text]
        PersonalizedExpAgent -->|On-the-fly Chiclet Image Gen| FlashLiteImage[Gemini 3.1 Flash Lite Image]
        PersonalizedExpAgent -->|Render Layered Storefront| StorefrontExperience[Interactive Web Experience]
    end
    subgraph Personalize Coms Pipeline
        PersonalizeComsAgent -->|Load Synthetic Profiles| IngestProfiles[Synthetic Shopper Profiles]
        PersonalizeComsAgent -->|1-to-1 Tailored Copy| FlashLiteText
        PersonalizeComsAgent -->|Individual Scene Gen| FlashLiteImage
    end
    subgraph Full Audit Pipeline
        FullAuditAgent -->|Ingest Stages: Insights, Creator Partner Compliance, Profiles, Personas, Brief, Content, Testing| AuditSources[Multi-Stage Ingestion]
        FullAuditAgent -->|Synthesize Legal, Financial, Strategic & Creator Audit Insights| FlashAuditReason[Gemini 3.5 Flash Reasoning Engine]
        FullAuditAgent -->|Persist Audit Runs| GCS
        FullAuditAgent -->|Interactive Executive Report & Remediation Ledger| AuditUI[Audit Dashboard UI]
    end
    subgraph GenMedia Creative Workflow Pipeline
        CreativeWorkflowAgent --> S1[1. Text + Core Asset & Brand Compliance Audit]
        CreativeWorkflowAgent --> S2[2. Persona Scenario Variations Engine]
        CreativeWorkflowAgent --> S3[3. Multi-Aspect Ratio Adaptation Engine - 3-Thread Parallel Worker]
        CreativeWorkflowAgent --> S4[4. Product Element Versioning & Variant Swapping - 3-Thread Parallel Worker]
        CreativeWorkflowAgent --> S5[5. Omni / Veo Motion Video Generation Engine]
    end
    subgraph Unified Chat Session History & Persistence
        ConversationalAgent -.-> HistorySystem[Session History Drawer: Pin/Star to Top, Inline Title Editing, GCS Persistence]
        StrategizeAgent -.-> HistorySystem
        CreativeAgent -.-> HistorySystem
        AuditAgent -.-> HistorySystem
    end
```

---

## 🚀 Quick Start: Automated GCP Setup & Deploy

The easiest way to configure your Google Cloud Project, enable Vertex AI, set up GCS storage buckets, configure IAM permissions, disable organizational constraints, and deploy the application to Cloud Run is using our automated onboarding wizard:

```bash
chmod +x gcp_setup_deploy.sh
./gcp_setup_deploy.sh
```

This interactive script automates the entire process:
- Authenticates with Google Cloud and verifies billing access.
- Helps you select/create a GCP Project and link billing.
- Enables necessary APIs (Vertex AI, Cloud Run, GCS, Secret Manager).
- Dynamically configures GCS buckets and assigns IAM permissions to build/runtime service accounts.
- Tailors company branding context throughout the codebase.
- Deploys the application live to Cloud Run with public access.

---

**Note:** When first using the application, be sure to run the **Audience Generator** and the **Marketing Brief** tools first. The synthetic Focus Group experience relies on that generated data to provide tailored, persona-driven answers!

## Prerequisites

Before starting, ensure you have the following installed on your machine (Mac or Windows):

1.  **Node.js & npm**: Install the latest LTS version of Node.js from [nodejs.org](https://nodejs.org/). This will include `npm`.
2.  **Google Cloud CLI (gcloud)**: Install the `gcloud` CLI to interact with Google Cloud services.
    -   **Mac**: `brew install --cask google-cloud-sdk` (or download from the Google Cloud docs).
    -   **Windows**: Download the installer from the Google Cloud CLI documentation.

---

## 1. Google Cloud Environment Setup

To use the AI features in this application, you need a Google Cloud Project with the Vertex AI API enabled and proper authentication configured on your local machine.

### Step 1: Create a Google Cloud Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (or select an existing one).
3.  Note your **Project ID**.

### Step 2: Enable the Vertex AI API
1.  In the Google Cloud Console, navigate to **APIs & Services > Library**.
2.  Search for **Vertex AI API** and click **Enable**.

### Step 3: Authenticate Locally
Open your terminal (Command Prompt/PowerShell on Windows, Terminal on Mac) and authenticate the `gcloud` CLI:

```bash
# Log in to your Google Cloud account
gcloud auth login

# Set your active project
gcloud config set project YOUR_PROJECT_ID

# Set up Application Default Credentials (ADC)
# This is required for the local Node.js server to call Vertex AI!
gcloud auth application-default login
```
*Note: The command `gcloud auth application-default login` will open a browser window for you to authenticate and will generate a local credentials file that the Google Cloud SDKs use automatically.*

---

## 2. Local Application Setup

Once your cloud environment is ready, set up the project locally.

### Step 1: Install Dependencies
Navigate to the root of your project directory and install the required npm packages:

```bash
cd focus-group-app
npm install
```

### Step 2: Verify Configuration
If you copied this from a template, ensure you update any specific configurations:
-   Edit `package.json` if you need to update the `"name"` field.
-   Edit `cloud_run.sh` to update the `SERVICE_NAME` variable if you plan to deploy.

---

## 3. Running the Application Locally

You can start the development server using the provided bash script or standard npm commands.

### Option A: Using the Start Script (Recommended for Mac/Linux)
```bash
./start_local.sh
```

### Option B: Using npm Directly (Windows or Mac)
```bash
npm run dev
```

The application should now be accessible in your browser at `http://localhost:5173` (or the port specified in your console output).

---

## 4. Deployment to Google Cloud Run

To deploy the application to the internet using Google Cloud Run, follow these steps:

### Step 1: Upload Secrets (One-time Setup)
If your application requires specific API keys (like a Gemini API key for the frontend widget), run the setup script to upload it to Google Cloud Secret Manager:

```bash
./setup_api_key.sh
```
*You will be prompted to enter your API key, which will be securely stored.*

### Step 2: Deploy to Cloud Run
Run the deployment script to build the Docker container and deploy it to Cloud Run:

```bash
./cloud_run.sh
```

Upon successful deployment, the CLI will output a public URL where your application is hosted.