# Review Packet - task-005-orientation-fix

## Task
Orientation Fix

## Owner
Vision Agent

## Support
Logic Agent

## Priority
Critical

## Status
In Progress

## Goal
Fix overlay orientation mismatch

## Requirements
- Fix mirrored camera feed
- Align overlay orientation
- Ensure signature rotation matches
- Maintain consistent transform logic

## Target Files
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js

## Execution Plan
- Read the task file and current target files.
- Compare intrinsic signature transforms between the two calibration screens.
- Unify transform logic before touching broader camera or tracking code.

## Validation Checklist
- Overlay matches card orientation
- Signature remains aligned

## Notes
Narrowed to the two calibration screens for the first implementation pass.
