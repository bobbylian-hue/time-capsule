begin;

-- City maps can show the same saved Landmark rows as game_nearby without
-- asking for the player's location. Today's Hunt uses "hongkong".
create function public.city_landmarks(p_city text)
returns table (id uuid, lat double precision, lng double precision, monument jsonb)
language sql stable security definer set search_path = '' as $$
  select w.id, w.lat, w.lng, w.monument
  from private.game_regions r
  join public.public_capsule_spots w on w.city_en = r.city
  where (select auth.uid()) is not null
    and p_city in ('taipei', 'hongkong', 'macau', 'singapore')
    and r.id = case p_city when 'hongkong' then 'hong-kong' else p_city end
    and w.kind = 'landmark'
    and w.status = 'live'
    and w.game_enabled
    and w.hidden_at is null
  order by w.id;
$$;

revoke all on function public.city_landmarks(text) from public, anon, authenticated, service_role;
grant execute on function public.city_landmarks(text) to authenticated;

commit;
