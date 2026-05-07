import os
from typing import Tuple
import numpy as np
import tensorflow as tf

from src.utils.image_utils import to_grayscale, resize_for_signature


class SignatureVerifier:
    def __init__(self, model_path: str) -> None:
        self.model_path = model_path
        self.model = None
        self._load_model_if_exists()

    def _load_model_if_exists(self) -> None:
        if os.path.exists(self.model_path):
            self.model = tf.keras.models.load_model(self.model_path)

    def is_model_loaded(self) -> bool:
        return self.model is not None

    def predict(self, bgr_image: np.ndarray) -> Tuple[float, float]:
        if self.model is None:
            # Fallback to neutral scores if model is not available yet.
            return 0.5, 0.5

        gray = to_grayscale(bgr_image)
        input_tensor = resize_for_signature(gray)
        genuine_score = float(self.model.predict(input_tensor, verbose=0)[0][0])
        forgery_probability = float(1.0 - genuine_score)
        return genuine_score, forgery_probability
