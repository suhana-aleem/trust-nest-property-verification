import pytesseract
from src.utils.image_utils import to_grayscale


def configure_tesseract(tesseract_cmd: str) -> None:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd


def extract_text_from_image(bgr_image) -> str:
    gray = to_grayscale(bgr_image)
    text = pytesseract.image_to_string(gray, timeout=20)
    return text.strip()
