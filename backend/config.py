import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    mongo_url: str = os.environ['MONGO_URL']
    db_name: str = os.environ['DB_NAME']
    cors_origins: str = os.environ.get('CORS_ORIGINS', '*')
    jwt_secret: str = os.environ['JWT_SECRET']
    jwt_algorithm: str = os.environ.get('JWT_ALGORITHM', 'HS256')
    aws_access_key_id: str = os.environ['AWS_ACCESS_KEY_ID']
    aws_secret_access_key: str = os.environ['AWS_SECRET_ACCESS_KEY']
    aws_region: str = os.environ['AWS_REGION']
    s3_bucket_name: str = os.environ['S3_BUCKET_NAME']
    presigned_url_expiration: int = int(os.environ.get('PRESIGNED_URL_EXPIRATION', '3600'))

settings = Settings()