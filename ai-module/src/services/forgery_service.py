from typing import List
import cv2
import numpy as np

from src.utils.image_utils import to_grayscale


def detect_copy_move_regions(bgr_image: np.ndarray) -> List[str]:
    gray = to_grayscale(bgr_image)

    orb = cv2.ORB_create(1000)
    keypoints, descriptors = orb.detectAndCompute(gray, None)
    if descriptors is None or len(keypoints) < 2:
        return []

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = matcher.knnMatch(descriptors, descriptors, k=2)

    suspicious_boxes = []
    for pair in matches:
        if len(pair) < 2:
            continue
        m, n = pair
        if m.queryIdx == m.trainIdx:
            continue

        # Ratio test for potential similarity between duplicated regions.
        if m.distance < 0.75 * n.distance:
            p1 = keypoints[m.queryIdx].pt
            p2 = keypoints[m.trainIdx].pt
            if abs(p1[0] - p2[0]) > 20 or abs(p1[1] - p2[1]) > 20:
                x, y = int(min(p1[0], p2[0])), int(min(p1[1], p2[1]))
                w, h = int(abs(p1[0] - p2[0])), int(abs(p1[1] - p2[1]))
                suspicious_boxes.append((x, y, max(w, 20), max(h, 20)))

    # Convert to serializable compact string list.
    compact = []
    for x, y, w, h in suspicious_boxes[:20]:
        compact.append(f"x:{x},y:{y},w:{w},h:{h}")
    return compact
