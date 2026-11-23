-- In a rollback transaction, run the setup below, load the migration body
-- twice without its transaction boundaries, then run the checks.
create temporary table landmark_required_before on commit drop as
select * from public.public_capsule_spots where false;

do $$
declare
  editor uuid := gen_random_uuid();
  shape jsonb;
  post public.public_capsule_spots;
  points jsonb;
  lat double precision;
  lng double precision;
  i integer := 0;
begin
  insert into auth.users(id, email) values(editor, 'landmark-required-' || editor || '@example.invalid');
  insert into public.profiles(id, name) values(editor, 'Required Landmark rollback') on conflict do nothing;
  insert into private.admin_members(user_id, role) values(editor, 'admin');
  perform set_config('request.jwt.claim.sub', editor::text, true);

  with points as (
    select 25.062 + x.step * .0006 as lat, 121.552 + y.step * .0006 as lng
    from generate_series(-7,7) as x(step) cross join generate_series(-7,7) as y(step)
  ), free as (
    select distinct on (private.s2_cell17(p.lat, p.lng)) p.lat, p.lng
    from points p
    where private.admin_inside_border('taipei', p.lat, p.lng) and not exists (
      select from public.public_capsule_spots w
      where w.status <> 'deleted' and w.s2_cell17 = private.s2_cell17(p.lat, p.lng)
    )
    order by private.s2_cell17(p.lat, p.lng), p.lat, p.lng
    limit 6
  )
  select jsonb_agg(to_jsonb(free)) into points from free;

  foreach shape in array array[
    null::jsonb,
    '{"buildings":{"ids":[101,202],"real_top":25,"top":12,"color":"ink"}}'::jsonb,
    '{"model":null,"custom":{"color":"glass","tiers":[]}}'::jsonb,
    '{"custom":{"color":"ink","tiers":[[3,0,6]]}}'::jsonb,
    '{"model":{"kind":"gate","size":"s","rotate":15,"color":"brass"}}'::jsonb
  ] loop
    lat := (points->i->>'lat')::double precision;
    lng := (points->i->>'lng')::double precision;
    post := jsonb_populate_record(null::public.public_capsule_spots, public.admin_waypost_add(
      'taipei', lat, lng, '地標預設驗收' || i, 'Required Landmark rollback ' || i, 'square',
      p_status => 'draft', p_kind => 'landmark',
      p_landmark => '{"monument":{"model":{"kind":"column","size":"m","rotate":0,"color":"landmark"}}}'
    ));
    -- Recreate legacy rows for the backfill test even after the migration is live.
    update public.public_capsule_spots w set monument=shape where w.id=post.id returning w.* into post;
    insert into pg_temp.landmark_required_before select post.*;
    i := i + 1;
  end loop;

  -- Leave a free point for the post-migration add checks.
  perform set_config('landmark_test.lat', points->i->>'lat', true);
  perform set_config('landmark_test.lng', points->i->>'lng', true);
end;
$$;

-- LANDMARK REQUIRED MODEL MIGRATION GOES HERE

do $$
declare
  default_model constant jsonb := '{"kind":"column","size":"m","rotate":0,"color":"landmark"}';
  batch private.admin_actions;
  original public.public_capsule_spots;
  target uuid;
  shape jsonb;
  lat double precision := current_setting('landmark_test.lat')::double precision;
  lng double precision := current_setting('landmark_test.lng')::double precision;
  added jsonb;
begin
  select * into strict batch from private.admin_actions
  where note = 'Give Landmarks without a model or custom shape the default Column.';
  assert batch.action = 'landmark.set' and batch.target_type = 'waypost_batch';
  assert (select count(*) from pg_temp.landmark_required_before) = 5;

  for original in select * from pg_temp.landmark_required_before order by name_en loop
    if original.name_en in ('Required Landmark rollback 0','Required Landmark rollback 1','Required Landmark rollback 2') then
      assert batch.before->original.id::text = to_jsonb(original);
      assert batch.after->'rows'->original.id::text->'monument'
        = coalesce(original.monument, '{}') || jsonb_build_object('model', default_model);
    else
      assert not (batch.before ? original.id::text), 'Backfill replaced a valid shape';
    end if;
    assert (select w.monument->'buildings' is not distinct from original.monument->'buildings'
      and to_jsonb(w) - 'monument' = to_jsonb(original) - 'monument'
      from public.public_capsule_spots w where w.id=original.id), 'Backfill changed fields outside the model';
  end loop;

  perform public.admin_undo(batch.id);
  assert not exists (
    select from pg_temp.landmark_required_before b join public.public_capsule_spots w using (id)
    where to_jsonb(b) is distinct from to_jsonb(w)
  ), 'Activity Undo did not restore the original rows';

  select id into strict target from pg_temp.landmark_required_before where name_en='Required Landmark rollback 0';
  foreach shape in array array[
    null::jsonb, 'null'::jsonb, '{}'::jsonb,
    '{"buildings":{"ids":[101],"real_top":25,"top":12,"color":"ink"}}'::jsonb,
    '{"model":null,"custom":null}'::jsonb,
    '{"custom":{"color":"ink","tiers":[]}}'::jsonb
  ] loop
    begin
      perform private.validate_monument(shape);
      raise exception 'validator accepted a missing model';
    exception when raise_exception then
      if sqlerrm <> 'bad_monument' then raise; end if;
    end;
    begin
      perform public.admin_landmark_set(target, jsonb_build_object('monument', shape));
      raise exception 'Landmark edit accepted a missing model';
    exception when raise_exception then
      if sqlerrm <> 'bad_monument' then raise; end if;
    end;
    begin
      perform public.admin_waypost_add('taipei', lat, lng, '拒絕無模型', 'Missing Landmark model', 'square',
        p_status => 'draft', p_kind => 'landmark', p_landmark => jsonb_build_object('monument', shape));
      raise exception 'Landmark add accepted a missing model';
    exception when raise_exception then
      if sqlerrm <> 'bad_monument' then raise; end if;
    end;
  end loop;

  perform public.admin_landmark_set(target, '{"monument":{"custom":{"color":"ink","tiers":[[3,0,6]]}}}');
  added := public.admin_waypost_add('taipei', lat, lng, '紀念柱驗收', 'Required Model add', 'square',
    p_status => 'draft', p_kind => 'landmark', p_landmark => jsonb_build_object('monument', jsonb_build_object('model', default_model)));
  assert added #> '{monument,model}' = default_model;
end;
$$;

select 'PASS default Column, preserved paint, repeat run, Activity Undo, both RPC refusals and valid shape saves' as result;
