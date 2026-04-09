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
Complete

## Goal
Improve overlay control with interactive handles.

## Current Slice
Completed scope:

- four corner resize handles
- existing side handles retained
- rotate handle retained
- drag-to-move retained

Perspective and tilt warping are explicitly descoped from this task.

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
- Confirm task scope against the goal, requirements, and constraints.
- Inspect the target files and narrow to the minimum implementation surface.
- Execute only the current slice unless the task file explicitly widens scope.
- Validate against the task checklist before moving the task forward.

## Validation Checklist
- four corner handles are visible and draggable
- side handles remain functional
- rotate handle remains functional
- drag-to-move still works with mouse and touch

## Notes
- Perspective and tilt warping are deferred. This handle milestone is complete.
