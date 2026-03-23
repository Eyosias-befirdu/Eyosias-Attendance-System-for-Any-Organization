from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    full_name: str
    gender: str
    dob: str
    address: str
    phone_number: str
    email: str
    department: str
    role: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    unique_id: Optional[str] = None
    qr_code_data: Optional[str] = None

    class Config:
        from_attributes = True

class CameraBase(BaseModel):
    name: str
    stream_url: str
    location: str
    status: Optional[str] = "Active"

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: int

    class Config:
        from_attributes = True

class AttendanceLogResponse(BaseModel):
    id: int
    user_id: int
    camera_id: Optional[int]
    timestamp: datetime
    method: str
    user_name: Optional[str] = None # Can populate manually

    class Config:
        from_attributes = True
