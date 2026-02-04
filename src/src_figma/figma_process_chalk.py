#!/usr/bin/env python3
import re

# Read the file
with open('/tmp/foundry-workspace-e6b15a9d-038d-4d2b-99eb-c9b4f33af147/src/app/pages/FranchiseSetup.tsx', 'r') as f:
    content = f.read()

# Define replacements for chalkboard branding (excluding already converted sections)
replacements = [
    # Backgrounds
    (r'bg-black(?!\])', 'bg-[#4A6A42]'),
    (r'bg-\[#1A1A1A\]', 'bg-[#3A5A32]'),
    
    # Borders
    (r'border-white(?!\])', 'border-[#E8E8D8]'),
    (r'border-\[#0066FF\]', 'border-[#FFFFAA]'),
    (r'hover:border-\[#5599FF\]', 'hover:border-[#FFFFAA]'),
    
    # Background colors (selected/active states)
    (r'bg-\[#0066FF\]', 'bg-[#FFFFAA]'),
    
    # Text colors (be careful with text-white as some are already converted)
    (r'text-\[#0066FF\]', 'text-[#FFFFAA]'),
    (r'text-\[#5599FF\]', 'text-[#FFFFAA]'),
    (r'hover:text-\[#0066FF\]', 'hover:text-[#FFFFAA]'),
]

# Apply replacements
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Now handle text-white specifically in Step 2, 3, 4, 5, 6 (but not in the already converted Step 1)
# We need to be careful and only replace in steps that haven't been converted yet

# Find all instances of Step functions and apply text-white replacement only there
def replace_text_white_in_steps(match):
    step_content = match.group(0)
    # Replace text-white with text-[#E8E8D8] in step functions
    step_content = re.sub(r'text-white(?![\/\]])', 'text-[#E8E8D8]', step_content)
    return step_content

# Process Step 2
content = re.sub(
    r'(// Step 2:.*?function Step2SeasonSettings.*?^\})',
    replace_text_white_in_steps,
    content,
    flags=re.DOTALL | re.MULTILINE
)

# Process Step 3
content = re.sub(
    r'(// Step 3:.*?function Step3PlayoffSettings.*?^\})',
    replace_text_white_in_steps,
    content,
    flags=re.DOTALL | re.MULTILINE
)

# Process Step 4  
content = re.sub(
    r'(// Step 4:.*?function Step4TeamControl.*?^\})',
    replace_text_white_in_steps,
    content,
    flags=re.DOTALL | re.MULTILINE
)

# Process Step 5
content = re.sub(
    r'(// Step 5:.*?function Step5RosterMode.*?^\})',
    replace_text_white_in_steps,
    content,
    flags=re.DOTALL | re.MULTILINE
)

# Process Step 6
content = re.sub(
    r'(// Step 6:.*?function Step6Confirm.*?export function)',
    replace_text_white_in_steps,
    content,
    flags=re.DOTALL | re.MULTILINE
)

# Write back
with open('/tmp/foundry-workspace-e6b15a9d-038d-4d2b-99eb-c9b4f33af147/src/app/pages/FranchiseSetup.tsx', 'w') as f:
    f.write(content)

print("Chalkboard branding applied successfully!")
