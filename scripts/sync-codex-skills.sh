#!/usr/bin/env bash
# sync-codex-skills.sh
# One-way mirror: canonical Claude/spec-docs skills -> derived Codex skills.
#
# CANONICAL SOURCES (edit these):
#   .claude/skills/
#   spec-docs/skills/
# DERIVED MIRROR (never edit by hand):
#   .agents/skills/
#
# Handles writes, edits, AND deletes: a skill removed from a source folder
# is removed from the mirror. The mirror is rebuilt to exactly match the
# union of the two sources on every run (idempotent).
#
# Runs automatically via a Claude Code PostToolUse hook when .claude/skills
# changes inside a Claude Code session. Because that hook does NOT fire when
# Codex or a human edits a skill, ALSO run this manually after any skill
# change made outside Claude Code:
#     bash scripts/sync-codex-skills.sh
#
# JK ruling 2026-06-14: two canonical sources, one derived mirror, one
# directional rule (never edit .agents/skills/). Copy-based, not symlink-based,
# so the mirror survives fresh clones and Codex Cloud checkouts.

set -euo pipefail

# Resolve repo root from this script's location (scripts/ is at repo root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

SOURCES=(".claude/skills" "spec-docs/skills")
MIRROR=".agents/skills"

# Rebuild the mirror from scratch so deletes propagate cleanly.
rm -rf "$MIRROR"
mkdir -p "$MIRROR"

copied=0
skipped_conflicts=()

for src in "${SOURCES[@]}"; do
  [ -d "$src" ] || continue
  # Iterate immediate children (skill dirs and loose .md skill files).
  for entry in "$src"/*; do
    [ -e "$entry" ] || continue
    base="$(basename "$entry")"
    # Skip noise.
    case "$base" in
      .DS_Store) continue ;;
    esac
    dest="$MIRROR/$base"
    if [ -e "$dest" ]; then
      # Name collision across the two sources — do NOT silently overwrite.
      skipped_conflicts+=("$base (already mirrored from an earlier source; '$src' copy skipped)")
      continue
    fi
    cp -R "$entry" "$dest"
    copied=$((copied + 1))
  done
done

echo "[sync-codex-skills] mirrored $copied entries into $MIRROR"
if [ "${#skipped_conflicts[@]}" -gt 0 ]; then
  echo "[sync-codex-skills] WARNING: ${#skipped_conflicts[@]} name collision(s) skipped:"
  for c in "${skipped_conflicts[@]}"; do
    echo "  - $c"
  done
  echo "[sync-codex-skills] resolve by renaming the duplicate in one source."
fi
