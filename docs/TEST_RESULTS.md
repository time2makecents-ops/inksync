# Test Results

## Latest Calibration Snapshot
Source:
- [`signed_card.PNG`](../signed_card.PNG)

Reported metrics from [`output/calibration_report.json`](../output/calibration_report.json):
- Readiness: `safe`
- Overall confidence: `84.1%`
- Alignment confidence: `97.8%`
- Sharpness confidence: `100.0%`
- Brightness confidence: `0.0%`
- Signature confidence: `100.0%`
- Alignment score raw: `0.9784`
- Sharpness raw: `691.53`
- Brightness raw: `207.49`

## Interpretation
- Alignment is strong.
- Signature extraction is strong enough for the current prototype.
- Brightness is still too high, which matches the visible cool/bright phone processing.
- Despite the brightness issue, the current test sample is usable.

## Visual Review Files
- [`output/aligned_signed_card.png`](../output/aligned_signed_card.png)
- [`output/extracted_signature.png`](../output/extracted_signature.png)
- [`output/final_card.png`](../output/final_card.png)
- [`output/signature_edit_box.png`](../output/signature_edit_box.png)

## Practical Read
- The system currently performs better with darker signatures.
- For video use, a slightly darker signature is acceptable and likely preferable.
- The next non-algorithmic improvement is better phone camera tuning, especially white balance and exposure.
