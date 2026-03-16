# MindSphere V2

MindSphere is a full-stack learning recommender system designed to reduce social media addiction.

## 🚀 Quick Start

Follow these steps to get the project running locally.

### 1. Prerequisites
- **Node.js** (v18+)
- **Docker** & Docker Compose (for PostgreSQL/Redis)

### 2. Infrastructure Setup
Start the databases (Postgres & Redis) and Background Worker.
```bash
docker-compose up -d
```
*Wait a few seconds for containers to initialize.*

### 3. Backend Setup
Open a new terminal for the backend:
```bash
cd backend

# Install dependencies
npm install

# Setup Database (Migrations & Seed)
npx prisma migrate dev
npx prisma db seed

# Start API Server


```
*Backend runs on http://localhost:3000*

### 4. Frontend Setup
Open a new terminal for the frontend:
```bash
cd frontend

# Install dependencies
npm install

# Start React Dev Server
npm run dev
```
*Frontend runs on http://localhost:5173*

### 5. Verify Installation
- Open http://localhost:5173 in your browser.
- **Register** a new account.
- You should be redirected to the **Survey**, then the **Dashboard**.

## 🧪 Running Tests
To run the End-to-End (E2E) smoke tests:
```bash
cd frontend
npx playwright test
```

## 📚 Documentation
- **[Demo Script](docs/DEMO_SCRIPT.md)**: Step-by-step guide to demo features.
- **[Architecture](docs/ARCHITECTURE.md)**: System design and component details.
- **[Walkthrough](walkthrough.md)**: Dev log and project summary.
