# MindSphere Architecture

## Overview
MindSphere is a learning recommender system designed to reduce social media addiction.

## Components

### 1. Frontend (React + Vite)
- **Tech**: TypeScript, TailwindCSS, Zustand, React Query.
- **Responsibility**: UI/UX, Session Timer, Offline Buffering (IndexedDB).
- **Communication**: REST API to Backend.

### 2. Backend (Express.js)
- **Tech**: Node.js, TypeScript, Postgres (Prisma), Redis.
- **Responsibility**: Auth, Recommendations, Content CRUD, API.
- **Worker**: Separate process for BullMQ jobs (Reports, Reminders).

### 3. Shared
- **Tech**: Zod.
- **Responsibility**: Shared DTOs and Validation Schemas.

## Data Flow
- **Offline Sync**: Frontend buffers events -> Batches to Backend (UUID, dedupe) -> Stored in DB.
- **Recommendations**: Backend caches candidates in Redis -> Filters/Reranks -> Serves to FE.
- **Reports**: Background Job aggregates data -> Stores JSON in `WeeklyReport` -> FE renders charts.
