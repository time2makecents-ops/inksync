from extract import extract_signature
from overlay import overlay_signature


def main() -> None:
    extraction = extract_signature()
    overlay_signature()
    print(f"Processed {extraction['card_label']} and saved outputs to output/.")


if __name__ == "__main__":
    main()
