# Project State

## Root Structure
- `blank_card.PNG`
- `signed_card.PNG`
- `extract.py`
- `overlay.py`
- `main.py`
- `calibrate.py`
- `output/`
- `frontend/`
- `test_blank_card/`
- `test_captures/`
- `assets/archive/`

## Asset Decisions
- Card force is now the `5 of diamonds`.
- Final normalized reference orientation is horizontal.
- Raw captured card can be vertical; the extraction pipeline attempts to normalize orientation before extraction.

## Reference Assets
- Clean horizontal card reference: [`blank_card.PNG`](../blank_card.PNG)
- Active signed sample: [`signed_card.PNG`](../signed_card.PNG)

## Best Test Inputs Found So Far
- Clean reference source used earlier: `test_blank_card/blank_card5.png`
- Best recent signed sample: `test_blank_card/signed_card4.png`

## Archive
Older heart-card-era assets and variants were moved under:
- [`assets/archive`](../assets/archive)

## Output Meaning
- `aligned_signed_card.png`: signed sample after normalization/alignment
- `extracted_signature.png`: transparent RGBA signature layer
- `final_card.png`: current composite over the clean blank card
- `signature_edit_box.png`: debug image showing the search/edit region
