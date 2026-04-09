# Task 003 - Keyframe System

Status: Pending

Assigned By: Navigator
Owner: Logic Agent
Support: UI Agent, Vision Agent
Priority: High

## Goal

Create a keyframe system that stores overlay transforms over time and supports interpolation between manual and automatic alignment points.

## Requirements

- support manual keyframe creation and deletion
- support start and end markers for tracked segments
- define a keyframe shape that can hold card and signature transforms
- interpolate smoothly between adjacent keyframes
- allow later tasks to attach tracking confidence and timestamps

## UI Requirements

- timeline view
- play and pause controls
- add keyframe action
- frame scrubber or slider

## Logic Requirements

- transform inheritance between frames
- deterministic interpolation rules
- support for partial updates without corrupting neighboring keyframes

## Target Hints

- frontend/app/components/OverlayCalibrationScreen.js
- frontend/lib/userPreferences.js
- frontend/lib/api.js

## Validation

- keyframes can be created, edited, removed, and replayed deterministically
- interpolation behaves consistently between sparse keyframes
- stored keyframes remain compatible with the overlay data model

## Notes

- This task depends on task 009 defining the canonical transform schema.
