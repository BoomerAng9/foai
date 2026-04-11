---
name: warn-wire-dont-build
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: perform/src/
  - field: new_text
    operator: regex_match
    pattern: .{100,}
action: warn
---

**WIRE DON'T BUILD.**

Before creating new files in Per|Form, check if existing code already handles this. The platform is 80%+ built. Search the codebase first:
- `grep -r "functionName" perform/src/`
- Check existing API routes, components, and lib files

Only create new files when verified that nothing existing can be wired.
