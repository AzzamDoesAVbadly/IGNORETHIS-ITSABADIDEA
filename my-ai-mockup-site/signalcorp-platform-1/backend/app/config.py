from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')
    DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///your_database.db')
    API_VERSION = '/api/v1'  # Base API version
    CORS_HEADERS = 'Content-Type'  # CORS settings if needed
    # Add any additional configuration settings here as needed.