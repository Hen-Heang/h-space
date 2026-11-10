# Project Knowledge MCP — H-Space

Status: draft PR; not deployed. This is a bounded extension to existing Notes Home (/notes) and
Project Workspace (/notes/projects/[id]). It does not create a new note editor or duplicate Notion.

## Data ownership

- Today: Supabase owns kori_notes and kori_note_projects; user-level Row Level Security (RLS).
- Later: migrate Notes to h-space-api/hub-api under the existing second-brain plan, not in this PR.
- Next.js /mcp remains the ONLY MCP endpoint, reusing current authentication, rate limiting, and audit.
- This change neither reads nor writes Notion. The linked Notion pages are reference material only.

## MCP tools

Read: list_knowledge_projects, list_project_notes, get_project_note.
Write: create_knowledge_project, create_project_note, update_project_note, only when MCP_WRITE_ENABLED=true.
No note deletion, cross-project transfer, bulk edits, or AI-generated changes without a direct user request.

## Which projects AI can reach

Each project has an **AI access** level, set on its Project page in Notes:

| Level       | Columns (`kori_note_projects`)            | AI can                         |
| ----------- | ----------------------------------------- | ------------------------------ |
| Off         | `ai_access = false` (default)             | nothing — project is invisible |
| Read only   | `ai_access = true`, `ai_can_edit = false` | list and read notes            |
| Read & edit | `ai_access = true`, `ai_can_edit = true`  | also create and edit notes     |

Migrations: `20261109150000_note_projects_ai_access.sql` (`ai_access`) and
`20261109170000_note_projects_ai_edit_level.sql` (`ai_can_edit`; projects that already had access
were backfilled to Read & edit). A UUID in the env allowlist below grants **Read only**.

`create_knowledge_project` creates a new, empty project at Read & edit. It refuses a name the user
already has (ignoring case and spacing): for a project the AI can see it returns that project's id
to reuse; for a project with AI access Off it says only that the name is taken and asks the user to
open it in the app (no id), so the AI doesn't create a look-alike duplicate. No MCP tool can change
an existing project's level. Because an MCP token is a full Supabase user token (its claims carry the
connector's `client_id`) that could call the data API directly, the database enforces this too,
for any token with a `client_id`:

- `kori_note_projects`: changes to `ai_access` / `ai_can_edit` are rejected;
- `kori_notes`: inserts and updates are allowed only in Read & edit projects; moving a note between
  projects and deleting notes are rejected.

First-party H-Space sessions have no `client_id` and are unaffected. Read access is enforced by
the MCP server (not the database). Until `ai_can_edit` exists, the app disables Read only and the
server treats `ai_access = true` as Read & edit.

### Env allowlist

Set the server-side environment variable MCP_KNOWLEDGE_PROJECT_IDS to a comma-separated
list of UUIDs for the projects whose notes are intentionally accessible to an AI client.
Default is DENY ALL. All note reads and writes must pass this allowlist, a user ID check and RLS.
Example using a FAKE UUID:

    MCP_KNOWLEDGE_PROJECT_IDS=11111111-1111-4111-8111-111111111111

This is an operator-controlled safety gate; the per-project switch above is the everyday way.
Never put employer-confidential code, customer records, credentials, private network addresses,
unapproved internal documents or business details in an AI-approved personal project.

## Known blocker: existing MCP OAuth

Sign-in moved to h-space-api; the deployed MCP endpoint still expects Supabase OAuth credentials.
The existing docs/SECOND_BRAIN_ARCHITECTURE.md section 4.1 reports that new users cannot finish
the MCP consent flow. These new tools are NOT reachable end-to-end until Spring security-api
is an appropriate authorization server and the protected MCP resource validates its tokens.
Do not use the temporary Supabase token bridge or disable the bearer-token gate as a workaround.

## Validation before merge

1. Run the repository's unit test, lint and build scripts, including MCP auth and transport tests.
2. Confirm allowlist empty => no project data exposed; excluded project => not found.
3. Test two different authenticated users, read and write isolation, rate limits, and audit records.
4. Confirm MCP_WRITE_ENABLED=false removes write tools from tools/list.
5. Verify OAuth login, issuer/audience, scopes, and token revocation in a non-production environment.
6. Compare the SDK's supported MCP protocol with the production client; upgrade separately if needed.

## Recommended H-Space knowledge projects

Create these inside Notes Home: Backend Engineering; OLV Learning (sanitized); SQL & PostgreSQL;
AI-Assisted Development; Career Evidence. Only add safe, generic learning notes to the MCP allowlist.

Suggested note template:

    # Concept / task title
    ## Learning goal
    ## What I understand
    ## Fictional example and code
    ## Tests and outcome
    ## Unknowns / questions
    ## Next action

Do not change h-space-api in this PR: Spring notes storage and Spring OAuth should each have
their own independent migration and security review.
