# MindSphere Setup Guide

## Prerequisites
- Node.js v18+
- Docker & Docker Compose

## Quick Start
1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.example` to `.env` in `backend` and `frontend` (if needed).
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Start Infrastructure (DB + Redis)**:
   ```bash
   docker-compose up -d
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   This starts both backend (`localhost:3000`) and frontend (`localhost:5173`).

## Project Structure
- `backend/`: Express API & Worker
- `frontend/`: React + Vite UI
- `packages/shared/`: Shared Types & Schemas
