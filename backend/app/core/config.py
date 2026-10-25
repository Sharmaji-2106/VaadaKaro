from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    app_name: str = "VaadaKaro API"

    # MongoDB, e.g. an Atlas mongodb+srv:// string. The path picks the database (default "vaadakaro").
    mongodb_url: str = Field(
        default="mongodb://localhost:27017/vaadakaro",
        validation_alias=AliasChoices("MONGODB_URL", "MONGODB_URI"),
    )

    jwt_secret: str = Field(default="change-me", min_length=8)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60

    cors_origins: list[str] = ["http://localhost:3000"]

    # "memory://" for local dev; "redis://..." (e.g. Upstash) when running several instances.
    rate_limit_storage_uri: str = "memory://"
    failed_login_limit: str = "10/15minutes"
    # Shared with the Next.js frontend; lets its proxy report the real client IP (X-Client-IP).
    proxy_shared_secret: str | None = None

    gemini_api_key: str | None = None
    # gemini-2.5-* are no longer offered to new API keys.
    ai_primary_model: str = "gemini-3.8-flash"
    ai_fallback_model: str = "gemini-3.5-flash-lite"
    ai_timeout_seconds: float = 45.0

    # Cloudflare R2 (S3-compatible). Uploads are disabled when unset.
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str = "vaadakaro-uploads"
    upload_max_bytes: int = 10 * 1024 * 1024
    upload_url_expiry_seconds: int = 600

    duplicate_window_minutes: int = 5

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def uploads_enabled(self) -> bool:
        return bool(self.r2_account_id and self.r2_access_key_id and self.r2_secret_access_key)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and (settings.jwt_secret == "change-me" or len(settings.jwt_secret) < 32):
        raise RuntimeError("JWT_SECRET must be set to a random value of at least 32 characters in production")
    return settings
