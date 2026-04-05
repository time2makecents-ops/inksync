# Next Steps

## Highest Value Technical Next Steps
1. Add white-balance / color-temperature guidance to the frontend calibration screen.
2. Add live feedback for over-bright images and cool/blue phone processing.
3. Start testing with timed camera captures from the frontend calibration app instead of manually curated stills.
4. Add a review mode that scores each timed shot and says whether it is performance-safe.

## Capture Guidance
- Use the darker signature look if possible.
- A better pen will help.
- The current system is robust enough that harder conditions are still worth testing.

## Things To Avoid
- Avoid returning to the center-diamond-cut duplicate-layer experiment; it created a visible square artifact.
- Avoid relying on the whole-card texture as an alignment signal.
- Keep using red landmarks rather than generic full-image matching.

## Known Good Commands
Run Python pipeline:

```powershell
cd C:\inksync
python main.py
python calibrate.py
```

Run frontend calibration app:

```powershell
cd C:\inksync\frontend
npm run dev:https
```

Open:

```text
https://<your-computer-ip>:3015/calibration
```
