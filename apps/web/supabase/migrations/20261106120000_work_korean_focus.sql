-- "Korean for my work" focus: optional teaching metadata on Phrasebook cards
-- plus a work-message item type for Today's Mission. Additive only — every
-- new column is nullable, nothing is backfilled, no existing row changes.
-- The app degrades without this migration (lib/api/phrasebook.ts retries an
-- insert without these columns; lib/api/missions.ts rebuilds a plan without
-- the work_message item), so it can be applied before or after the deploy.
--
-- Rollback: drop the three columns and restore the previous item_type check
-- (see the end of this file). Rows that used them only lose the optional
-- metadata — the cards themselves keep working.

-- ── Phrasebook card teaching metadata ───────────────────────────────────────

-- Structured comprehension notes for a work message: main point, required
-- action, conditions, expected result, unknowns, why it's useful. Same shape
-- as lib/korean-phrasebook/work.ts's workContextSchema (validated there).
alter table public.kori_phrase_cards
  add column if not exists work_context jsonb
    check (work_context is null or jsonb_typeof(work_context) = 'object');

-- Where the card's Korean came from, so a generated practice sentence is
-- never shown as a quotation: quoted (exact text the owner pasted and chose to
-- keep), paraphrased (the owner's edit of it), generated (AI-written), or
-- curated (the reviewed starter packs in lib/korean-phrasebook/seed.ts).
alter table public.kori_phrase_cards
  add column if not exists provenance text
    check (provenance is null or provenance in ('quoted', 'paraphrased', 'generated', 'curated'));

-- Optional private label the owner typed ("team chat", "review comment").
-- Plain text only: the app never fetches it, so it can't become an SSRF path.
-- Covered by the existing "own phrase cards" RLS policy like every other column.
alter table public.kori_phrase_cards
  add column if not exists source_label text
    check (source_label is null or char_length(source_label) <= 100);

-- ── Today's Mission: work_message item type ─────────────────────────────────

alter table public.kori_daily_mission_items
  drop constraint if exists kori_daily_mission_items_item_type_check;
alter table public.kori_daily_mission_items
  add constraint kori_daily_mission_items_item_type_check
  check (item_type in ('vocab_review', 'correction_review', 'daily_phrase', 'scenario', 'listening', 'interview', 'phrase_review', 'work_message'));

-- ── Rollback (run manually only if needed) ──────────────────────────────────
-- delete from public.kori_daily_mission_items where item_type = 'work_message';
-- alter table public.kori_daily_mission_items drop constraint if exists kori_daily_mission_items_item_type_check;
-- alter table public.kori_daily_mission_items add constraint kori_daily_mission_items_item_type_check
--   check (item_type in ('vocab_review', 'correction_review', 'daily_phrase', 'scenario', 'listening', 'interview', 'phrase_review'));
-- alter table public.kori_phrase_cards drop column if exists source_label;
-- alter table public.kori_phrase_cards drop column if exists provenance;
-- alter table public.kori_phrase_cards drop column if exists work_context;
