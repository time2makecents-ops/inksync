# Task 009 - Overlay Data Model

Status: Pending

Assigned By: Navigator
Owner: Logic Agent
Support: Vision Agent, UI Agent
Priority: Critical

## Goal

Create the canonical data model for overlays, tracking state, signature references, and keyframes.

## Requirements

- define card transform fields
- define signature transform fields
- define keyframe storage structure
- define tracking metadata and confidence fields
- define persistence boundaries for saved calibration versus live tracking state

## Constraints

- the schema must support existing local-storage snapshots during migration
- the model should work for both single-frame calibration and later timeline keyframes
- avoid coupling the model to one screen-specific state shape

## Target Hints

- frontend/lib/userPreferences.js
- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js

## Validation

- one shared schema can represent calibration, tracking, and keyframes without ambiguity
- persisted overlay data loads consistently across the calibration surfaces
- task 003 and task 006 can build on the model without incompatible rewrites

## Notes

- This is the highest-leverage pending task after tracking because later UI and logic work depend on it.
