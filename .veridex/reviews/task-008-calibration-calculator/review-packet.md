# Review Packet - task-008-calibration-calculator

## Task
Calibration Calculator

## Owner
Logic Agent

## Support
UI Agent

## Priority
Medium

## Status
Pending

## Goal
Add calibration calculator tools that help convert card, overlay, and transform measurements into repeatable adjustments.

## Requirements
- compute card-size and overlay-scale relationships
- provide rotation and aspect-ratio helpers
- support perspective or tilt helper values without blocking the main workflow
- keep the calculations instant and local
- expose calculator outputs in a way the calibration UI can consume

## Constraints
- keep the calculator lightweight and secondary to the main calibration flow
- avoid introducing server dependencies for simple transform math
- align all formulas with the task-009 data model

## Target Files
- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/lib/api.js
- frontend/lib/userPreferences.js

## Execution Plan
- Confirm task scope against the goal, requirements, and constraints.
- Inspect the target files and narrow to the minimum implementation surface.
- Execute only the current slice unless the task file explicitly widens scope.
- Validate against the task checklist before moving the task forward.

## Validation Checklist
- calculator inputs produce deterministic outputs
- relevant overlay values update from calculator results without reloads
- values persist when persistence is expected

## Notes
- This task should consume transform primitives from the shared overlay data model instead of inventing its own shape.
