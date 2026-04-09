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
In Progress

## Goal
Implement card tracking system to maintain overlay alignment.

## Current Slice
First pass is limited to the live calibration surface:

- detect a live card polygon from the camera feed
- estimate corner points
- estimate rotation
- estimate scale change against a locked reference
- expose tracking state and lock or unlock controls

This pass does not yet attach the production overlay to the tracked transform.

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

## Notes
None
