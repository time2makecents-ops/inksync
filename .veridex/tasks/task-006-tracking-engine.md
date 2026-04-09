# Task 006 - Card Tracking Engine

Status: In Progress

Assigned By: Navigator
Owner: Vision Agent
Support: Logic Agent, UI Agent
Priority: Critical

## Goal

Implement card tracking system to maintain overlay alignment.

## Current Slice

Current slices:

- detect a live card polygon from the camera feed
- estimate corner points
- estimate rotation
- estimate scale change against a locked reference
- expose tracking state and lock or unlock controls
- preserve enough tracked transform data in the calibration snapshot to drive later screens
- expose the tracked card reference on the overlay calibration screen
- allow the overlay calibration screen to apply the tracked reference as a starting transform

This pass does not yet attach the production overlay to the tracked transform.

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

## First Pass Validation

- Live camera view renders a tracked polygon and corner points when a card is found
- Tracking state changes between searching, acquiring, tracking, and locked
- Locking stores a reference transform and exposes live scale and rotation deltas
- Calibration screen build passes without errors
- Overlay calibration screen can load the tracked card reference from the shared data model
- Overlay calibration screen can apply the tracked reference to the active frame

Status: In Progress
