# QA Web Automation Tool

A natural language web automation testing tool for QA teams.

## Prerequisites

- **Node.js 18+** (Required for Web Crypto API support)
- **npm** or **yarn**

## Architecture

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Local JSON file storage
- **Automation**: Playwright + Stagehand
- **AI**: Configurable AI model integration

## Features

- Natural language test descriptions
- Non-technical user interface
- Automated test execution with detailed reporting
- Performance metrics and console logging
- Cost tracking per test
- AI model configuration

## Project Structure

```
/frontend          - Vue 3 TypeScript frontend
/backend           - Cloud Functions/Run backend
/shared            - Shared types and utilities
```

## Getting Started

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **Set up frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Set up backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Configure AI model:**
   - Open http://localhost:5173 (frontend)
   - Go to Configuration page
   - Add your AI provider API key

5. **Create your first test:**
   - Go to "Create Test" page
   - Describe what you want to test in natural language
   - Add any required credentials or form data
   - Run the test and view results