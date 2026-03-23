# 🛡️ Eyosias Attendance System for Any Organization
### Advanced AI-Driven Biometric Identity & Global Attendance Hub

A state-of-the-art, premium attendance management solution built from the ground up to handle high-traffic organizational security. This hybrid system bridges the gap between neural research and practical utility, offering a seamless, hands-free verification experience.

---

## 🚀 Core Features

- **🧬 Multi-Face Neural Detection**: Powered by **InsightFace (Buffalo_L)**, the system can recognize and log attendance for multiple individuals simultaneously in a single frame—perfect for busy entrance points.
- **📡 Hybrid Camera Support**: Seamlessly switch between **Local Webcams** and a global fleet of **IP Network Cameras (RTSP/MJPEG)** with real-time biometric stream processing.
- **🏢 Personnel Self-Service Portal**: Employees can log in via **Neural Face Scan** or Unique ID to view their private records, attendance history, and download personal digital ID tokens.
- **📊 Real-Time Neural Analytics**: A high-impact dashboard showing live activity stats: Total Personnel, Today's Attendance, Active Camera Nodes, and Security Alerts (Unknown Attempts).
- **🪪 Professional ID Designer**: One-click generation and printing of standardized, high-resolution **Identity Cards** with embedded QR biometric tokens.
- **📊 Comprehensive Data Suite**: Dynamic search across the entire personnel registry and one-click **CSV Dataset Export** for payroll audits.
- **🌓 Global Theme Engine**: Premium **Dark & Light Mode** support with glassmorphism UI design, optimized for clarity in any lighting condition.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, Uvicorn |
| **Frontend** | React 18+, Vite, Vanilla CSS (Glassmorphism), JavaScript |
| **Neural Core** | InsightFace, OpenCV, NumPy, QR Code Generation |
| **Database** | SQLite (Default fallback), Support for PostgreSQL |
| **Deployment** | Docker & Docker Compose (Ready for Containerization) |

---

## 🚀 Quick Launch Guide

### 📂 Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- (Optional) **PostgreSQL** if running in production mode.

### 🐍 Backend Deployment
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```
> The API documentation will be available at: `http://localhost:8000/docs`

### ⚛️ Frontend Deployment
```bash
cd frontend
npm install
npm run dev
```
> The dashboard will be live at: `http://localhost:5173`

---

## 📁 Project Architecture
- `backend/` - FastAPI logic, SQLAlchemy models, and Neural Recognition Service.
- `frontend/` - React SPA with a custom-engineered Glassmorphism Design System.
- `docker-compose.yml` - Ready-to-go container orchestration for the entire stack.

---

## 🛡️ License
**PROPRIETARY - ALL RIGHTS RESERVED**  

Copyright (c) 2026 **Eyosias Befirdu**.  
Unauthorized copying, modification, or distribution of this software is strictly prohibited without the express written permission of the copyright holder.

For licensing inquiries or enterprise permissions, please contact the author directly.
