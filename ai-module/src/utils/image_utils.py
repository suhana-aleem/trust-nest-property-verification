from typing import Tuple
import io
import cv2
import numpy as np
import pypdfium2 as pdfium


def load_image_from_bytes(file_bytes: bytes) -> np.ndarray:
    if file_bytes[:4] == b"%PDF":
        return _pdf_first_page_to_bgr(file_bytes)

    np_arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode uploaded file as image")
    return image


def _pdf_first_page_to_bgr(file_bytes: bytes) -> np.ndarray:
    try:
        pdf = pdfium.PdfDocument(io.BytesIO(file_bytes))
        if len(pdf) == 0:
            raise ValueError("Uploaded PDF has no pages")

        page = pdf[0]
        pil_img = page.render(scale=1.3).to_pil()
        rgb_img = np.array(pil_img.convert("RGB"))
        bgr_img = cv2.cvtColor(rgb_img, cv2.COLOR_RGB2BGR)
        return bgr_img
    except Exception as exc:
        raise ValueError(f"Unable to decode uploaded PDF: {exc}") from exc


def to_grayscale(image: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def resize_for_signature(image_gray: np.ndarray, size: Tuple[int, int] = (128, 128)) -> np.ndarray:
    resized = cv2.resize(image_gray, size)
    normalized = resized.astype("float32") / 255.0
    return normalized.reshape(1, size[1], size[0], 1)
