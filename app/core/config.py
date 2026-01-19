# app/core/config.py
import os
from pydantic_settings import BaseSettings # pydantic-settings 설치 필요
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ALGORITHM: str = "HS256"

    authlib_insecure_transport: str = "false"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
