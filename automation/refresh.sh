#!/bin/bash
# Headless daily refresh: re-discover projects, let Claude fill in prose for any
# new items, then commit & push if anything changed (GitHub Pages redeploys on push).
#
# Install the schedule with:
#   launchctl load ~/Library/LaunchAgents/com.shuhei.portfolio.refresh.plist
# Dry-run first:  bash automation/refresh.sh
#
# Fail-safe: if discovery or the prose step fails, we exit WITHOUT committing,
# so a bad run can never push empty/broken data.

set -euo pipefail

# Resolve the portfolio dir (parent of this script's dir), regardless of cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
cd "$DIR"

LOG="$SCRIPT_DIR/refresh.log"
exec >>"$LOG" 2>&1
echo "===== $(date '+%Y-%m-%d %H:%M:%S') refresh start ====="

# launchd runs with a minimal PATH; add the usual locations for node/gh/claude/git.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin:$PATH"

# 1. Deterministic discovery (writes data/projects.raw.json). Aborts on gh auth failure.
node scripts/discover.mjs

# 2. Prose + merge step, headless Claude (no API key — uses your Claude Code auth).
#    Mirrors .claude/commands/refresh-portfolio.md.
claude -p "Refresh the portfolio data. Read data/projects.raw.json, data/overrides.json, and the existing data/projects.json. For each raw item by id: keep existing approved description/benefit if present, otherwise write a one-sentence factual description and a one-sentence benefit (understated, professional, AU spelling, summarise any Japanese README into English) from readmeExcerpt. Apply overrides.json last (it always wins). Drop readmeExcerpt and topics. Sort by featured then order then updatedAt. Set generatedAt to today. Write the result to data/projects.json (2-space indent). Do not include any private item. Only edit data/projects.json." \
  --allowedTools "Read Write Edit" \
  --permission-mode acceptEdits

# 3. Commit & push only if projects.json actually changed.
if ! git diff --quiet -- data/projects.json 2>/dev/null; then
  git add data/projects.json data/projects.raw.json data/overrides.json
  git commit -m "chore: auto-refresh portfolio ($(date '+%Y-%m-%d'))"
  git push
  echo "pushed updated projects.json"
else
  echo "no changes"
fi

echo "===== refresh done ====="
