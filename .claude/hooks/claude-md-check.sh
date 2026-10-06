#!/usr/bin/env bash
# PreToolUse hook: before `git commit` / `git push`, make Claude review whether
# CLAUDE.md needs updating. Blocks the first attempt for a given change; a retry
# of the same change (after review) is allowed through.
# Usage: claude-md-check.sh commit|push

action="$1"
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git_dir=$(git rev-parse --git-dir 2>/dev/null) || exit 0

if [ "$action" = "push" ]; then
  upstream=$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null)
  if [ -n "$upstream" ]; then
    changed=$(git diff --name-only "$upstream"...HEAD 2>/dev/null)
  else
    changed=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)
  fi
  key="push:$(git rev-parse HEAD 2>/dev/null)"
else
  changed=$(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null)
  key="commit:$( { git diff HEAD; git diff --cached; } 2>/dev/null | git hash-object --stdin)"
fi

# Nothing to review, or CLAUDE.md is already part of the change.
[ -z "$changed" ] && exit 0
printf '%s\n' "$changed" | grep -qx 'CLAUDE.md' && exit 0

marker="$git_dir/claude-md-checked"
if [ -f "$marker" ] && [ "$(cat "$marker")" = "$key" ]; then
  exit 0
fi
printf '%s' "$key" > "$marker"

cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Before this git commit/push: review the changed files against CLAUDE.md. If the change adds, renames, or removes files, or alters structure, section ids, data fields, conventions, or run/verify steps, update CLAUDE.md (and stage it) first. If CLAUDE.md is still accurate, re-run the same git command unchanged and it will be allowed."}}
EOF
exit 0
