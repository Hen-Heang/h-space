# Notes 2.0 — Projects

Status: **step 1 implemented** (Notes Home redesign + projects + Project Workspace).
Source design: "Notes · Home" and "Notes · Project workspace" on the H-Space design canvas,
and section 4 of the H-Space Design Handoff.

## What ships

- **Notes Home** (`/notes`, `components/notes/NotesHome.tsx`; compact redesign 2026-11-10): a
  Notes / Projects switch (Notes by default), one search field with a clear icon and a filter
  button (`SearchFilterBar.tsx` — popover from 768px, bottom sheet below), active filters written
  out under search with "Clear filters", and the list directly underneath. Notes view: compact
  rows (title, pin, one metadata line), pinned first, count by the heading. Projects view: New
  project, Recently opened (3) and All projects with a status filter; the "No project" row opens
  the Notes list scoped to it. Filters: project scope (a project or "No project", applied to both
  the list and search), note type, pinned only, project status. Search results are grouped as
  Notes and Projects over server-side full-text matches; the pinned and status filters now
  apply to search results too. Header actions: **New note** (primary) and **Save to inbox**
  (`NotesCaptureButton.tsx`, → Inbox, `item_type = 'note'`). The side column (Pinned, Recent,
  Reference) is gone — the Reference type filter replaces its link. Selection logic:
  `lib/notes-home.ts` (`filterHomeNotes`, `describeActiveFilters`, `buildNoteSearchResults`).
- **Projects** (`kori_note_projects`, `lib/note-projects.ts`, `lib/api/note-projects.ts`,
  `hooks/useNoteProjects.ts`): name (required), description, type, status, tags, repository/docs
  link, start/target dates, `last_opened_at`. New/Edit dialog: `ProjectFormDialog.tsx`.
- **Project Workspace** (`/notes/projects/[id]`, `components/notes/ProjectWorkspace.tsx`):
  tabs Overview · Notes · Decisions. Overview: Start here (pinned notes), notes by section or
  recently updated (never repeating Start here), latest decision, and a collapsed "Proposed"
  block for Mentor Feedback and Linked Tasks. Notes: search + type filter (same bar as Home),
  pinned first. Decisions: Decision-type notes, newest first, with New decision. The header
  shows type, dates and "AI access: <level>" in words; **Project settings** (dialog) groups Edit
  project and the AI access control (`ProjectAiAccess.tsx`, unchanged permission logic).
- **Reader** (`NoteView.tsx`, `NoteActions.tsx`): toolbar with Edit, a Pin/Unpin icon and a
  More menu (Copy link, Pin/Unpin, Delete note → the same confirmation). Below `xl`, Contents
  opens in a bottom sheet (toolbar button, or the floating section pill after scrolling). The
  meta line includes a reading-time estimate (`readingMinutes` in `lib/notes.ts`, Hangul counted
  by character).
- **Code blocks** (`lib/notes-markdown.ts`, `lib/notes-highlight.ts`, 2026-11-10): highlight.js
  core with ~20 registered languages (Java, Kotlin, TS/TSX, JS, SQL, Bash, JSON, YAML, …);
  unknown or missing languages stay plain text (no auto-detection). Each block has a header
  with the language name and a Copy button that is part of the rendered HTML (React re-applies
  the article's innerHTML on re-render, which wiped buttons added after mount); `CodeCopy.tsx`
  is one delegated click listener. highlight.js output is escaped text plus class-only `<span>`s,
  so the untrusted-content rules still hold (tests in `lib/notes-markdown.test.ts`). Colours and
  the reader typography (`.note-prose`: scrolling tables, quote callouts, inline code, task
  lists) are in `app/globals.css`.
- **Note editor**: title and content first; Write / Preview and Cancel / Save note sit in a
  sticky bar. Secondary fields (description, project, type, category, tags, source, icon, URL)
  are under **Note details**, closed by default but kept mounted; its header always names the
  project. A save error in one of those fields opens it. `/notes/new?project=<id>&type=decision`
  preselects both. Slugs `new` and `projects` are reserved (they'd be shadowed by the static
  routes).

## Data ownership

- Supabase owns projects, same as notes. RLS: `(select auth.uid()) = user_id` on all operations.
- `kori_notes.project_id` is nullable. A composite FK `(project_id, user_id) →
kori_note_projects(id, user_id)` guarantees a note can only point at a project **owned by the
  same user**, enforced in the database. Deleting a project sets `project_id` to null (notes stay).
- Notes with no project (every pre-existing note) appear under **No project** and in All notes.

## Migration and deploy order

Migration: `supabase/migrations/20261102120000_note_projects.sql` (rollback SQL in its header).
**Applied to the live `hengo` project on 2026-11-02** (recorded there as `20261102031849_note_projects`).
The database is shared with Orbit/DailyGoalMap; apply future changes deliberately, after a
backup.

The app tolerates the migration being absent, so either order is safe:

- `notesApi.list/search` select `project_id`, and on a missing-column error (`42703`/`PGRST204`)
  retry without it and remember that (`lib/api/schema-errors.ts`).
- `notesApi.create` only sends `project_id` when a project was chosen; the edit page only sends
  it when it changed.
- `noteProjectsApi` turns a missing table into `ProjectsUnavailableError`; Notes Home then hides
  New project and shows "Projects aren't set up yet", and the editor hides the Project picker.

## Still proposed (labelled in the UI at the end of a project's Overview, nothing saved)

- **Mentor Feedback** — needs a note type plus advice/takeaway/action/status fields.
- **Linked Tasks** — needs a note ↔ Planner task link; Planner stays the source of truth.
- Overview's Key points / Open questions / Next actions, templates, list/grid toggle, project
  delete/archive flows beyond the status field.
