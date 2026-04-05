from pathlib import Path

from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
SIGNATURE_PATH = BASE_DIR / "output" / "extracted_signature.png"
OUTPUT_PATH = BASE_DIR / "output" / "final_card.png"


def resolve_existing_path(*candidates: str) -> Path:
    for candidate in candidates:
        path = BASE_DIR / candidate
        if path.exists():
            return path
    raise FileNotFoundError(f"Could not find any of: {', '.join(candidates)}")


BLANK_CARD_PATH = resolve_existing_path("blank_card.png", "blank_card.PNG")


def overlay_signature(
    blank_card_path: Path = BLANK_CARD_PATH,
    signature_path: Path = SIGNATURE_PATH,
    output_path: Path = OUTPUT_PATH,
) -> Path:
    blank_card = Image.open(blank_card_path).convert("RGBA")
    signature = Image.open(signature_path).convert("RGBA")

    if signature.size != blank_card.size:
        signature = signature.resize(blank_card.size, Image.LANCZOS)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    final_image = Image.alpha_composite(blank_card, signature)

    final_image.save(output_path)
    return output_path


if __name__ == "__main__":
    saved_path = overlay_signature()
    print(f"Saved final card to: {saved_path}")
