# Review Packet - task-004-overlay-handles

## Task
Overlay Handles

## Owner
UI Agent

## Support
None

## Priority
Medium

## Status
In Progress

## Goal
Improve overlay control with interactive handles

## Requirements
- Resize handles (4 corners)
- Side handles (4 sides)
- Rotate handle
- Drag to move
- Tilt / perspective adjustment
- Mouse / touch support

## Target Files
- frontend/app/components/OverlayCalibrationScreen.js

## Execution Plan
- Verify the current handle model in overlay calibration.
- Add missing corner resize handles without widening scope to perspective warping.
- Keep existing move, side resize, and rotate interactions intact.

## Validation Checklist
- Four corner handles are visible and draggable.
- Four side handles remain functional.
- Rotate handle remains functional.
- Drag-to-move still works with mouse and touch.

## Notes
Perspective/tilt adjustment remains a later pass after the full handle model is stabilized.
