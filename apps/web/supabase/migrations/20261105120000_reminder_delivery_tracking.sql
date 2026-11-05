-- Reminder delivery tracking.
--
-- Until now a reminder counted as "sent" the moment kori_dispatch_reminders
-- queued it: kori_dispatch_push swallows every error, net.http_post only
-- enqueues the request, and a missing SERVICE_ROLE_KEY vault secret skipped
-- web push without a trace. A reminder could fail on every channel for weeks
-- and the Reminders page would still show it as sent with no error.
--
-- This migration records one delivery row per reminder occurrence and channel,
-- keeps the pg_net request id, and a second per-minute job reads the response
-- from net._http_response to mark each row delivered or failed. The outcome is
-- summarised into kori_reminders.last_error (the column the Reminders page
-- already shows), so the page needs no schema change to surface it.
--
-- kori_dispatch_push itself is untouched: the holiday, weather and streak
-- alerts still call it. Only the universal-reminder loop moves to the new
-- kori_send_reminder.
--
-- Error text stored here is fixed copy or the Telegram API's own description
-- ("Bad Request: chat not found"), never sqlerrm from a request whose URL or
-- headers carry a secret.

create table if not exists public.kori_reminder_deliveries (
  id bigint generated always as identity primary key,
  reminder_id uuid not null references public.kori_reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_at timestamptz not null,
  channel text not null check (channel in ('web', 'telegram')),
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed', 'skipped')),
  request_id bigint,
  detail text check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint kori_reminder_deliveries_once unique (reminder_id, occurrence_at, channel)
);

create index if not exists kori_reminder_deliveries_pending_idx
  on public.kori_reminder_deliveries (created_at) where status = 'pending';
create index if not exists kori_reminder_deliveries_user_idx
  on public.kori_reminder_deliveries (user_id, created_at desc);

-- Owners may read their own delivery history; only the security-definer
-- functions below write to it.
alter table public.kori_reminder_deliveries enable row level security;
revoke all on table public.kori_reminder_deliveries from anon;
revoke all on table public.kori_reminder_deliveries from authenticated;
grant select on table public.kori_reminder_deliveries to authenticated;

drop policy if exists "own reminder deliveries" on public.kori_reminder_deliveries;
create policy "own reminder deliveries" on public.kori_reminder_deliveries
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Sends one reminder occurrence on its channels and records a delivery row per
-- channel. A failure on one channel never blocks the other.
create or replace function public.kori_send_reminder(
  p_reminder_id uuid,
  p_occurrence_at timestamptz,
  p_user_id uuid,
  p_title text,
  p_body text,
  p_url text,
  p_channels text[]
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_chat text;
  v_service_key text;
  v_request bigint;
begin
  if 'telegram' = any(p_channels) then
    begin
      select coalesce(
        (select ktl.chat_id from public.kori_telegram_links ktl where ktl.user_id = p_user_id),
        (select up.telegram_chat_id from public.user_profiles up where up.id = p_user_id)
      ) into v_chat;

      if v_chat is null then
        insert into public.kori_reminder_deliveries
          (reminder_id, user_id, occurrence_at, channel, status, detail, resolved_at)
        values (p_reminder_id, p_user_id, p_occurrence_at, 'telegram', 'skipped', 'Telegram is not linked', now())
        on conflict on constraint kori_reminder_deliveries_once do nothing;
      else
        v_request := public.kori_tg_send(
          v_chat,
          '<b>' || public.tg_esc(p_title) || '</b>' || chr(10) || public.tg_esc(p_body),
          p_url,
          'Open H-Space'
        );
        insert into public.kori_reminder_deliveries
          (reminder_id, user_id, occurrence_at, channel, status, request_id)
        values (p_reminder_id, p_user_id, p_occurrence_at, 'telegram', 'pending', v_request)
        on conflict on constraint kori_reminder_deliveries_once do nothing;
      end if;
    exception when others then
      insert into public.kori_reminder_deliveries
        (reminder_id, user_id, occurrence_at, channel, status, detail, resolved_at)
      values (p_reminder_id, p_user_id, p_occurrence_at, 'telegram', 'failed',
              'Telegram message could not be queued (' || sqlstate || ')', now())
      on conflict on constraint kori_reminder_deliveries_once do nothing;
    end;
  end if;

  if 'web' = any(p_channels) then
    begin
      select decrypted_secret into v_service_key
      from vault.decrypted_secrets where name = 'SERVICE_ROLE_KEY';

      if v_service_key is null then
        insert into public.kori_reminder_deliveries
          (reminder_id, user_id, occurrence_at, channel, status, detail, resolved_at)
        values (p_reminder_id, p_user_id, p_occurrence_at, 'web', 'failed',
                'Web push is not configured on the server', now())
        on conflict on constraint kori_reminder_deliveries_once do nothing;
      else
        v_request := net.http_post(
          url := 'https://dnzqgnejwyucenghugrb.supabase.co/functions/v1/kori-send-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key,
            'apikey', v_service_key
          ),
          body := jsonb_build_object('userId', p_user_id, 'title', p_title, 'body', p_body, 'url', p_url),
          timeout_milliseconds := 10000
        );
        insert into public.kori_reminder_deliveries
          (reminder_id, user_id, occurrence_at, channel, status, request_id)
        values (p_reminder_id, p_user_id, p_occurrence_at, 'web', 'pending', v_request)
        on conflict on constraint kori_reminder_deliveries_once do nothing;
      end if;
    exception when others then
      insert into public.kori_reminder_deliveries
        (reminder_id, user_id, occurrence_at, channel, status, detail, resolved_at)
      values (p_reminder_id, p_user_id, p_occurrence_at, 'web', 'failed',
              'Web push could not be queued (' || sqlstate || ')', now())
      on conflict on constraint kori_reminder_deliveries_once do nothing;
    end;
  end if;
end;
$function$;

-- Same loop as 20260726150000_universal_reminders.sql, with the one change:
-- kori_dispatch_push → kori_send_reminder, keyed by the occurrence it fires.
create or replace function public.kori_dispatch_reminders() returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_count int := 0;
  v_owned boolean;
  v_next timestamptz;
begin
  for r in
    select * from public.kori_reminders
    where status = 'active' and next_run_at is not null and next_run_at <= now()
    order by next_run_at
    limit 200
    for update skip locked
  loop
    v_owned := case r.entity_type
      when 'task' then exists (select 1 from public.tasks t where t.id = r.entity_id and t.user_id = r.user_id)
      when 'goal' then exists (select 1 from public.goals g where g.id = r.entity_id and g.user_id = r.user_id)
      when 'habit' then exists (select 1 from public.kori_habits h where h.id = r.entity_id and h.user_id = r.user_id)
      when 'note' then exists (select 1 from public.kori_notes n where n.id = r.entity_id and n.user_id = r.user_id)
      when 'inbox_item' then exists (select 1 from public.kori_inbox_items i where i.id = r.entity_id and i.user_id = r.user_id)
      when 'manual_activity' then exists (select 1 from public.kori_manual_activities m where m.id = r.entity_id and m.user_id = r.user_id)
      when 'journal_prompt' then true
      else false
    end;

    if not v_owned then
      update public.kori_reminders
      set status = 'cancelled', last_error = 'Linked item no longer exists', updated_at = now()
      where id = r.id;
      continue;
    end if;

    begin
      perform public.kori_send_reminder(
        r.id, r.next_run_at, r.user_id, r.title, coalesce(r.body, ''),
        coalesce(r.deep_link, 'https://hengo.henheang.site'), r.channels
      );
    exception when others then
      update public.kori_reminders set last_error = left(sqlerrm, 500), updated_at = now() where id = r.id;
    end;

    if r.recurrence is null then
      update public.kori_reminders
      set status = 'completed', last_sent_at = now(), next_run_at = null, snoozed_until = null,
          dedupe_key = r.id::text || ':' || r.next_run_at::text, updated_at = now()
      where id = r.id;
    else
      v_next := public.kori_next_reminder_run(r.recurrence, r.timezone, r.next_run_at);
      update public.kori_reminders
      set last_sent_at = now(),
          snoozed_until = null,
          dedupe_key = r.id::text || ':' || r.next_run_at::text,
          next_run_at = v_next,
          status = case when v_next is null then 'completed' else status end,
          updated_at = now()
      where id = r.id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

-- Reads pg_net's responses for pending deliveries, marks each one delivered
-- or failed, then writes the latest occurrence's outcome to
-- kori_reminders.last_error. Runs every minute; pg_net keeps responses for
-- six hours, and anything still unanswered after 15 minutes counts as failed.
create or replace function public.kori_reconcile_reminder_deliveries() returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d record;
  v_resp record;
  v_json jsonb;
  v_status text;
  v_detail text;
  v_count int := 0;
  v_started timestamptz := now();
begin
  for d in
    select * from public.kori_reminder_deliveries
    where status = 'pending'
    order by created_at
    limit 500
    for update skip locked
  loop
    v_json := null;
    v_detail := null;

    select status_code, content, timed_out, error_msg
      into v_resp
      from net._http_response
      where id = d.request_id;

    if not found then
      if d.request_id is not null and d.created_at > now() - interval '15 minutes' then
        continue; -- still in flight
      end if;
      v_status := 'failed';
      v_detail := 'No response from the delivery service';
    elsif coalesce(v_resp.timed_out, false) then
      v_status := 'failed';
      v_detail := 'The delivery service timed out';
    elsif v_resp.error_msg is not null then
      v_status := 'failed';
      v_detail := 'Network error reaching the delivery service';
    else
      begin
        v_json := v_resp.content::jsonb;
      exception when others then
        v_json := null;
      end;

      if v_resp.status_code between 200 and 299 then
        -- kori-send-push answers { sent, total, removedStale }; a 200 with
        -- sent = 0 means no browser actually got it.
        -- jsonb_typeof checks keep a malformed body from throwing on the
        -- cast, which would abort (and endlessly repeat) the whole run.
        if d.channel = 'web'
           and jsonb_typeof(v_json -> 'sent') = 'number'
           and (v_json ->> 'sent')::numeric = 0 then
          v_status := 'failed';
          v_detail := case
            when jsonb_typeof(v_json -> 'total') = 'number' and (v_json ->> 'total')::numeric = 0
              then 'No browser is subscribed to push notifications'
            else 'No subscribed browser accepted the push'
          end;
        else
          v_status := 'delivered';
        end if;
      else
        v_status := 'failed';
        v_detail := 'Delivery service returned HTTP ' || v_resp.status_code;
        if d.channel = 'telegram' and jsonb_typeof(v_json) = 'object' and v_json ? 'description' then
          v_detail := v_detail || ': ' || (v_json ->> 'description');
        end if;
      end if;
    end if;

    update public.kori_reminder_deliveries
    set status = v_status, detail = left(v_detail, 500), resolved_at = now()
    where id = d.id;
    v_count := v_count + 1;
  end loop;

  -- Summarise the latest occurrence of every reminder touched this run, once
  -- none of its channels is still pending.
  with touched as (
    select distinct reminder_id
    from public.kori_reminder_deliveries
    where resolved_at >= v_started
  ),
  latest as (
    select distinct on (d.reminder_id) d.reminder_id, d.occurrence_at
    from public.kori_reminder_deliveries d
    join touched t using (reminder_id)
    order by d.reminder_id, d.occurrence_at desc
  ),
  outcome as (
    select
      d.reminder_id,
      bool_or(d.status = 'delivered') as any_delivered,
      bool_or(d.status = 'pending') as any_pending,
      string_agg(
        case d.channel when 'web' then 'Web push' else 'Telegram' end || ': ' || coalesce(d.detail, 'failed'),
        '; ' order by d.channel
      ) filter (where d.status = 'failed') as failed_detail,
      string_agg(
        case d.channel when 'web' then 'Web push' else 'Telegram' end || ': ' || coalesce(d.detail, d.status),
        '; ' order by d.channel
      ) filter (where d.status in ('failed', 'skipped')) as problem_detail
    from public.kori_reminder_deliveries d
    join latest l on l.reminder_id = d.reminder_id and l.occurrence_at = d.occurrence_at
    group by d.reminder_id
  )
  update public.kori_reminders r
  set last_error = case
        when o.any_delivered and o.failed_detail is null then null
        when o.any_delivered then left('Partly delivered — ' || o.failed_detail, 500)
        else left('Not delivered — ' || coalesce(o.problem_detail, 'no channel selected'), 500)
      end,
      updated_at = now()
  from outcome o
  where r.id = o.reminder_id and not o.any_pending;

  -- Keep three months of history.
  delete from public.kori_reminder_deliveries where created_at < now() - interval '90 days';

  return v_count;
end;
$function$;

select cron.schedule(
  'kori-reminder-delivery-check',
  '* * * * *',
  $$select public.kori_reconcile_reminder_deliveries();$$
);

-- Only pg_cron and other security-definer functions call these.
revoke execute on function public.kori_send_reminder(uuid, timestamptz, uuid, text, text, text, text[]) from public, anon, authenticated;
revoke execute on function public.kori_reconcile_reminder_deliveries() from public, anon, authenticated;
revoke execute on function public.kori_dispatch_reminders() from public, anon, authenticated;
