-- Data-only backfill: gives currently-unclassified categories a sensible
-- deterministic default so a fresh or existing account isn't stuck at
-- "Unclassified" for its most common category names. Guarded by
-- `spending_class is null` on every statement, so a category the user has
-- already classified (including one they deliberately set differently from
-- this default) is never touched. Matches the same name -> class mapping as
-- lib/finance/spending-class.ts's suggestDefaultSpendingClass, applied once
-- here at the data level instead of only client-side at edit time.
--
-- Safe to re-run: once a row is set, it's no longer null, so a second run
-- of this file is a no-op.

update finance_categories
set spending_class = 'essential'
where spending_class is null
  and lower(name) in ('housing', 'food', 'healthcare', 'transportation', 'utilities');

update finance_categories
set spending_class = 'growth'
where spending_class is null
  and lower(name) in ('education', 'investment');

update finance_categories
set spending_class = 'flexible'
where spending_class is null
  and lower(name) in ('entertainment', 'shopping', 'social', 'travel', 'beauty', 'drink');

update finance_categories
set spending_class = 'avoidable'
where spending_class is null
  and lower(name) in ('food delivery', 'tech & gadgets');

update finance_categories
set spending_class = 'commitment'
where spending_class is null
  and lower(name) in ('subscription');
