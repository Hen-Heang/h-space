# Notes 2.0 — Projects

Status: **step 1 implemented** (Notes Home redesign + projects + Project Workspace).
Source design: "Notes · Home" and "Notes · Project workspace" on the H-Space design canvas,
and section 4 of the H-Space Design Handoff.

## What ships

- **Notes Home** (`/notes`, `components/notes/NotesHome.tsx`): search with an always-visible
  scope ("Searching: All notes" / "In: <project>") over server-side full-text results, Recently
  opened projects (3), All projects with status filters, the full note list (type + pinned
  filters, "No project" filter), and a side column — Quick Capture (→ Inbox, `item_type =
  'note'`), Pinned, Recent (5), and Reference notes. Selection logic: `lib/notes-home.ts`.
- **Projects** (`kori_note_projects`, `lib/note-projects.ts`, `lib/api/note-projects.ts`,
  `hooks/useNoteProjects.ts`): name (required), description, type, status, tags, repository/docs
  link, start/target dates, `last_opened_at`. New/Edit dialog: `ProjectFormDialog.tsx`.
- **Project Workspace** (`/notes/projects/[id]`, `components/notes/ProjectWorkspace.tsx`):
  Overview (purpose, recently updated notes, latest decision, details), Notes (search, type
  filter, pinned first), Decisions (Decision-type notes in the project, newest first — a
  filtered view, not a table).
- **Note editor**: a Project picker. `/notes/new?project=<id>&type=decision` preselects both.
  Slugs `new` and `projects` are reserved (they'd be shadowed by the static routes).

## Data ownership

- Supabase owns projects, same as notes. RLS: `(select auth.uid()) = user_id` on all operations.
- `kori_notes.project_id` is nullable. A composite FK `(project_id, user_id) →
  kori_note_projects(id, user_id)` guarantees a note can only point at a project **owned by the
  same user**, enforced in the database. Deleting a project sets `project_id` to null (notes stay).
- Notes with no project (every pre-existing note) appear under **No project** and in All notes.

## Migration and deploy order

Migration: `supabase/migrations/20261102120000_note_projects.sql` (rollback SQL in its header).
It is **not applied automatically** — the database is shared with Orbit/DailyGoalMap; take a
backup and apply it deliberately.

The app tolerates the migration being absent, so either order is safe:

- `notesApi.list/search` select `project_id`, and on a missing-column error (`42703`/`PGRST204`)
  retry without it and remember that (`lib/api/schema-errors.ts`).
- `notesApi.create` only sends `project_id` when a project was chosen; the edit page only sends
  it when it changed.
- `noteProjectsApi` turns a missing table into `ProjectsUnavailableError`; Notes Home then hides
  New project and shows "Projects aren't set up yet", and the editor hides the Project picker.

## Still proposed (labelled in the UI, nothing saved)

- **Mentor Feedback** — needs a note type plus advice/takeaway/action/status fields.
- **Linked Tasks** — needs a note ↔ Planner task link; Planner stays the source of truth.
- Overview's Key points / Open questions / Next actions, templates, list/grid toggle, project
  delete/archive flows beyond the status field.
