from flask import Flask, request, jsonify

from src.config import Config
from src.utils.image_utils import load_image_from_bytes
from src.services.signature_service import SignatureVerifier
from src.services.ocr_service import configure_tesseract, extract_text_from_image
from src.services.forgery_service import detect_copy_move_regions


app = Flask(__name__)
configure_tesseract(Config.TESSERACT_CMD)
signature_verifier = SignatureVerifier(Config.MODEL_PATH)


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "model_loaded": signature_verifier.is_model_loaded(),
            "service": "ai-module",
        }
    )


@app.post("/analyze-document")
def analyze_document():
    if "file" not in request.files:
        return jsonify({"message": "file is required"}), 400

    file = request.files["file"]
    file_bytes = file.read()
    if not file_bytes:
        return jsonify({"message": "uploaded file is empty"}), 400

    try:
        image = load_image_from_bytes(file_bytes)
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    signature_score, forgery_probability = signature_verifier.predict(image)
    extracted_text = extract_text_from_image(image)
    tampered_regions = detect_copy_move_regions(image)

    return jsonify(
        {
            "signature_score": round(signature_score, 4),
            "forgery_probability": round(forgery_probability, 4),
            "tampered_regions": tampered_regions,
            "extracted_text": extracted_text,
        }
    )
if __name__ == "__main__":
    app.run(host=Config.FLASK_HOST, port=Config.FLASK_PORT, debug=Config.FLASK_DEBUG)
