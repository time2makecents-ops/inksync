# Task 005 - Orientation Fix

Status: Review

Assigned By: Navigator
Owner: Vision Agent
Support: Logic Agent
Priority: Critical

## Goal

Fix overlay orientation mismatch.

## Current Slice

First pass shipped:

- unified intrinsic signature orientation logic between the overlay calibration screen and the signature reveal calibration screen

Remaining follow-up:

- verify that the same transform assumptions hold once tracking data starts driving the overlay

## Requirements

- Fix mirrored camera feed
- Align overlay orientation
- Ensure signature rotation matches
- Maintain consistent transform logic

## Validation

- overlay matches card orientation in the calibration flow
- signature remains aligned in the reveal calibration flow

## Notes

- This task should only return to In Progress if tracking integration exposes a new orientation mismatch.
