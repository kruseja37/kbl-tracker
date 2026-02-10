#!/usr/bin/env python3
"""
Initialize the exhaustive audit progress tracker.
Run this once to create spec-docs/EXHAUSTIVE_AUDIT_PROGRESS.md from the template.

Usage:
    python3 .claude/skills/exhaustive-spec-auditor/scripts/example.py
"""
import shutil
import os
from datetime import date

def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template = os.path.join(base, "references", "PROGRESS_TEMPLATE.md")

    # Find spec-docs relative to the project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(base)))
    target = os.path.join(project_root, "spec-docs", "EXHAUSTIVE_AUDIT_PROGRESS.md")

    if os.path.exists(target):
        print(f"Progress tracker already exists at {target}")
        print("Delete it first if you want to reset.")
        return

    if not os.path.exists(template):
        print(f"Template not found at {template}")
        return

    # Copy template and fill in date
    with open(template, 'r') as f:
        content = f.read()

    today = date.today().strftime("%Y-%m-%d")
    content = content.replace("[DATE]", today)

    with open(target, 'w') as f:
        f.write(content)

    print(f"Created progress tracker at {target}")
    print(f"Date set to {today}")
    print("Ready for exhaustive spec audit.")

if __name__ == "__main__":
    main()
