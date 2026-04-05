from pathlib import Path

import cv2
import numpy as np


BASE_DIR = Path(__file__).resolve().parent
CARD_LABEL = "5_of_diamonds"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_PATH = OUTPUT_DIR / "extracted_signature.png"
ALIGNED_OUTPUT_PATH = OUTPUT_DIR / "aligned_signed_card.png"
DEBUG_BOX_PATH = OUTPUT_DIR / "signature_edit_box.png"
SEARCH_BOX = {
    "x1": 0.20,
    "y1": 0.20,
    "x2": 0.80,
    "y2": 0.80,
}
INK_LIMITS = {
    "max_gray": 150,
    "min_difference": 18,
    "min_alpha": 32,
    "min_component_pixels": 400,
    "padding_x": 0.05,
    "padding_y": 0.07,
    "guide_dilate": 19,
    "darken_strength": 0.58,
}


def resolve_existing_path(*candidates: str) -> Path:
    for candidate in candidates:
        path = BASE_DIR / candidate
        if path.exists():
            return path
    raise FileNotFoundError(f"Could not find any of: {', '.join(candidates)}")


SIGNED_CARD_PATH = resolve_existing_path("signed_card.png", "signed_card.PNG")
BLANK_CARD_PATH = resolve_existing_path("blank_card.png", "blank_card.PNG")


def build_red_mask(image: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lower_red_1 = np.array([0, 70, 50], dtype=np.uint8)
    upper_red_1 = np.array([10, 255, 255], dtype=np.uint8)
    lower_red_2 = np.array([170, 70, 50], dtype=np.uint8)
    upper_red_2 = np.array([180, 255, 255], dtype=np.uint8)

    mask_1 = cv2.inRange(hsv, lower_red_1, upper_red_1)
    mask_2 = cv2.inRange(hsv, lower_red_2, upper_red_2)
    mask = cv2.bitwise_or(mask_1, mask_2)

    kernel = np.ones((3, 3), np.uint8)
    return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)


def rotate_image(image: np.ndarray, turns: int) -> np.ndarray:
    turns = turns % 4
    if turns == 0:
        return image.copy()
    return np.ascontiguousarray(np.rot90(image, k=turns))


def normalize_processing_image(image: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    normalized = cv2.merge((l_channel, a_channel, b_channel))
    return cv2.cvtColor(normalized, cv2.COLOR_LAB2BGR)


def find_red_landmarks(image: np.ndarray, max_points: int = 5) -> np.ndarray:
    mask = build_red_mask(image)
    component_count, _, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)

    points = []
    for component_index in range(1, component_count):
        area = int(stats[component_index, cv2.CC_STAT_AREA])
        if area < 2500:
            continue
        cx, cy = centroids[component_index]
        points.append((area, float(cx), float(cy)))

    points.sort(key=lambda item: item[0], reverse=True)
    top_points = np.array([[x, y] for _, x, y in points[:max_points]], dtype=np.float32)
    if len(top_points) < max_points:
        return np.empty((0, 2), dtype=np.float32)

    return top_points[np.lexsort((top_points[:, 0], top_points[:, 1]))]


def build_outer_diamond_exclusion_mask(image: np.ndarray) -> np.ndarray:
    mask = np.zeros(image.shape[:2], dtype=np.uint8)
    points = find_red_landmarks(image)
    if len(points) != 5:
        return mask

    center_index = int(np.argmin(np.sum((points - points.mean(axis=0)) ** 2, axis=1)))
    height, width = image.shape[:2]
    pad_x = int(width * 0.055)
    pad_y = int(height * 0.09)

    for index, (cx, cy) in enumerate(points):
        if index == center_index:
            continue
        x1 = max(0, int(cx) - pad_x)
        y1 = max(0, int(cy) - pad_y)
        x2 = min(width, int(cx) + pad_x)
        y2 = min(height, int(cy) + pad_y)
        mask[y1:y2, x1:x2] = 255

    return mask


def estimate_landmark_alignment(
    signed_image: np.ndarray,
    blank_image: np.ndarray,
) -> tuple[np.ndarray, float]:
    blank_height, blank_width = blank_image.shape[:2]
    blank_mask = build_red_mask(blank_image).astype(np.float32) / 255.0
    blank_points = find_red_landmarks(blank_image)
    rotations = (
        ("none", lambda image: rotate_image(image, 0)),
        ("rotate_90_clockwise", lambda image: rotate_image(image, 3)),
        ("rotate_180", lambda image: rotate_image(image, 2)),
        ("rotate_90_counterclockwise", lambda image: rotate_image(image, 1)),
    )

    best_aligned = cv2.resize(
        signed_image,
        (blank_width, blank_height),
        interpolation=cv2.INTER_LINEAR,
    )
    best_score = 0.0

    for _, rotate_fn in rotations:
        rotated = rotate_fn(signed_image)
        resized = cv2.resize(rotated, (blank_width, blank_height), interpolation=cv2.INTER_LINEAR)
        signed_points = find_red_landmarks(resized)

        if len(blank_points) != 5 or len(signed_points) != 5:
            aligned = resized
        else:
            matrix, _ = cv2.estimateAffinePartial2D(signed_points, blank_points, method=cv2.LMEDS)
            if matrix is None:
                aligned = resized
            else:
                aligned = cv2.warpAffine(
                    resized,
                    matrix,
                    (blank_width, blank_height),
                    flags=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_REPLICATE,
                )

        signed_mask = build_red_mask(aligned).astype(np.float32) / 255.0
        overlap_score = 1.0 - float(np.mean(np.abs(blank_mask - signed_mask)))
        if overlap_score > best_score:
            best_score = overlap_score
            best_aligned = aligned

    return best_aligned, max(0.0, float(best_score))


def align_to_blank(
    signed_image: np.ndarray,
    blank_image: np.ndarray,
) -> tuple[np.ndarray, float]:
    return estimate_landmark_alignment(signed_image, blank_image)


def _compute_signature_alpha(
    aligned_signed: np.ndarray,
    blank_image: np.ndarray,
    difference_threshold: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    processing_signed = normalize_processing_image(aligned_signed)
    processing_blank = normalize_processing_image(blank_image)
    signed_gray = cv2.cvtColor(processing_signed, cv2.COLOR_BGR2GRAY)
    blank_gray = cv2.cvtColor(processing_blank, cv2.COLOR_BGR2GRAY)

    gray_difference = cv2.subtract(blank_gray, signed_gray)
    channel_difference = cv2.subtract(processing_blank, processing_signed)
    max_channel_difference = channel_difference.max(axis=2)

    darkness_mask = cv2.inRange(signed_gray, 0, INK_LIMITS["max_gray"])
    gray_mask = cv2.inRange(gray_difference, max(difference_threshold, INK_LIMITS["min_difference"]), 255)
    channel_mask = cv2.inRange(max_channel_difference, max(difference_threshold, INK_LIMITS["min_difference"]), 255)
    mask = cv2.bitwise_and(darkness_mask, cv2.bitwise_or(gray_mask, channel_mask))

    signed_b, signed_g, signed_r = cv2.split(processing_signed)
    _, _, blank_r = cv2.split(processing_blank)
    red_overlap_mask = cv2.inRange(blank_r.astype(np.int16) - signed_r.astype(np.int16), 10, 255)
    neutral_ink_mask = cv2.inRange(
        np.maximum.reduce(
            [
                np.abs(signed_r.astype(np.int16) - signed_g.astype(np.int16)),
                np.abs(signed_r.astype(np.int16) - signed_b.astype(np.int16)),
                np.abs(signed_g.astype(np.int16) - signed_b.astype(np.int16)),
            ]
        ).astype(np.uint8),
        0,
        55,
    )
    mask = cv2.bitwise_and(mask, cv2.bitwise_or(neutral_ink_mask, red_overlap_mask))

    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.medianBlur(mask, 3)

    height, width = blank_image.shape[:2]
    search_x1 = int(width * SEARCH_BOX["x1"])
    search_y1 = int(height * SEARCH_BOX["y1"])
    search_x2 = int(width * SEARCH_BOX["x2"])
    search_y2 = int(height * SEARCH_BOX["y2"])
    search_mask = np.zeros((height, width), dtype=np.uint8)
    search_mask[search_y1:search_y2, search_x1:search_x2] = 255

    # Keep extraction in a broad center search area, then auto-fit a tighter
    # edit box around the detected ink with padding so different names fit.
    mask = cv2.bitwise_and(mask, search_mask)

    # Remove small stray regions so isolated dust and texture do not survive.
    component_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    cleaned_mask = np.zeros_like(mask)
    for component_index in range(1, component_count):
        area = stats[component_index, cv2.CC_STAT_AREA]
        if area >= INK_LIMITS["min_component_pixels"]:
            cleaned_mask[labels == component_index] = 255
    mask = cleaned_mask

    outer_diamond_exclusion = build_outer_diamond_exclusion_mask(blank_image)
    mask = cv2.bitwise_and(mask, cv2.bitwise_not(outer_diamond_exclusion))

    points = cv2.findNonZero(mask)
    if points is not None:
        x, y, w, h = cv2.boundingRect(points)
        pad_x = int(width * INK_LIMITS["padding_x"])
        pad_y = int(height * INK_LIMITS["padding_y"])
        x1 = max(search_x1, x - pad_x)
        y1 = max(search_y1, y - pad_y)
        x2 = min(search_x2, x + w + pad_x)
        y2 = min(search_y2, y + h + pad_y)
    else:
        x1, y1, x2, y2 = search_x1, search_y1, search_x2, search_y2

    edit_box_mask = np.zeros((height, width), dtype=np.uint8)
    edit_box_mask[y1:y2, x1:x2] = 255
    mask = cv2.bitwise_and(mask, edit_box_mask)

    alpha_source = np.maximum(gray_difference * 5, max_channel_difference * 5)
    alpha = np.clip(alpha_source, 0, 255).astype(np.uint8)
    alpha = cv2.bitwise_and(alpha, mask)
    _, alpha = cv2.threshold(alpha, INK_LIMITS["min_alpha"], 255, cv2.THRESH_TOZERO)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)

    rgba = np.zeros((blank_image.shape[0], blank_image.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = aligned_signed
    rgba[:, :, 3] = alpha
    debug_box = blank_image.copy()
    debug_box[outer_diamond_exclusion > 0] = (
        debug_box[outer_diamond_exclusion > 0] * np.array([0.72, 0.82, 1.0])
    ).astype(np.uint8)
    cv2.rectangle(debug_box, (search_x1, search_y1), (search_x2, search_y2), (40, 160, 255), 4)
    cv2.rectangle(debug_box, (x1, y1), (x2, y2), (20, 220, 20), 6)
    return rgba, alpha, debug_box


def _refine_signature_layer(
    aligned_signed: np.ndarray,
    blank_image: np.ndarray,
    base_alpha: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    guide_kernel = np.ones((INK_LIMITS["guide_dilate"], INK_LIMITS["guide_dilate"]), np.uint8)
    guide_mask = cv2.dilate((base_alpha > 0).astype(np.uint8) * 255, guide_kernel, iterations=1)

    processing_signed = normalize_processing_image(aligned_signed)
    processing_blank = normalize_processing_image(blank_image)
    signed_gray = cv2.cvtColor(processing_signed, cv2.COLOR_BGR2GRAY)
    blank_gray = cv2.cvtColor(processing_blank, cv2.COLOR_BGR2GRAY)
    gray_difference = cv2.subtract(blank_gray, signed_gray)

    dark_mask = cv2.inRange(signed_gray, 0, 175)
    diff_mask = cv2.inRange(gray_difference, 8, 255)
    refined_mask = cv2.bitwise_and(guide_mask, cv2.bitwise_and(dark_mask, diff_mask))

    component_count, labels, stats, _ = cv2.connectedComponentsWithStats(refined_mask, connectivity=8)
    cleaned_mask = np.zeros_like(refined_mask)
    for component_index in range(1, component_count):
        area = stats[component_index, cv2.CC_STAT_AREA]
        if area >= max(100, INK_LIMITS["min_component_pixels"] // 3):
            cleaned_mask[labels == component_index] = 255
    refined_mask = cv2.GaussianBlur(cleaned_mask, (3, 3), 0)

    refined_alpha = cv2.bitwise_and(base_alpha, refined_mask)
    boosted_alpha = np.clip(refined_alpha.astype(np.float32) * 1.18, 0, 255).astype(np.uint8)

    rgba = np.zeros((blank_image.shape[0], blank_image.shape[1], 4), dtype=np.uint8)
    signature_rgb = aligned_signed.astype(np.float32)
    signature_rgb = np.clip(signature_rgb * (1.0 - INK_LIMITS["darken_strength"]), 0, 255)
    rgba[:, :, :3] = signature_rgb.astype(np.uint8)
    rgba[:, :, 3] = boosted_alpha
    return rgba, boosted_alpha


def extract_signature(
    input_path: Path = SIGNED_CARD_PATH,
    blank_card_path: Path = BLANK_CARD_PATH,
    output_path: Path = OUTPUT_PATH,
    aligned_output_path: Path | None = ALIGNED_OUTPUT_PATH,
    difference_threshold: int = 25,
) -> dict[str, float | int | Path]:
    signed_image = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
    blank_image = cv2.imread(str(blank_card_path), cv2.IMREAD_COLOR)

    if signed_image is None:
        raise FileNotFoundError(f"Could not load image: {input_path}")
    if blank_image is None:
        raise FileNotFoundError(f"Could not load image: {blank_card_path}")

    aligned_signed, alignment_score = align_to_blank(signed_image, blank_image)
    _, alpha, debug_box = _compute_signature_alpha(
        aligned_signed,
        blank_image,
        difference_threshold,
    )
    rgba, alpha = _refine_signature_layer(aligned_signed, blank_image, alpha)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if aligned_output_path is not None:
        cv2.imwrite(str(aligned_output_path), aligned_signed)
    cv2.imwrite(str(DEBUG_BOX_PATH), debug_box)
    cv2.imwrite(str(output_path), rgba)
    return {
        "card_label": CARD_LABEL,
        "output_path": output_path,
        "aligned_output_path": aligned_output_path,
        "debug_box_path": DEBUG_BOX_PATH,
        "alignment_score": alignment_score,
        "alpha_pixels": int(np.count_nonzero(alpha)),
        "alpha_max": int(alpha.max()),
        "alpha_mean_nonzero": float(alpha[alpha > 0].mean()) if np.any(alpha > 0) else 0.0,
    }


if __name__ == "__main__":
    result = extract_signature()
    print(f"Saved extracted signature to: {result['output_path']}")
