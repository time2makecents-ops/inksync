# Task 007 - Calibration UI Redesign

Status: Pending

Assigned By: Navigator
Owner: UI Agent
Support: Logic Agent, Vision Agent
Priority: High

## Goal

Redesign the calibration workflow so the active controls are visible, dense, and usable on both desktop and mobile without long scrolling.

## Requirements

- reduce vertical sprawl in the calibration flow
- keep the live preview and primary controls visible together
- expose overlay, tracking, and reset actions clearly
- preserve precision controls for advanced adjustments
- maintain a distinct operator-first InkSync visual style

## Constraints

- do not merge this task with the data-model or tracking-engine logic changes
- preserve the existing calibration functionality while redesigning the layout
- optimize for phone ergonomics first, then desktop expansion

## Target Hints

- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js
- frontend/app/components/ClassroomScreen.js

## Validation

- key calibration actions remain visible without excessive scrolling on mobile
- the redesign still exposes the required overlay controls
- the updated layout remains coherent with the rest of the InkSync UI

## Notes

- This task should start after the data model and tracking surfaces are stable enough to design around.
