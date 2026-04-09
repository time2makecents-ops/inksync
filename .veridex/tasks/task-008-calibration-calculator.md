# Task 008 - Calibration Calculator
Status: Complete
Assigned By: Navigator
Owner: Logic Agent
Support: UI Agent
Priority: Medium
## Goal
Add calibration calculator tools that help convert card, overlay, and transform measurements into repeatable adjustments.
## Requirements
- compute card-size and overlay-scale relationships
- provide rotation and aspect-ratio helpers
- support perspective or tilt helper values without blocking the main workflow
- keep the calculations instant and local
- expose calculator outputs in a way the calibration UI can consume
## Constraints
- keep the calculator lightweight and secondary to the main calibration flow
- avoid introducing server dependencies for simple transform math
- align all formulas with the task-009 data model
## Target Hints
- frontend/app/components/CalibrationCalculatorPanel.js
- frontend/app/components/UnifiedCalibrationScreen.js
- frontend/app/components/OverlayCalibrationScreen.js
- frontend/lib/userPreferences.js
## Validation
- calculator inputs produce deterministic outputs
- relevant overlay values update from calculator results without reloads
- values persist when persistence is expected
## Notes
- Completed with a local persistent calculator panel that consumes the shared transform primitives, computes scale, aspect, and rotation helpers, and can apply values back into the active overlay frame without a page reload.