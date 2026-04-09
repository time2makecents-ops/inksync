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
Pending

## Goal
Create a repeatable signature calibration flow that defines how the signed card art is framed, scaled, and stored before reveal playback.

## Requirements
- capture a clean reference of the signed card face
- define the intrinsic signature transform relative to the card
- save and reload signature calibration data from local storage
- preview the reveal alignment against the saved calibration
- provide a reset path when the reference becomes invalid

## Constraints
- stay inside the existing signature calibration surfaces before widening to the full overlay flow
- keep persistence compatible with frontend/lib/userPreferences.js
- avoid introducing tracking dependencies into the first signature-calibration pass

## Target Files
- frontend/app/components/SignatureRevealCalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/lib/userPreferences.js

## Execution Plan
- Confirm task scope against the goal, requirements, and constraints.
- Inspect the target files and narrow to the minimum implementation surface.
- Execute only the current slice unless the task file explicitly widens scope.
- Validate against the task checklist before moving the task forward.

## Validation Checklist
- signature calibration can be saved and reloaded
- reveal preview uses the stored signature reference consistently
- reset clears the stored signature calibration cleanly

## Notes
- This task should establish the reference data that later tracking and overlay tasks attach to.
