from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(settings.mongo_url)
db = client[settings.db_name]

async def get_user_by_email(email: str):
    user = await db.users.find_one({"email": email}, {"_id": 0})
    return user

async def create_user(user_data: dict):
    await db.users.insert_one(user_data)
    return user_data

async def create_file_metadata(file_data: dict):
    await db.files.insert_one(file_data)
    return file_data

async def get_user_files(user_id: str):
    files = await db.files.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return files

async def get_file_by_id(file_id: str, user_id: str):
    file = await db.files.find_one({"id": file_id, "user_id": user_id}, {"_id": 0})
    return file

async def update_file_version_count(file_id: str, user_id: str, version_count: int):
    await db.files.update_one(
        {"id": file_id, "user_id": user_id},
        {"$set": {"version_count": version_count}}
    )

async def close_db_connection():
    client.close()