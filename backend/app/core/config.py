import os
from pathlib import Path
from pydantic import BaseModel, Field

class Settings(BaseModel):
    PROJECT_NAME: str = "FDR Guardian"
    PROJECT_FULL_NAME: str = "Fixed Deposit Receipt Intelligence and Evidence Management Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENV: str = os.getenv("ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fdr-guardian-secure-development-key-change-in-prod-8f2a9c1e4d7b")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{Path(__file__).resolve().parent.parent.parent / 'fdr_guardian.db'}"
    )
    
    # Storage
    STORAGE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent / "storage"
    DOCUMENTS_DIR: Path = STORAGE_DIR / "documents"
    TEMP_DIR: Path = STORAGE_DIR / "temp"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
settings.DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)

