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
Review

## Goal
Fix overlay orientation mismatch.

## Current Slice
First pass shipped:

- unified intrinsic signature orientation logic between the overlay calibration screen and the signature reveal calibration screen

Remaining follow-up:

- verify that the same transform assumptions hold once tracking data starts driving the overlay

## Requirements
- Fix mirrored camera feed
- Align overlay orientation
- Ensure signature rotation matches
- Maintain consistent transform logic

## Target Files
- frontend/app/components/SignatureRevealCalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js

## Execution Plan
- Confirm task scope against the goal, requirements, and constraints.
- Inspect the target files and narrow to the minimum implementation surface.
- Execute only the current slice unless the task file explicitly widens scope.
- Validate against the task checklist before moving the task forward.

## Validation Checklist
- overlay matches card orientation in the calibration flow
- signature remains aligned in the reveal calibration flow

## Notes
- This task should only return to In Progress if tracking integration exposes a new orientation mismatch.
