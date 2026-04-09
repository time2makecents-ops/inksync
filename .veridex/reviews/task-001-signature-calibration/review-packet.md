# Review Packet - task-001-signature-calibration

## Task
Signature Calibration

## Owner
Vision Agent

## Support
Logic Agent, UI Agent

## Priority
High

## Status
Complete

## Goal
Create a repeatable signature calibration flow that defines how the signed card art is framed, scaled, and stored before reveal playback.

## Requirements
- save and reload signature calibration data from local storage
- preview and refine the reveal signature against sampled frames
- apply the tracked card reference as a guide inside the reveal workflow
- copy and reset signature calibration values across frames
- expose the signature calibration workflow inside the unified calibration route

## Target Files
- frontend/app/components/SignatureRevealCalibrationScreen.js
- frontend/app/components/UnifiedCalibrationScreen.js
- frontend/lib/userPreferences.js

## Validation Checklist
- signature calibration can be saved and reloaded
- reveal preview uses the stored signature reference consistently
- tracked guide can be applied before final reveal tuning

## Notes
- The signature calibration workflow is complete for the current sampled-frame operator flow.
