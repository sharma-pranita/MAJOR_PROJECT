import boto3
from botocore.exceptions import ClientError
import logging
from typing import Optional, List, Dict, Any
from config import settings

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key
        )
        self.bucket_name = settings.s3_bucket_name
    
    def upload_file(self, file_content: bytes, file_key: str, content_type: str = "application/octet-stream") -> Dict[str, Any]:
        try:
            response = self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=content_type
            )
            logger.info(f"File uploaded: {file_key}, Version: {response.get('VersionId')}")
            return {
                "version_id": response.get("VersionId"),
                "etag": response.get("ETag")
            }
        except ClientError as e:
            logger.error(f"Upload failed for {file_key}: {str(e)}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
    def download_file(self, file_key: str, version_id: Optional[str] = None) -> bytes:
        try:
            params = {'Bucket': self.bucket_name, 'Key': file_key}
            if version_id:
                params['VersionId'] = version_id
            
            response = self.s3_client.get_object(**params)
            content = response['Body'].read()
            logger.info(f"File downloaded: {file_key}, Version: {version_id or 'latest'}")
            return content
        except ClientError as e:
            logger.error(f"Download failed for {file_key}: {str(e)}")
            raise Exception(f"Failed to download file: {str(e)}")
    
    def list_object_versions(self, file_key: str) -> List[Dict[str, Any]]:
        try:
            response = self.s3_client.list_object_versions(
                Bucket=self.bucket_name,
                Prefix=file_key
            )
            
            versions = []
            if 'Versions' in response:
                for version in response['Versions']:
                    if version['Key'] == file_key:
                        versions.append({
                            "version_id": version['VersionId'],
                            "is_latest": version['IsLatest'],
                            "last_modified": version['LastModified'].isoformat(),
                            "size": version['Size']
                        })
            
            logger.info(f"Found {len(versions)} versions for {file_key}")
            return sorted(versions, key=lambda v: v['last_modified'], reverse=True)
        except ClientError as e:
            logger.error(f"Failed to list versions for {file_key}: {str(e)}")
            raise Exception(f"Failed to list versions: {str(e)}")
    
    def restore_version(self, file_key: str, version_id: str) -> Dict[str, Any]:
        try:
            copy_source = {
                'Bucket': self.bucket_name,
                'Key': file_key,
                'VersionId': version_id
            }
            
            response = self.s3_client.copy_object(
                Bucket=self.bucket_name,
                CopySource=copy_source,
                Key=file_key
            )
            
            logger.info(f"Version restored: {file_key}, Version: {version_id}")
            return {
                "restored_from_version": version_id,
                "new_version_id": response.get('VersionId')
            }
        except ClientError as e:
            logger.error(f"Failed to restore version for {file_key}: {str(e)}")
            raise Exception(f"Failed to restore version: {str(e)}")

s3_service = S3Service()