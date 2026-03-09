# SMB4 Other-AI Prompt Package

## Purpose
This folder is a handoff package for another AI to do two things:
- calculate SMB4-style player grades from player inputs
- generate fictional SMB4-style players from target constraints

## Files
- `MASTER_PROMPT.md`: copy-paste prompt for the other AI
- `CLAUDE_MASTER_PROMPT.md`: Claude-tailored prompt with stricter JSON-first behavior
- `CLAUDE_SINGLE_FILE_BUNDLE.md`: one-file Claude package with prompt, formula, trait report, schemas, and examples
- `FORMULA_SPEC.md`: human-readable grade formula
- `TRAIT_REPORT.md`: trait-value interpretation and context
- `player_input.schema.json`: schema for a single player object
- `generation_request.schema.json`: schema for a player generation request
- `example_hitter.json`: example hitter input
- `example_pitcher.json`: example pitcher input
- `example_generation_request.json`: example generation request

## Recommended Handoff
Upload or paste these files to the other AI in this order:
1. `MASTER_PROMPT.md`
2. `FORMULA_SPEC.md`
3. `TRAIT_REPORT.md`
4. `player_input.schema.json`
5. `generation_request.schema.json`

For Claude specifically, preferred handoff options are:
1. use `CLAUDE_SINGLE_FILE_BUNDLE.md` alone
2. or use `CLAUDE_MASTER_PROMPT.md` plus the other reference files

## Notes
- This package describes a reverse-engineered emulator of SMB4 roster grades.
- It is not verified access to SMB4 source code.
- It is currently calibrated to the fixed 440-player roster and matched `371/440` exactly (`84.32%`).
