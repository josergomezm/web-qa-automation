# Deployment Guide

## Prerequisites

1. Google Cloud Platform account with billing enabled
2. Node.js 20+ installed locally
3. Google Cloud CLI installed and authenticated

## Backend Deployment (GCP Cloud Run)

1. **Set up GCP project:**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable firestore.googleapis.com
   ```

2. **Create Firestore database:**
   ```bash
   gcloud firestore databases create --region=us-central1
   ```

3. **Deploy backend:**
   ```bash
   cd backend
   gcloud builds submit --config cloudbuild.yaml
   ```

4. **Set environment variables:**
   ```bash
   gcloud run services update qa-automation-backend \
     --set-env-vars GOOGLE_CLOUD_PROJECT_ID=YOUR_PROJECT_ID \
     --region us-central1
   ```

5. **Get backend URL:**
   ```bash
   gcloud run services describe qa-automation-backend --region us-central1 --format 'value(status.url)'
   ```

## Frontend Deployment

### Option 1: Netlify/Vercel

1. **Build frontend:**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your backend URL
   npm install
   npm run build
   ```

2. **Deploy to Netlify:**
   - Connect your GitHub repo to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variable: `VITE_BACKEND_URL=your-backend-url`

### Option 2: Firebase Hosting

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase:**
   ```bash
   cd frontend
   firebase init hosting
   ```

3. **Build and deploy:**
   ```bash
   npm run build
   firebase deploy
   ```

## Configuration

1. **AI API Keys:**
   - Get API keys from OpenAI, Anthropic, or your preferred provider
   - Configure them in the frontend Configuration page

2. **GCP Permissions:**
   - Ensure Cloud Run service account has Firestore access
   - For local development, use service account key

## Environment Variables

### Backend (.env)
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
OPENAI_API_KEY=your-openai-key (optional, can be set via frontend)
NODE_ENV=production
PORT=8080
```

### Frontend (.env)
```
VITE_BACKEND_URL=https://your-backend-url.run.app
```

## Cost Optimization

1. **Cloud Run:**
   - Set minimum instances to 0 for cost savings
   - Use CPU allocation only during requests

2. **Firestore:**
   - Use Firestore in Native mode
   - Monitor read/write operations

3. **AI APIs:**
   - Monitor token usage
   - Set usage limits in provider dashboards

## Monitoring

1. **Cloud Run logs:**
   ```bash
   gcloud logs tail --service qa-automation-backend
   ```

2. **Firestore usage:**
   - Monitor in GCP Console > Firestore

3. **Frontend errors:**
   - Use browser dev tools
   - Consider adding error tracking (Sentry, etc.)