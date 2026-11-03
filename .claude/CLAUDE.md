# hengo — Claude Code workspace

Read the repository root [AGENTS.md](../AGENTS.md) first. It is the vendor-neutral
contract for this project. Then load only the task-relevant context from
`.ax/context/` and inspect the source before editing.

Profile: `nextjs-react` (Experimental)

## Session flow

1. Locate the requested feature and read its direct dependencies.
2. State a small plan when more than one file is involved.
3. Make the smallest compatible change.
4. Run the narrowest useful checks, then broader checks when justified.
5. Report changed files, actual commands and results, failures, and unrun checks.

Do not claim that an unrun check passed. Do not start unrelated agents, tools,
migrations, deployments, or database work merely because they are described here.

## Useful surfaces

- Rules: [base](rules/base-rule.md), [security](rules/security.md), [vault](rules/vault.md), [verification](rules/verification.md), and [UI](rules/ui.md).
- Guardrails: [settings.json](settings.json) denies secret reads, destructive git, live-database and production-deploy commands; [hooks/](hooks/) block commits/pushes on `main` and writes that look like real secrets or put a secret behind `NEXT_PUBLIC_`. Don't work around them — fix the cause or ask.
- Procedures: [develop](skills/develop/SKILL.md), [plan](skills/dev-plan/SKILL.md), [review](skills/code-review/SKILL.md), and [UI review](skills/ui-review/SKILL.md).
- Roles: [planner](agents/planner.md), [developer](agents/developer.md), [frontend](agents/frontend.md), [reviewer](agents/reviewer.md), and [qa](agents/qa.md).
- Project metadata: [config/project.yaml](config/project.yaml).

These files are instructions for a human or an assistant. They do not grant
permissions by themselves; the Harness declaration and explicit user direction
remain authoritative.
