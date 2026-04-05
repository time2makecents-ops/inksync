import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from extract import BLANK_CARD_PATH, OUTPUT_DIR, SIGNED_CARD_PATH, extract_signature
from overlay import overlay_signature


CALIBRATION_DIR = OUTPUT_DIR / "calibration"
CALIBRATION_REPORT_PATH = OUTPUT_DIR / "calibration_report.json"
CALIBRATION_PREVIEW_PATH = OUTPUT_DIR / "calibration_preview.png"
TEST_CAPTURES_DIR = Path(__file__).resolve().parent / "test_captures"
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


def _score_range(value: float, low: float, high: float) -> float:
    if value <= low:
        return 0.0
    if value >= high:
        return 1.0
    return (value - low) / (high - low)


def _readiness_label(confidence: float) -> str:
    if confidence >= 0.8:
        return "safe"
    if confidence >= 0.6:
        return "borderline"
    return "not_ready"


def _discover_capture_paths(captures_dir: Path) -> list[Path]:
    if not captures_dir.exists():
        return []
    return sorted(
        path for path in captures_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )


def _build_preview(blank_card_path: Path, final_card_path: Path, preview_path: Path) -> None:
    blank = Image.open(blank_card_path).convert("RGBA")
    final = Image.open(final_card_path).convert("RGBA")

    preview = Image.new("RGBA", (blank.width * 2, blank.height), (255, 255, 255, 255))
    preview.paste(blank, (0, 0))
    preview.paste(final, (blank.width, 0))
    preview.save(preview_path)


def _extract_metrics(
    signed_card_path: Path,
    blank_card_path: Path,
    output_path: Path,
    aligned_output_path: Path,
) -> dict[str, float | int | Path]:
    extraction = extract_signature(
        input_path=signed_card_path,
        blank_card_path=blank_card_path,
        output_path=output_path,
        aligned_output_path=aligned_output_path,
    )

    aligned_image = cv2.imread(str(aligned_output_path), cv2.IMREAD_COLOR)
    blank_image = cv2.imread(str(blank_card_path), cv2.IMREAD_COLOR)
    if aligned_image is None or blank_image is None:
        raise FileNotFoundError(f"Could not load calibration images for {signed_card_path}")

    aligned_gray = cv2.cvtColor(aligned_image, cv2.COLOR_BGR2GRAY)
    brightness = float(aligned_gray.mean())
    sharpness = float(cv2.Laplacian(aligned_gray, cv2.CV_64F).var())

    alignment_confidence = max(0.0, min(1.0, float(extraction["alignment_score"])))
    sharpness_confidence = _score_range(sharpness, 80.0, 400.0)
    brightness_confidence = min(
        _score_range(brightness, 90.0, 150.0),
        _score_range(220.0 - brightness, 40.0, 110.0),
    )
    signature_pixels = int(extraction["alpha_pixels"])
    signature_confidence = _score_range(float(signature_pixels), 1500.0, 9000.0)

    overall_confidence = (
        alignment_confidence * 0.4
        + sharpness_confidence * 0.25
        + brightness_confidence * 0.15
        + signature_confidence * 0.2
    )

    return {
        "alignment_confidence": alignment_confidence,
        "sharpness_confidence": sharpness_confidence,
        "brightness_confidence": brightness_confidence,
        "signature_confidence": signature_confidence,
        "overall_confidence": overall_confidence,
        "alignment_score_raw": round(float(extraction["alignment_score"]), 4),
        "sharpness_raw": round(sharpness, 2),
        "brightness_raw": round(brightness, 2),
        "signature_pixels_raw": signature_pixels,
        "extracted_signature_path": output_path,
        "aligned_card_path": aligned_output_path,
    }


def _run_single_calibration(
    signed_card_path: Path,
    blank_card_path: Path,
    report_path: Path,
    preview_path: Path,
) -> dict[str, float | str | int]:
    extraction_output_path = OUTPUT_DIR / "extracted_signature.png"
    aligned_output_path = OUTPUT_DIR / "aligned_signed_card.png"

    metrics = _extract_metrics(
        signed_card_path=signed_card_path,
        blank_card_path=blank_card_path,
        output_path=extraction_output_path,
        aligned_output_path=aligned_output_path,
    )
    final_card_path = overlay_signature(
        blank_card_path=blank_card_path,
        signature_path=extraction_output_path,
        output_path=OUTPUT_DIR / "final_card.png",
    )

    report = {
        "mode": "single",
        "source_image": str(signed_card_path),
        "readiness": _readiness_label(float(metrics["overall_confidence"])),
        "overall_confidence": round(float(metrics["overall_confidence"]) * 100, 1),
        "alignment_confidence": round(float(metrics["alignment_confidence"]) * 100, 1),
        "sharpness_confidence": round(float(metrics["sharpness_confidence"]) * 100, 1),
        "brightness_confidence": round(float(metrics["brightness_confidence"]) * 100, 1),
        "signature_confidence": round(float(metrics["signature_confidence"]) * 100, 1),
        "alignment_score_raw": metrics["alignment_score_raw"],
        "sharpness_raw": metrics["sharpness_raw"],
        "brightness_raw": metrics["brightness_raw"],
        "signature_pixels_raw": metrics["signature_pixels_raw"],
        "extracted_signature_path": str(metrics["extracted_signature_path"]),
        "final_card_path": str(final_card_path),
        "aligned_card_path": str(metrics["aligned_card_path"]),
        "preview_path": str(preview_path),
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    _build_preview(blank_card_path, final_card_path, preview_path)
    return report


def _run_batch_calibration(
    capture_paths: list[Path],
    blank_card_path: Path,
    report_path: Path,
) -> dict[str, object]:
    CALIBRATION_DIR.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []

    for capture_path in capture_paths:
        stem = capture_path.stem
        extracted_signature_path = CALIBRATION_DIR / f"{stem}_signature.png"
        aligned_output_path = CALIBRATION_DIR / f"{stem}_aligned.png"
        final_card_path = CALIBRATION_DIR / f"{stem}_final.png"
        preview_path = CALIBRATION_DIR / f"{stem}_preview.png"

        metrics = _extract_metrics(
            signed_card_path=capture_path,
            blank_card_path=blank_card_path,
            output_path=extracted_signature_path,
            aligned_output_path=aligned_output_path,
        )
        overlay_signature(
            blank_card_path=blank_card_path,
            signature_path=extracted_signature_path,
            output_path=final_card_path,
        )
        _build_preview(blank_card_path, final_card_path, preview_path)

        result = {
            "source_image": str(capture_path),
            "readiness": _readiness_label(float(metrics["overall_confidence"])),
            "overall_confidence": round(float(metrics["overall_confidence"]) * 100, 1),
            "alignment_confidence": round(float(metrics["alignment_confidence"]) * 100, 1),
            "sharpness_confidence": round(float(metrics["sharpness_confidence"]) * 100, 1),
            "brightness_confidence": round(float(metrics["brightness_confidence"]) * 100, 1),
            "signature_confidence": round(float(metrics["signature_confidence"]) * 100, 1),
            "alignment_score_raw": metrics["alignment_score_raw"],
            "sharpness_raw": metrics["sharpness_raw"],
            "brightness_raw": metrics["brightness_raw"],
            "signature_pixels_raw": metrics["signature_pixels_raw"],
            "extracted_signature_path": str(extracted_signature_path),
            "aligned_card_path": str(aligned_output_path),
            "final_card_path": str(final_card_path),
            "preview_path": str(preview_path),
        }
        results.append(result)

    results.sort(key=lambda item: float(item["overall_confidence"]), reverse=True)
    confidences = [float(item["overall_confidence"]) for item in results]
    safe_count = sum(1 for item in results if item["readiness"] == "safe")
    borderline_count = sum(1 for item in results if item["readiness"] == "borderline")

    summary = {
        "mode": "batch",
        "captures_dir": str(capture_paths[0].parent),
        "capture_count": len(results),
        "safe_count": safe_count,
        "borderline_count": borderline_count,
        "not_ready_count": len(results) - safe_count - borderline_count,
        "average_confidence": round(sum(confidences) / len(confidences), 1),
        "best_confidence": round(max(confidences), 1),
        "worst_confidence": round(min(confidences), 1),
        "readiness": _readiness_label((sum(confidences) / len(confidences)) / 100.0),
        "best_capture": results[0],
        "captures": results,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)
    return summary


def run_calibration(
    signed_card_path: Path = SIGNED_CARD_PATH,
    blank_card_path: Path = BLANK_CARD_PATH,
    report_path: Path = CALIBRATION_REPORT_PATH,
    preview_path: Path = CALIBRATION_PREVIEW_PATH,
    captures_dir: Path = TEST_CAPTURES_DIR,
) -> dict[str, object]:
    capture_paths = _discover_capture_paths(captures_dir)
    if capture_paths:
        return _run_batch_calibration(
            capture_paths=capture_paths,
            blank_card_path=blank_card_path,
            report_path=report_path,
        )

    return _run_single_calibration(
        signed_card_path=signed_card_path,
        blank_card_path=blank_card_path,
        report_path=report_path,
        preview_path=preview_path,
    )


if __name__ == "__main__":
    result = run_calibration()
    print(json.dumps(result, indent=2))
