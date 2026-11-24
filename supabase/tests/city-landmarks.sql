-- Run with the city_landmarks migration loaded. Roll back the test transaction.
do $$
declare
  player uuid := gen_random_uuid();
  check_city record;
  center record;
  nearby jsonb;
  before_position jsonb;
  fixture_id uuid;
  at record;
  fixture_status text;
begin
  assert has_function_privilege('authenticated', 'public.city_landmarks(text)', 'execute');
  assert not has_function_privilege('anon', 'public.city_landmarks(text)', 'execute');
  assert not has_function_privilege('service_role', 'public.city_landmarks(text)', 'execute');

  assert not exists (select from public.city_landmarks('taipei')), 'A JWT subject is required';
  insert into auth.users(id,email) values(player, 'city-landmarks-rollback-' || player || '@example.invalid');
  insert into public.profiles(id,name) values(player, 'City Landmark rollback') on conflict do nothing;
  insert into private.admin_members(user_id,role) values(player,'admin');
  perform set_config('request.jwt.claim.sub',player::text,true);

  for check_city in
    select * from (values ('taipei','Taipei'),('hongkong','Hong Kong'),('macau','Macau'),('singapore','Singapore')) c(id,name)
  loop
    select to_jsonb(g) into before_position from public.player_game g where g.user_id=player;
    assert (select count(*) from public.city_landmarks(check_city.id)) = (
      select count(*) from public.public_capsule_spots w where w.city_en=check_city.name
        and w.kind='landmark' and w.status='live' and w.game_enabled and w.hidden_at is null
    ), 'Live Landmark inventory mismatch';
    assert (select to_jsonb(g) from public.player_game g where g.user_id=player)
      is not distinct from before_position, 'City read changed the player position';

    select * into strict center from private.todays_hunt_center(check_city.id);
    update public.player_game set last_lat=null,last_lng=null,last_position_at=null where user_id=player;
    nearby := public.game_nearby(center.lat,center.lng,8)->'wayposts';
    assert exists (
      select from public.city_landmarks(check_city.id) c
      join jsonb_array_elements(nearby) n on n->>'id'=c.id::text
    ), 'Expected an overlapping row in both feeds';
    assert not exists (
      select from public.city_landmarks(check_city.id) c
      join jsonb_array_elements(nearby) n on n->>'id'=c.id::text
      where to_jsonb(c) is distinct from jsonb_build_object('id',n->'id','lat',n->'lat','lng',n->'lng','monument',n->'monument')
    ), 'City Landmark does not exactly match the nearby payload';
  end loop;

  assert not exists (select from public.city_landmarks('hong-kong'));
  assert not exists (select from public.city_landmarks(null));

  select p.lat,p.lng into strict at
  from (select 25.062+i*.0006 lat, 121.552+j*.0006 lng
        from generate_series(-7,7) i cross join generate_series(-7,7) j) p
  where private.admin_inside_border('taipei',p.lat,p.lng) and not exists (
    select from public.public_capsule_spots w where w.status<>'deleted'
      and w.s2_cell17=private.s2_cell17(p.lat,p.lng)
  ) order by p.lat,p.lng limit 1;

  fixture_id := (public.admin_waypost_add('taipei',at.lat,at.lng,'地標城市驗收','City Landmark rollback',
    'square', p_kind=>'landmark', p_status=>'draft',
    p_landmark=>'{"monument":{"model":{"kind":"column","size":"m","rotate":0,"color":"landmark"}}}') ->> 'id')::uuid;

  assert not exists (select from public.city_landmarks('taipei') c where c.id=fixture_id);
  foreach fixture_status in array array['live','hidden','deleted'] loop
    perform public.admin_place_set_status('waypost',array[fixture_id],fixture_status,null);
    assert exists (select from public.city_landmarks('taipei') c where c.id=fixture_id) = (fixture_status='live'),
      'Only a Live fixture may appear';
    assert not exists (select from public.city_landmarks('macau') c where c.id=fixture_id);
  end loop;
end;
$$;

select 'PASS authenticated only, four city identifiers, position-free reads, nearby parity, status and city isolation' as result;
