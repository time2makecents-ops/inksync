# Review Packet - task-006-tracking-engine

## Task
Card Tracking Engine

## Owner
Vision Agent

## Support
Logic Agent, UI Agent

## Priority
Critical

## Status
Complete

## Goal
Implement card tracking system to maintain overlay alignment.

## Current Slice
Completed scope:

- detect a live card polygon from the camera feed
- estimate corner points
- estimate rotation
- estimate scale change against a locked reference
- expose tracking state and lock or unlock controls
- preserve enough tracked transform data in the calibration snapshot to drive later screens
- expose the tracked card reference on the overlay calibration screen
- allow the overlay calibration screen to apply the tracked reference as a starting transform
- expose the tracked card reference on the signature reveal screen
- allow the signature reveal screen to apply the tracked guide as a starting reference

This completes the current tracked calibration workflow.

## Requirements
- Track card edges
- Track corner points
- Track card rotation
- Track scale changes
- Maintain overlay alignment
- Use card as reference for signature

## Target Files
- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js
- frontend/lib/userPreferences.js

## Execution Plan
- Confirm task scope against the goal, requirements, and constraints.
- Inspect the target files and narrow to the minimum implementation surface.
- Execute only the current slice unless the task file explicitly widens scope.
- Validate against the task checklist before moving the task forward.

## Validation Checklist
- Overlay stays aligned during movement
- Signature stays attached to card
- No drift during motion
- Overlay calibration screen can load and apply the tracked reference baseline
- Signature reveal calibration screen can load and apply the tracked reference guide

## Notes
- Continuous live production overlay attachment, pips, index-number tracking, and stronger stabilization are future enhancements. The tracked calibration workflow itself is complete.
