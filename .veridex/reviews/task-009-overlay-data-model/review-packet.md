# Review Packet - task-009-overlay-data-model

## Task
Overlay Data Model

## Owner
Logic Agent

## Support
Vision Agent, UI Agent

## Priority
Critical

## Status
In Progress

## Goal
Create the canonical data model for overlays, tracking state, signature references, and keyframes.

## Current Slice
First pass is focused on persistence normalization:

- define a shared stored transform shape
- normalize calibration, overlay, and signature snapshots through one schema layer
- preserve compatibility with the existing local-storage keys

This pass does not yet introduce keyframe persistence.

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

## Target Files
- frontend/lib/userPreferences.js
- frontend/app/components/CalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/app/components/SignatureRevealCalibrationScreen.js

## Execution Plan
- Confirm task scope against the goal, requirements, and constraints.
- Inspect the target files and narrow to the minimum implementation surface.
- Execute only the current slice unless the task file explicitly widens scope.
- Validate against the task checklist before moving the task forward.

## Validation Checklist
- one shared schema can represent calibration, tracking, and keyframes without ambiguity
- persisted overlay data loads consistently across the calibration surfaces
- task 003 and task 006 can build on the model without incompatible rewrites

## Notes
- This is the highest-leverage pending task after tracking because later UI and logic work depend on it.
