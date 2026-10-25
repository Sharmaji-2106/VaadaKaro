"""Evidence uploads on Cloudflare R2 (S3 API) via short-lived presigned URLs.

The browser uploads straight to R2, so files never pass through the API server.
The bucket stays private; files are read back through presigned GET links.
"""

import re
import uuid
from functools import lru_cache

import boto3
from botocore.config import Config

from app.core.config import get_settings

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


@lru_cache
def _client():
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=f"https://{s.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=s.r2_access_key_id,
        aws_secret_access_key=s.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def user_prefix(user_id: str) -> str:
    return f"uploads/{user_id}/"


def make_key(user_id: str, filename: str, content_type: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", filename.rsplit(".", 1)[0])[:60].strip("-") or "file"
    return f"{user_prefix(user_id)}{uuid.uuid4().hex}-{stem}{ALLOWED_TYPES[content_type]}"


def presign_upload(key: str, content_type: str, size: int) -> tuple[str, dict[str, str]]:
    s = get_settings()
    # Content-Type and Content-Length are signed, so the client cannot upload a different type or size.
    url = _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": s.r2_bucket, "Key": key, "ContentType": content_type, "ContentLength": size},
        ExpiresIn=s.upload_url_expiry_seconds,
    )
    return url, {"Content-Type": content_type}


def download_url(stored: str) -> str:
    """Legacy rows hold full Cloudinary URLs; new rows hold R2 keys."""
    if stored.startswith(("http://", "https://")):
        return stored
    s = get_settings()
    if not s.uploads_enabled:
        return ""
    return _client().generate_presigned_url(
        "get_object", Params={"Bucket": s.r2_bucket, "Key": stored}, ExpiresIn=s.upload_url_expiry_seconds
    )
