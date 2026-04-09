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
First implementation pass is limited to calibration tracking instrumentation:

- detect a live card polygon in the calibration camera feed
- render corner points and a tracked polygon
- estimate rotation and scale
- allow lock or unlock of a reference transform
- surface tracking state in the calibration UI

Deferred to later passes:

- attach the production overlay to the tracked transform
- stabilize tracking across harder motion and lighting transitions
- persist richer tracking references beyond the snapshot metadata

## Target Files
- frontend/app/components/CalibrationScreen.js

## Execution Plan
- Confirm the existing live calibration metrics and camera loop.
- Add explicit tracking transform metrics on top of the current heuristics.
- Render the tracked polygon and corners in the live calibration view.
- Add lock or unlock controls and baseline drift comparison.
- Validate with a production build before widening scope.

## Validation Checklist
- Calibration screen renders a live tracked polygon when a card is detected
- Corner points update with card movement
- Rotation and scale metrics update without breaking existing calibration guidance
- Locking tracking stores a baseline and exposes live drift values
- `next build` passes

## Notes
This packet documents only the first tracking slice. Full overlay attachment remains a later task-006 pass.
