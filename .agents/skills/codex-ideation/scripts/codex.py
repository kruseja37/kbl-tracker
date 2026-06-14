#!/usr/bin/env python3
"""
codex.py — let Claude use Codex CLI as a back-and-forth peer-review partner.

This is NOT a one-shot formatter. The intended flow is conversational:
Claude opens with context + goal + draft + its own reasoning, Codex pushes
back, Claude responds, and they iterate until the disagreement is sharp or the
direction is strong enough that both sides would defend it. The human (JK)
arbitrates intent, taste, and what actually ships.

Session model:
- START a peer session with a brief.
- FOLLOW UP on the same session (Codex owns `resume --last` itself).
- A flag file (Temp/.codex_active) marks that a session is live; Codex tracks
  --last internally, so we just need to know whether to start vs resume.

Usage:
    python3 scripts/codex.py "your opening brief"
    python3 scripts/codex.py --reply "your conversational follow-up"
    python3 scripts/codex.py --read path/to/brief.md        # long brief from file
    python3 scripts/codex.py --reply --read path/to/reply.md
    python3 scripts/codex.py --reset                        # clear the active flag

Binary discovery order: $CODEX_BIN, then PATH, then common install locations,
then the OpenAI ChatGPT VS Code extension. Fails loudly if none found —
never hangs.
"""

import os
import sys
import glob
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FLAG = REPO_ROOT / "Temp" / ".codex_active"


def find_codex():
    # 1. Explicit override.
    env_bin = os.environ.get("CODEX_BIN")
    if env_bin and Path(env_bin).exists():
        return env_bin
    # 2. PATH.
    on_path = shutil.which("codex")
    if on_path:
        return on_path
    # 3. Common install locations (macOS-oriented).
    candidates = [
        Path.home() / ".codex" / "bin" / "codex",
        Path("/usr/local/bin/codex"),
        Path("/opt/homebrew/bin/codex"),
        Path.home() / ".npm-global" / "bin" / "codex",
        Path.home() / ".local" / "bin" / "codex",
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    # 4. OpenAI ChatGPT / Codex VS Code extension bundle.
    ext_globs = [
        str(Path.home() / ".vscode" / "extensions" / "openai.*" / "**" / "codex"),
        str(Path.home() / ".vscode" / "extensions" / "*codex*" / "**" / "codex"),
        str(Path.home() / ".vscode-server" / "extensions" / "openai.*" / "**" / "codex"),
    ]
    for pattern in ext_globs:
        hits = glob.glob(pattern, recursive=True)
        for h in hits:
            if os.access(h, os.X_OK):
                return h
    return None


def read_brief(args):
    """Return the brief text: from --read FILE, else the first positional arg."""
    if "--read" in args:
        i = args.index("--read")
        try:
            path = args[i + 1]
        except IndexError:
            sys.exit("ERROR: --read requires a file path.")
        return Path(path).read_text(encoding="utf-8")
    positionals = [a for a in args if not a.startswith("--")]
    if not positionals:
        sys.exit("ERROR: provide a brief string or --read FILE.")
    return positionals[0]


def main():
    args = sys.argv[1:]

    if "--reset" in args:
        FLAG.unlink(missing_ok=True)
        print("[codex-ideation] active-session flag cleared.")
        return 0

    # Validate inputs BEFORE looking for the binary, so a missing brief gives a
    # clear "provide a brief" error rather than a confusing "codex not found".
    is_reply = "--reply" in args
    brief = read_brief([a for a in args if a != "--reply"])

    codex = find_codex()
    if not codex:
        sys.exit(
            "ERROR: codex CLI not found. Set CODEX_BIN to its full path, add it "
            "to PATH, or install the Codex CLI. (Searched PATH, common install "
            "dirs, and the VS Code extension.)"
        )

    FLAG.parent.mkdir(parents=True, exist_ok=True)

    if is_reply and FLAG.exists():
        # Pin resume to read-only too: `resume` does NOT inherit the opening
        # call's sandbox and would otherwise fall back to the user's
        # config.toml default (often workspace-write). codex-ideation is a
        # read-only thinking aid — it must never gain write access mid-loop.
        cmd = [codex, "exec", "-s", "read-only", "resume", "--last", brief]
        mode = "resume"
    else:
        # Either a fresh start, or a reply with no live session -> start anew.
        cmd = [codex, "exec", "--skip-git-repo-check", "-s", "read-only", brief]
        mode = "start"

    try:
        # input="" closes stdin so Codex never hangs waiting for more.
        result = subprocess.run(
            cmd,
            input="",
            text=True,
            capture_output=True,
            cwd=str(REPO_ROOT),
            timeout=600,
        )
    except FileNotFoundError:
        FLAG.unlink(missing_ok=True)
        sys.exit("ERROR: could not execute codex at " + str(codex) + ".")
    except subprocess.TimeoutExpired:
        sys.exit("ERROR: codex timed out after 600s.")

    if mode == "resume" and result.returncode != 0:
        # Resume failed (stale/expired session). Clear the flag and retry fresh
        # rather than erroring out, per spec.
        FLAG.unlink(missing_ok=True)
        cmd = [codex, "exec", "--skip-git-repo-check", "-s", "read-only", brief]
        result = subprocess.run(
            cmd, input="", text=True, capture_output=True,
            cwd=str(REPO_ROOT), timeout=600,
        )

    sys.stdout.write(result.stdout)
    if result.stderr.strip():
        sys.stderr.write(result.stderr)

    if result.returncode == 0:
        FLAG.touch()  # a session is now live; future --reply will resume it
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
