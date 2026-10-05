#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUN_NODE_TOOL="$ROOT_DIR/scripts/pre-commit/run-node-tool.sh"
FILTER_FILES="$ROOT_DIR/scripts/pre-commit/filter-staged-files.mjs"

if [[ ! -x "$RUN_NODE_TOOL" ]]; then
  echo "Missing helper: $RUN_NODE_TOOL" >&2
  exit 1
fi

if [[ ! -f "$FILTER_FILES" ]]; then
  echo "Missing helper: $FILTER_FILES" >&2
  exit 1
fi

GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || true)"
if [[ -n "$GIT_DIR" ]] && \
  { [[ -f "$GIT_DIR/MERGE_HEAD" ]] || \
    [[ -f "$GIT_DIR/CHERRY_PICK_HEAD" ]] || \
    [[ -f "$GIT_DIR/REVERT_HEAD" ]] || \
    [[ -f "$GIT_DIR/REBASE_HEAD" ]] || \
    [[ -d "$GIT_DIR/rebase-merge" ]] || \
    [[ -d "$GIT_DIR/rebase-apply" ]]; }; then
  # Sequencer commits stage the operation result, not just the user's local edits.
  exit 0
fi

# Security: avoid option-injection from malicious file names (e.g. "--all", "--force").
# Robustness: NUL-delimited file list handles spaces/newlines safely.
# Compatibility: use read loops instead of `mapfile` so this runs on macOS Bash 3.x.
files=()
while IFS= read -r -d '' file; do
  files+=("$file")
done < <(git diff --cached --name-only --diff-filter=ACMR -z)

if [ "${#files[@]}" -eq 0 ]; then
  exit 0
fi

restage_files=()
for file in "${files[@]}"; do
  # check-ignore rejects global literal magic; ./ keeps leading-colon names literal too.
  if ! git --no-literal-pathspecs check-ignore --no-index -q -- "./$file"; then
    restage_files+=("$file")
  fi
done

# Every list below goes through xargs rather than expanding inline. A sweeping
# change - a rename across the tree, say - stages thousands of paths, and the
# expanded argument list then exceeds the OS limit: the hook dies with
# "Argument list too long" and the commit is refused for a reason that has
# nothing to do with the code. xargs splits each list into chunks that fit, and
# -0 keeps paths with spaces intact.
format_files=()
while IFS= read -r -d '' file; do
  format_files+=("$file")
done < <(printf '%s\0' "${restage_files[@]}" | xargs -0 node "$FILTER_FILES" format --)

if [ "${#format_files[@]}" -gt 0 ]; then
  printf '%s\0' "${format_files[@]}" |
    xargs -0 "$RUN_NODE_TOOL" oxfmt --write --no-error-on-unmatched-pattern
fi

if [ "${#restage_files[@]}" -gt 0 ]; then
  printf '%s\0' "${restage_files[@]}" | xargs -0 git add --
fi
