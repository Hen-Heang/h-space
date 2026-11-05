-- Fix for 20261105120000_reminder_delivery_tracking.sql: the summary query in
-- kori_reconcile_reminder_deliveries aliased the deliveries table as `d`,
-- which clashes with the function's own loop record `d`, so every run failed
-- with 'column reference "d.reminder_id" is ambiguous'. The aliases are now
-- `x`/`lt`; behaviour is otherwise unchanged.

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
    select distinct on (x.reminder_id) x.reminder_id, x.occurrence_at
    from public.kori_reminder_deliveries x
    join touched t using (reminder_id)
    order by x.reminder_id, x.occurrence_at desc
  ),
  outcome as (
    select
      x.reminder_id,
      bool_or(x.status = 'delivered') as any_delivered,
      bool_or(x.status = 'pending') as any_pending,
      string_agg(
        case x.channel when 'web' then 'Web push' else 'Telegram' end || ': ' || coalesce(x.detail, 'failed'),
        '; ' order by x.channel
      ) filter (where x.status = 'failed') as failed_detail,
      string_agg(
        case x.channel when 'web' then 'Web push' else 'Telegram' end || ': ' || coalesce(x.detail, x.status),
        '; ' order by x.channel
      ) filter (where x.status in ('failed', 'skipped')) as problem_detail
    from public.kori_reminder_deliveries x
    join latest lt on lt.reminder_id = x.reminder_id and lt.occurrence_at = x.occurrence_at
    group by x.reminder_id
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

revoke execute on function public.kori_reconcile_reminder_deliveries() from public, anon, authenticated;
