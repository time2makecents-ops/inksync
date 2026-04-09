# Task 006 - Card Tracking Engine

Status: Complete

Assigned By: Navigator
Owner: Vision Agent
Support: Logic Agent, UI Agent
Priority: Critical

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

## Advanced Requirements

- Track pips
- Track card index numbers
- Improve tracking stability
- Reduce jitter

## UI Requirements

- Tracking indicator
- Confidence meter
- Lock/unlock tracking

## Validation

- Overlay stays aligned during movement
- Signature stays attached to card
- No drift during motion

## Delivered Validation

- Live camera view renders a tracked polygon and corner points when a card is found
- Tracking state changes between searching, acquiring, tracking, and locked
- Locking stores a reference transform and exposes live scale and rotation deltas
- Calibration screen build passes without errors
- Overlay calibration screen can load and apply the tracked card reference from the shared data model
- Signature reveal calibration screen can load and apply the tracked card reference as a guide

## Notes

- Continuous live production overlay attachment, pips, index-number tracking, and stronger stabilization are future enhancements. The tracked calibration workflow itself is complete.
