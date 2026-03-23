from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    gender = Column(String)
    dob = Column(String)
    address = Column(String)
    phone_number = Column(String)
    email = Column(String, unique=True, index=True)
    department = Column(String)
    role = Column(String)
    
    unique_id = Column(String, unique=True, index=True)
    qr_code_data = Column(Text)

    embeddings = relationship("FaceEmbedding", back_populates="user")
    attendance_logs = relationship("AttendanceLog", back_populates="user")

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    embedding_data = Column(Text)

    user = relationship("User", back_populates="embeddings")

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    stream_url = Column(String)
    location = Column(String)
    status = Column(String, default="Active")

    logs = relationship("AttendanceLog", back_populates="camera")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    method = Column(String)

    user = relationship("User", back_populates="attendance_logs")
    camera = relationship("Camera", back_populates="logs")
