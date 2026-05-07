import argparse
import cv2

from src.services.signature_service import SignatureVerifier


def main():
    parser = argparse.ArgumentParser(description="Predict signature genuineness")
    parser.add_argument("--model_path", default="models/signature_cnn.h5")
    parser.add_argument("--image_path", required=True)
    args = parser.parse_args()

    image = cv2.imread(args.image_path)
    if image is None:
        raise ValueError("Unable to read image. Check --image_path")

    verifier = SignatureVerifier(args.model_path)
    if not verifier.is_model_loaded():
        raise FileNotFoundError(f"Model not found at {args.model_path}")

    signature_score, forgery_probability = verifier.predict(image)
    print(f"signature_score={signature_score:.4f}")
    print(f"forgery_probability={forgery_probability:.4f}")


if __name__ == "__main__":
    main()
