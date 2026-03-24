from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import qrcode
import base64
from io import BytesIO
import datetime
import uvicorn
from typing import List, Optional
import asyncio

from database import engine, Base, get_db
import models, schemas
import cv2
import numpy as np
import json
from recognition_service import recognition_service

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Eyosias Attendance System for Any Organization")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_unique_id(department: str, user_id: int):
    year = datetime.datetime.now().year
    dept_code = department[:2].upper()
    return f"{year}-{dept_code}-{user_id:05d}"
    
def generate_qr_code(data_str: str):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return img_str

@app.post("/api/users", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate ID and QR code
    db_user.unique_id = generate_unique_id(user.department, db_user.id)
    db_user.qr_code_data = generate_qr_code(db_user.unique_id)
    
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.get("/api/users", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/api/users/embedding/{user_id}")
async def upload_user_embedding(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    results = recognition_service.detect_and_recognize(img)
    if not results:
        raise HTTPException(status_code=400, detail="No face detected in the image")
        
    emb = results[0]['embedding']
    
    db_emb = models.FaceEmbedding(user_id=user.id, embedding_data=json.dumps(emb.tolist()))
    db.add(db_emb)
    db.commit()
    
    return {"message": "Embedding saved successfully."}

@app.post("/api/attendance/face")
async def mark_attendance_face(
    file: UploadFile = File(...),
    camera_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    results = recognition_service.detect_and_recognize(img)
    if not results:
        return {"status": "error", "message": "No face detected"}
        
    all_embs = db.query(models.FaceEmbedding).all()
    successful_matches = []
    seen_user_ids = set()

    # Process every detected face in the frame
    for face_data in results:
        emb = face_data['embedding']
        best_match_id = None
        best_sim = -1
        
        for db_emb in all_embs:
            db_emb_array = np.array(json.loads(db_emb.embedding_data))
            is_match, sim = recognition_service.compare_embeddings(emb, db_emb_array)
            if is_match and sim > best_sim:
                best_match_id = db_emb.user_id
                best_sim = sim
        
        if best_match_id and best_match_id not in seen_user_ids:
            user = db.query(models.User).filter(models.User.id == best_match_id).first()
            if user:
                log = models.AttendanceLog(user_id=user.id, method="Face", camera_id=camera_id)
                db.add(log)
                successful_matches.append({
                    "user": user.full_name, 
                    "unique_id": user.unique_id,
                    "similarity": float(best_sim)
                })
                seen_user_ids.add(best_match_id)

    if successful_matches:
        db.commit()
        return {
            "status": "success", 
            "matches": successful_matches, 
            "count": len(successful_matches)
        }
    
    return {"status": "error", "message": "No known faces recognized"}

@app.get("/api/users/lookup/{unique_id}")
def lookup_user_portal(unique_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.unique_id == unique_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Identity not found in neural database.")
    
    logs = db.query(models.AttendanceLog).filter(models.AttendanceLog.user_id == user.id).order_by(models.AttendanceLog.timestamp.desc()).all()
    
    return {
        "user": user,
        "logs": logs
    }

@app.post("/api/cameras", response_model=schemas.CameraResponse)
def register_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db)):
    db_camera = models.Camera(**camera.model_dump())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@app.get("/api/cameras", response_model=List[schemas.CameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    return db.query(models.Camera).all()

# ── MJPEG Proxy ─────────────────────────────────────────────────────────────
def _make_offline_frame() -> bytes:
    """Generate a 640x360 'Camera Offline' placeholder JPEG."""
    img = np.zeros((360, 640, 3), dtype=np.uint8)
    img[:] = (20, 20, 30)  # dark background
    cv2.putText(img, "Camera Offline", (150, 160), cv2.FONT_HERSHEY_SIMPLEX,
                1.8, (0, 80, 200), 3, cv2.LINE_AA)
    cv2.putText(img, "Check stream URL / network", (140, 210), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (100, 100, 120), 1, cv2.LINE_AA)
    _, buf = cv2.imencode('.jpg', img)
    return buf.tobytes()

async def _mjpeg_generator(stream_url: str):
    """Async generator — yields JPEG multipart frames without blocking uvicorn."""
    offline_frame = _make_offline_frame()
    
    cap = cv2.VideoCapture(stream_url)
    # Give OpenCV a moment to connect (RTSP handshake can be slow)
    await asyncio.sleep(0.5)
    
    if not cap.isOpened():
        # Stream can't open: yield the offline placeholder a few times then stop
        body = (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'
                + offline_frame + b'\r\n')
        for _ in range(5):
            yield body
            await asyncio.sleep(1)
        return

    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    consecutive_failures = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                consecutive_failures += 1
                if consecutive_failures >= 10:
                    # Camera dropped — send offline frame then stop
                    body = (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'
                            + offline_frame + b'\r\n')
                    for _ in range(3):
                        yield body
                        await asyncio.sleep(1)
                    break
                await asyncio.sleep(0.1)
                continue
            consecutive_failures = 0
            frame = cv2.resize(frame, (640, 360))
            _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n'
                + buf.tobytes()
                + b'\r\n'
            )
            await asyncio.sleep(0.04)   # cap at ~25 fps
    finally:
        cap.release()

@app.get("/api/cameras/{camera_id}/stream")
async def stream_camera(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return StreamingResponse(
        _mjpeg_generator(camera.stream_url),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*"}
    )

@app.post("/api/cameras/{camera_id}/snapshot")
def snapshot_camera(camera_id: int, db: Session = Depends(get_db)):
    """Grab a single frame from an IP camera, run face recognition, log attendance."""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    cap = cv2.VideoCapture(camera.stream_url)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return {"status": "error", "message": "Could not grab frame from camera"}

    results = recognition_service.detect_and_recognize(frame)
    if not results:
        return {"status": "error", "message": "No face detected in snapshot"}

    emb = results[0]['embedding']
    all_embs = db.query(models.FaceEmbedding).all()
    best_match, best_sim = None, -1

    for db_emb in all_embs:
        db_arr = np.array(json.loads(db_emb.embedding_data))
        is_match, sim = recognition_service.compare_embeddings(emb, db_arr)
        if is_match and sim > best_sim:
            best_match = db_emb.user_id
            best_sim = sim

    if best_match:
        user = db.query(models.User).filter(models.User.id == best_match).first()
        log = models.AttendanceLog(user_id=user.id, method="Face", camera_id=camera_id)
        db.add(log)
        db.commit()
        return {"status": "success", "user": user.full_name, "similarity": float(best_sim)}

    return {"status": "error", "message": "Face not recognized"}

@app.post("/api/attendance/barcode")
def mark_attendance_barcode(unique_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.unique_id == unique_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check anti-duplicate (5 mins)
    five_mins_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
    recent_log = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.user_id == user.id,
        models.AttendanceLog.timestamp >= five_mins_ago
    ).first()
    
    if recent_log:
        return {"status": "ignored", "message": "Attendance already marked recently"}
        
    # Mark attendance
    log = models.AttendanceLog(user_id=user.id, method="Barcode")
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"status": "success", "user": user.full_name, "time": log.timestamp}

@app.get("/api/attendance")
def get_attendance(db: Session = Depends(get_db)):
    logs = db.query(models.AttendanceLog).order_by(models.AttendanceLog.timestamp.desc()).all()
    results = []
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first()
        camera = None
        if log.camera_id:
            camera = db.query(models.Camera).filter(models.Camera.id == log.camera_id).first()
        results.append({
            "id": log.id,
            "user_name": user.full_name if user else "Unknown",
            "department": user.department if user else "Unknown",
            "timestamp": log.timestamp,
            "method": log.method,
            "location": camera.location if camera else "Manual/Barcode"
        })
    return results

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
