-- Re-seed the 제6회 interview script ("한국에 온 후 새로 생긴 습관/취미") from
-- the full Notion script, plus the new 자기소개 section.
--
-- The Script page fills a section from HABITS_SCRIPT_SEED (lib/interview.ts)
-- only while it is blank, and the account copy wins over that seed. Saved
-- drafts therefore still hold the old, shortened script even after the seed
-- grows. This migration clears just the outline sections so the page refills
-- them from the new seed on its next load and syncs them back.
--
-- ORDER: deploy the code that ships the new seed FIRST. Applied before that
-- deploy, the page would refill the sections from the old short seed.
--
-- 1. Snapshot every affected draft into kori_interview_script_versions
--    (inactive), so the old text, including anything typed by hand, stays
--    restorable from the page's Versions list.
-- 2. Remove the outline keys (Korean + `en-*` English) from the draft and bump
--    updated_at, so the account copy is newer than any browser cache and wins.
--
-- Q&A answers, custom sections and every other key in `sections` are kept.
-- Re-runnable: a second run finds no outline keys and changes nothing.
--
-- Rollback: copy `sections` from the "Before full-script reseed" version back
-- into kori_interview_scripts (or pick it in the page's Versions list).

insert into public.kori_interview_script_versions
  (user_id, topic_id, version_label, source_type, sections, is_active)
select
  script.user_id,
  script.topic_id,
  'Before full-script reseed (2026-11-04)',
  'user',
  script.sections,
  false
from public.kori_interview_scripts as script
where script.topic_id = 'weather'
  and script.sections ?| array[
    'self-intro', 'opening', 'transport', 'weather-check', 'recycling-cooking',
    'exercise', 'friends-travel', 'korean-study', 'closing',
    'en-self-intro', 'en-opening', 'en-transport', 'en-weather-check',
    'en-recycling-cooking', 'en-exercise', 'en-friends-travel',
    'en-korean-study', 'en-closing'
  ];

update public.kori_interview_scripts as script
set sections = script.sections - array[
      'self-intro', 'opening', 'transport', 'weather-check', 'recycling-cooking',
      'exercise', 'friends-travel', 'korean-study', 'closing',
      'en-self-intro', 'en-opening', 'en-transport', 'en-weather-check',
      'en-recycling-cooking', 'en-exercise', 'en-friends-travel',
      'en-korean-study', 'en-closing'
    ],
    updated_at = now()
where script.topic_id = 'weather'
  and script.sections ?| array[
    'self-intro', 'opening', 'transport', 'weather-check', 'recycling-cooking',
    'exercise', 'friends-travel', 'korean-study', 'closing',
    'en-self-intro', 'en-opening', 'en-transport', 'en-weather-check',
    'en-recycling-cooking', 'en-exercise', 'en-friends-travel',
    'en-korean-study', 'en-closing'
  ];
