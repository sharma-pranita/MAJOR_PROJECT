from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class FileVersion(BaseModel):
    version_id: str
    size: int
    uploaded_at: str
    is_latest: bool

class FileMetadata(BaseModel):
    id: str
    user_id: str
    filename: str
    s3_key: str
    size: int
    content_type: str
    uploaded_at: datetime
    version_count: int = 1

class FileUploadResponse(BaseModel):
    id: str
    filename: str
    size: int
    version_id: str
    uploaded_at: datetime

class FileListResponse(BaseModel):
    id: str
    filename: str
    size: int
    content_type: str
    uploaded_at: datetime
    version_count: int