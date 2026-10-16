from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CloudLedger"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./cloudledger.db"
    )
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "cloudledger-super-secure-dev-secret-key-32chars-min")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # AWS & Mock Settings
    MOCK_AWS: bool = os.getenv("MOCK_AWS", "true").lower() in ("true", "1", "yes")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_SESSION_TOKEN: Optional[str] = os.getenv("AWS_SESSION_TOKEN")
    CUR_S3_BUCKET: Optional[str] = os.getenv("CUR_S3_BUCKET")
    
    # Admin Seed
    DEFAULT_ADMIN_EMAIL: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@cloudledger.edu")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@CloudLedger2026")
    DEFAULT_ADMIN_NAME: str = os.getenv("DEFAULT_ADMIN_NAME", "Professor Administrator")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
