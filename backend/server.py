from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging
import uuid
from config import settings
from models import (
    UserCreate, UserLogin, Token, User, FileUploadResponse,
    FileListResponse, FileVersion
)
from auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from database import (
    get_user_by_email, create_user, create_file_metadata,
    get_user_files, get_file_by_id, update_file_version_count, close_db_connection
)
from s3_service import s3_service

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="CloudVault Backup API")
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/register", response_model=Token)
async def register(user_input: UserCreate):
    existing_user = await get_user_by_email(user_input.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "email": user_input.email,
        "password_hash": get_password_hash(user_input.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await create_user(user_data)
    
    access_token = create_access_token(data={"sub": user_id})
    user = User(
        id=user_id,
        email=user_input.email,
        created_at=datetime.now(timezone.utc)
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_input: UserLogin):
    user = await get_user_by_email(user_input.email)
    if not user or not verify_password(user_input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(
        id=user["id"],
        email=user["email"],
        created_at=datetime.fromisoformat(user["created_at"])
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user)
):
    try:
        file_content = await file.read()
        file_id = str(uuid.uuid4())
        s3_key = f"{current_user_id}/{file_id}/{file.filename}"
        
        s3_result = s3_service.upload_file(
            file_content=file_content,
            file_key=s3_key,
            content_type=file.content_type or "application/octet-stream"
        )
        
        file_data = {
            "id": file_id,
            "user_id": current_user_id,
            "filename": file.filename,
            "s3_key": s3_key,
            "size": len(file_content),
            "content_type": file.content_type or "application/octet-stream",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "version_count": 1
        }
        
        await create_file_metadata(file_data)
        
        return FileUploadResponse(
            id=file_id,
            filename=file.filename,
            size=len(file_content),
            version_id=s3_result["version_id"],
            uploaded_at=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/files", response_model=list[FileListResponse])
async def list_files(current_user_id: str = Depends(get_current_user)):
    files = await get_user_files(current_user_id)
    return [
        FileListResponse(
            id=f["id"],
            filename=f["filename"],
            size=f["size"],
            content_type=f["content_type"],
            uploaded_at=datetime.fromisoformat(f["uploaded_at"]),
            version_count=f.get("version_count", 1)
        )
        for f in files
    ]

@api_router.get("/files/{file_id}/versions", response_model=list[FileVersion])
async def get_file_versions(
    file_id: str,
    current_user_id: str = Depends(get_current_user)
):
    file_data = await get_file_by_id(file_id, current_user_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    versions = s3_service.list_object_versions(file_data["s3_key"])
    
    await update_file_version_count(file_id, current_user_id, len(versions))
    
    return [
        FileVersion(
            version_id=v["version_id"],
            size=v["size"],
            uploaded_at=v["last_modified"],
            is_latest=v["is_latest"]
        )
        for v in versions
    ]

@api_router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    version_id: str = Query(None),
    current_user_id: str = Depends(get_current_user)
):
    file_data = await get_file_by_id(file_id, current_user_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        content = s3_service.download_file(file_data["s3_key"], version_id)
        return StreamingResponse(
            iter([content]),
            media_type=file_data["content_type"],
            headers={"Content-Disposition": f'attachment; filename="{file_data["filename"]}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/files/{file_id}/restore")
async def restore_file_version(
    file_id: str,
    version_id: str = Query(...),
    current_user_id: str = Depends(get_current_user)
):
    file_data = await get_file_by_id(file_id, current_user_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        result = s3_service.restore_version(file_data["s3_key"], version_id)
        return {"message": "Version restored successfully", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CloudVault API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_event():
    await close_db_connection()