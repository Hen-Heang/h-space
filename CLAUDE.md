# H-Space — Claude Code entrypoint

The shared rules for every agent live in `AGENTS.md` (Codex reads it
directly). Edit rules there, not here, so Claude and Codex never disagree.

@AGENTS.md

## Which subagent to delegate to

Three scoped subagents live in `.claude/agents/`:

| Task touches | Agent | Notes |
| --- | --- | --- |
| `apps/web` only | `dev-frontend` | Next.js/TS/Supabase/AI routes |
| Supabase schema/RLS/migrations | `db-meta-manager` | Live, Orbit-shared database — confirm before applying |
| Reviewing a diff/PR before merge | `mr-reviewer` | Hengo-specific boundary checks, read-only |

For general repo work spanning docs, config, and app code, stay in the main
session rather than forcing it into one scoped agent.

## Claude-specific

- `.claude/rules/` (incl. `vault.md`), `.claude/skills/`, `.claude/agents/` —
  see `.claude/CLAUDE.md`.
- `.claude/settings.json` denies secret reads, destructive git, live-database
  and production-deploy commands; `.claude/hooks/` block commits/pushes on
  `main` and writes that look like real secrets. Don't work around a hook —
  fix the cause or ask.
