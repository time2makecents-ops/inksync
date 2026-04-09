# Task 002 - Unified Calibration Screen

Status: Pending

Assigned By: Navigator
Owner: UI Agent
Support: Logic Agent, Vision Agent
Priority: High

## Goal

Merge the separate calibration surfaces into one coherent workflow that covers camera readiness, overlay alignment, and signature reference setup.

## Requirements

- present one calibration route with clear stages
- include overlay manipulation controls without losing existing precision tools
- expose tracking readiness and calibration confidence in the same workflow
- keep signature reference setup reachable without switching between disconnected screens
- preserve existing saved calibration data during the transition

## Constraints

- do not fold this task into the tracking-engine implementation until the data model is stable
- preserve existing calibration behavior while the unified flow is being introduced
- keep the final UI fast enough for phone use with minimal scrolling

## Target Hints

- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js
- frontend/lib/userPreferences.js

## Validation

- a user can complete the full calibration workflow from one route
- saved calibration data remains compatible with existing local storage keys
- the unified screen exposes camera, overlay, and signature setup clearly on mobile

## Notes

- This task should consume outputs from tasks 001, 004, 005, 006, and 009 instead of re-solving them inline.
