import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings


class StorageService:
    def __init__(self):
        endpoint = (
            f"http://{settings.MINIO_ENDPOINT}"
            if not settings.MINIO_SECURE
            else f"https://{settings.MINIO_ENDPOINT}"
        )
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.MINIO_BUCKET

    def _ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket)

    def put_object(self, key: str, data: bytes) -> str:
        self._ensure_bucket()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    def get_object(self, key: str) -> bytes | None:
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except ClientError:
            return None

    def get_presigned_url(self, key: str, expires_in: int = 300) -> str | None:
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError:
            return None

    def delete_object(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError:
            pass

    def object_exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False
