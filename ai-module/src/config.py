import os
from dotenv import load_dotenv


load_dotenv()


class Config:
    FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    MODEL_PATH = os.getenv("MODEL_PATH", "models/signature_cnn.h5")
    TESSERACT_CMD = os.getenv(
        "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )
