# Review Packet - task-009-overlay-data-model

## Task
Overlay Data Model

## Owner
Logic Agent

## Support
Vision Agent, UI Agent

## Priority
Critical

## Status
Complete

## Goal
Create the canonical data model for overlays, tracking state, signature references, and keyframes.

## Requirements
- shared transform normalization in `frontend/lib/userPreferences.js`
- shared calibration snapshot builders and readers
- shared overlay and signature snapshot builders and readers
- tracking-reference transform derivation from saved calibration data
- persisted keyframe ids for overlay calibration

## Target Files
- frontend/lib/userPreferences.js
- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js

## Validation Checklist
- one shared schema represents calibration, tracking, overlays, signature references, and keyframes without ambiguity
- persisted data loads consistently across calibration, overlay, and reveal surfaces
- task 003 and task 006 build on the same schema without incompatible rewrites

## Notes
- Export and broader production persistence can extend this model later without replacing the current schema layer.
