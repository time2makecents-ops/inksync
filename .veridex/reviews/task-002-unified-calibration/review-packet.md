# Review Packet - task-002-unified-calibration

## Task
Unified Calibration Screen

## Owner
UI Agent

## Support
Logic Agent, Vision Agent

## Priority
High

## Status
Complete

## Goal
Merge the separate calibration surfaces into one coherent workflow that covers camera readiness, overlay alignment, and signature reference setup.

## Requirements
- `/calibration` acts as the unified operator route
- camera tracking, overlay alignment, and signature reveal are staged under one tabbed workspace
- existing dedicated routes remain available for focused work

## Target Files
- frontend/app/calibration/page.js
- frontend/app/components/UnifiedCalibrationScreen.js
- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js

## Validation Checklist
- a user can complete the full calibration workflow from one route
- tracking, overlay, and reveal stages remain reachable without changing routes
- the unified screen builds and renders successfully

## Notes
- Further visual refinement belongs to task 007, not this workflow-unification milestone.
