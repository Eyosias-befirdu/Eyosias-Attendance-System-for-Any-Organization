# AegisIdentity - Advanced Hybrid Attendance & Identity System

A modern, premium smart attendance and identity management system built with full stack technologies.

## Features
- **Registration**: Register new personnel and automatically issue AI-generated IDs and QR codes.
- **Biometric Ready**: The backend schema securely stores embeddings extracted from InsightFace locally, for neural verification.
- **Camera Network**: Manage a fleet of IP cameras across different locations inside the premises.
- **Reporting**: Full attendance log tracking with anti-duplication mechanisms implemented inside the API.
- **Premium Dashboard**: A visually pleasing React + Vite dashboard optimized with Vanilla CSS styling, featuring glassmorphism and subtle gradients.

## Requirements
- Python 3.9+
- Node.js 18+
- Optional: PostgreSQL (SQLite natively falls back if `DATABASE_URL` is omitted).

## Running the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```
> The API will be available at `http://localhost:8000/docs`.

## Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

## Structure
- `backend/` - FastAPI, SQLAlchemy, Database schemas
- `frontend/` - React, Vite, CSS
