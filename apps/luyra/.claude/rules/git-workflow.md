# Git Workflow Rules

These rules apply to every Git operation in this repository.

## Core Principles

1. Preserve all existing user work.
2. Keep every change focused, reviewable, and reversible.
3. Never perform destructive or remote Git operations without explicit permission.
4. Never add Claude, Claude Code, Anthropic, or another AI tool as a repository contributor.

## Before Making Changes

1. Run `git status`.
2. Identify the current branch.
3. Review existing staged and unstaged changes.
4. Never overwrite, remove, revert, or modify unrelated user changes.
5. If unrelated changes exist, leave them untouched and work around them.
6. Never work or commit directly on `main` or `master`.
7. Use a focused branch name:

    - `feat/<feature-name>`
    - `fix/<bug-name>`
    - `refactor/<scope>`
    - `docs/<topic>`
    - `test/<scope>`
    - `chore/<task-name>`

8. Do not create or switch branches if doing so could affect existing uncommitted work. Explain the situation first.

## While Making Changes

1. Keep changes limited to the user’s requested task.
2. Do not modify unrelated files.
3. Follow the repository’s existing architecture, conventions, and code style.
4. Do not perform unrelated refactoring or dependency upgrades.
5. Do not remove existing features unless explicitly requested.
6. Do not commit generated files, build output, logs, caches, or temporary files.
7. Never commit:

    - `.env` files
    - API keys
    - Access tokens
    - Passwords
    - Private keys
    - Database credentials
    - Personal or sensitive information

8. If a secret is discovered, do not display or commit it. Inform the user without exposing its value.

## Before Committing

1. Run the relevant:

    - Tests
    - Lint checks
    - Type checks
    - Build commands

2. Review changes using:

   ```bash
   git status
   git diff
   git diff --staged