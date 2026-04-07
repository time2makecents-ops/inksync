# Veridex Agent System

Architecture:
- Navigator (control layer)
- UI Agent (visual / calibration)
- Logic Agent (math / rules)
- Vision Agent (image processing)
- Test Agent (validation)

Workflow:

1. Navigator assigns task
2. Agent executes within scope
3. Test Agent validates
4. Navigator approves
5. Commit + merge

Rules:

- No cross-agent edits
- No silent assumptions
- No scope violations
- Navigator final authority

Current Project:
InkSync Signature Reveal Calibration