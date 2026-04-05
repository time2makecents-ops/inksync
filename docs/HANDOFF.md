# InkSync Handoff

## Current Goal
InkSync is currently a prototype for extracting a black signature from a signed `5 of diamonds` playing card image and placing that signature onto a clean horizontal reference card for a video-based magic effect.

The important constraint is:
- raw capture may be vertical or otherwise natural to the handling
- normalized output should be horizontal to match the video card asset

## Current State
- The project is standardized around the `5 of diamonds`.
- The clean reference card is the horizontal asset at [`blank_card.PNG`](../blank_card.PNG).
- The active signed test card is the stronger-contrast sample at [`signed_card.PNG`](../signed_card.PNG).
- The Python pipeline currently runs successfully and produces a `safe` calibration result with the active signed sample.

## Main Files
- [`extract.py`](../extract.py)
- [`overlay.py`](../overlay.py)
- [`main.py`](../main.py)
- [`calibrate.py`](../calibrate.py)

## Current Outputs
- [`output/aligned_signed_card.png`](../output/aligned_signed_card.png)
- [`output/extracted_signature.png`](../output/extracted_signature.png)
- [`output/final_card.png`](../output/final_card.png)
- [`output/signature_edit_box.png`](../output/signature_edit_box.png)
- [`output/calibration_report.json`](../output/calibration_report.json)
- [`output/calibration_preview.png`](../output/calibration_preview.png)

## Frontend Calibration App
A copied Next.js frontend lives under [`frontend`](../frontend). It includes an interactive camera calibration route:
- `/calibration`

Useful frontend files:
- [`frontend/app/components/CalibrationScreen.js`](../frontend/app/components/CalibrationScreen.js)
- [`frontend/package.json`](../frontend/package.json)

The frontend is configured to use port `3015`, not `3001`.

Run it with:

```powershell
cd C:\inksync\frontend
npm run dev:https
```

## Important Notes
- The phone images still show a cool/blue cast. This likely comes from phone camera settings or white balance.
- The current extraction stack works better with darker, bolder ink.
- A fresher pen will improve extraction, but the current test result is already working under harder conditions.

## Recommended Next Work
1. Add color-temperature / white-balance feedback to the calibration UI.
2. Add venue guidance like "too blue", "too cool", or "too much auto-processing".
3. Continue testing with real burst captures from the phone instead of manually curated stills.
4. Eventually move from still-image testing to the full capture workflow with timed camera shots.
