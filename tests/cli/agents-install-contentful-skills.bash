#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
command_path="$repo_root/cli/libexec/agents/install-contentful-skills"
temporary_root="$(mktemp -d)"
trap 'rm -rf "$temporary_root"' EXIT

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

make_fake_pnpm() {
  local bin_dir=$1
  mkdir -p "$bin_dir"
  cat > "$bin_dir/pnpm" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$AGENTS_KIT_HOME/pnpm-calls"
if [ "${1:-}" = exec ]; then
  mkdir -p "$AGENTS_KIT_HOME/skills/code" "$AGENTS_KIT_HOME/skills/contentful-git-commit"
  mkdir -p "$HOME/.agents/skills" "$HOME/.claude/skills"
  for skill in code contentful-git-commit; do
    printf '%s\n' '---' > "$AGENTS_KIT_HOME/skills/$skill/SKILL.md"
    ln -sfn "$AGENTS_KIT_HOME/skills/$skill" "$HOME/.agents/skills/$skill"
    ln -sfn "$AGENTS_KIT_HOME/skills/$skill" "$HOME/.claude/skills/$skill"
  done
fi
SCRIPT
  chmod +x "$bin_dir/pnpm"
}

home="$temporary_root/home"
agents_kit_home="$home/.agents-kit"
bin_dir="$temporary_root/bin"
mkdir -p "$agents_kit_home" "$home/.agents/skills" "$home/.claude/skills"
make_fake_pnpm "$bin_dir"

cat > "$agents_kit_home/package.json" <<'JSON'
{
  "name": "existing-user-config",
  "private": true,
  "custom": { "preserve": true },
  "devDependencies": {
    "@contentful/agents-kit": "0.1.23",
    "@contentful/agents-skill-git-commit": "1.0.17",
    "unrelated-package": "2.0.0"
  },
  "agentsKit": {
    "version": 1,
    "skills": {
      "uses": {
        "agents": ["codex"],
        "sources": [
          { "type": "package", "name": "@contentful/agents-skill-git-commit" },
          { "type": "directory", "path": "./keep-me" }
        ]
      }
    }
  }
}
JSON

PATH="$bin_dir:$PATH" HOME="$home" AGENTS_KIT_HOME="$agents_kit_home" "$command_path" >/dev/null
PATH="$bin_dir:$PATH" HOME="$home" AGENTS_KIT_HOME="$agents_kit_home" "$command_path" >/dev/null

jq -e '.custom.preserve == true' "$agents_kit_home/package.json" >/dev/null || fail 'unrelated config was removed'
jq -e '.devDependencies["unrelated-package"] == "2.0.0"' "$agents_kit_home/package.json" >/dev/null || fail 'unrelated dependency was removed'
jq -e '.devDependencies["@contentful/agents-kit"] == "latest"' "$agents_kit_home/package.json" >/dev/null || fail 'Agents Kit does not track latest'
jq -e '.devDependencies["@contentful/agents-skill-developer-bundle"] == "latest"' "$agents_kit_home/package.json" >/dev/null || fail 'developer bundle does not track latest'
jq -e '.devDependencies["@contentful/agents-skill-git-commit"] == null' "$agents_kit_home/package.json" >/dev/null || fail 'legacy dependency remains'
jq -e '.agentsKit.skills.uses.agents == ["claude-code", "codex"]' "$agents_kit_home/package.json" >/dev/null || fail 'agent targets are wrong'
jq -e '[.agentsKit.skills.uses.sources[] | select(.name == "@contentful/agents-skill-developer-bundle")] | length == 1' "$agents_kit_home/package.json" >/dev/null || fail 'developer bundle source is not idempotent'
jq -e '[.agentsKit.skills.uses.sources[] | select(.url == "https://github.com/ninetailed-inc/skills")] | length == 1' "$agents_kit_home/package.json" >/dev/null || fail 'Ninetailed source is not idempotent'
jq -e '.agentsKit.skills.uses.sources | any(.path == "./keep-me")' "$agents_kit_home/package.json" >/dev/null || fail 'unrelated source was removed'
[ "$(realpath "$home/.agents/skills/code")" = "$(realpath "$agents_kit_home/skills/code")" ] || fail 'codex projection is wrong'
[ "$(realpath "$home/.claude/skills/code")" = "$(realpath "$agents_kit_home/skills/code")" ] || fail 'Claude projection is wrong'

fresh_home="$temporary_root/fresh-home"
fresh_agents_kit_home="$fresh_home/.agents-kit"
mkdir -p "$fresh_home/.agents/skills" "$fresh_home/.claude/skills"
PATH="$bin_dir:$PATH" HOME="$fresh_home" AGENTS_KIT_HOME="$fresh_agents_kit_home" "$command_path" >/dev/null
jq -e '.agentsKit.skills.uses.install == {"mode":"symlink","sharedRoot":"./skills"}' "$fresh_agents_kit_home/package.json" >/dev/null || fail 'fresh config was not initialized'

collision_home="$temporary_root/collision-home"
mkdir -p "$collision_home/.agents/skills" "$collision_home/personal/code"
ln -s "$collision_home/personal/code" "$collision_home/.agents/skills/code"
if PATH="$bin_dir:$PATH" HOME="$collision_home" AGENTS_KIT_HOME="$collision_home/.agents-kit" "$command_path" >"$temporary_root/collision.out" 2>&1; then
  fail 'command accepted a skill managed outside Agents Kit'
fi
grep -q "gob run make" "$temporary_root/collision.out" || fail 'collision error lacks recovery instructions'

printf 'PASS: Contentful skill installer\n'
