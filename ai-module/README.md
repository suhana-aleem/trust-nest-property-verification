# AI Module - Flask + TensorFlow + OpenCV + Tesseract

This module provides AI-based property document analysis for the backend.

## 1. Features

- Signature verification using CNN (binary: genuine/forged)
- OCR text extraction using Tesseract
- Basic copy-move forgery detection using ORB features
- Unified API endpoint:
  - `POST /analyze-document`

Response format:

```json
{
  "signature_score": 0.8123,
  "forgery_probability": 0.1877,
  "tampered_regions": ["x:12,y:40,w:66,h:24"],
  "extracted_text": "..."
}
```

## 2. Folder Structure

```text
ai-module/
  src/
    app.py
    config.py
    services/
      signature_service.py
      ocr_service.py
      forgery_service.py
    utils/
      image_utils.py
  training/
    train_signature_model.py
    predict_signature.py
  models/
  sample_data/
  requirements.txt
  .env.example
```

## 3. Prerequisites

1. Python 3.10+ recommended
2. Tesseract OCR installed on system
   - Windows default path: `C:\Program Files\Tesseract-OCR\tesseract.exe`

## 4. Installation

```bash
cd ai-module
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` from template:

```bash
copy .env.example .env
```

Set `TESSERACT_CMD` correctly in `.env`.

## 5. Dataset Layout for Training

Create this structure:

```text
sample_data/signature_dataset/
  genuine/
    img1.png
    img2.png
  forged/
    img1.png
    img2.png
```

- Images can be JPG/PNG.
- Training script auto-resizes to 128x128 grayscale.

## 6. Train CNN Model

```bash
python training/train_signature_model.py --data_dir sample_data/signature_dataset --epochs 15 --model_out models/signature_cnn.h5
```

This saves model at:
- `models/signature_cnn.h5`

## 7. Local Prediction Test

```bash
python training/predict_signature.py --model_path models/signature_cnn.h5 --image_path path_to_signature_image.png
```

## 8. Run Flask API

```bash
python -m src.app
```

Health check:
- `GET http://localhost:5001/health`

Analyze endpoint:
- `POST http://localhost:5001/analyze-document`
- Form-data key: `file`

## 9. Node Backend Integration

Your backend is already prepared to call this API in:
- `server/src/services/aiService.js`

Ensure in backend `.env`:

```env
AI_API_URL=http://localhost:5001
```

Flow:
1. Upload document in backend.
2. Call `POST /api/documents/:id/analyze-ai`.
3. Backend sends file to Flask `/analyze-document`.
4. AI results are stored in MongoDB document `aiAnalysis`.

## 10. Notes / Limitations

- API supports PDF/JPG/PNG. For PDF, first page is rendered and analyzed.
- Copy-move detection is basic and demo-oriented (academic prototype scope).
