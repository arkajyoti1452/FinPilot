begin;
select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'profile-owner@test.finpilot.local'),
  ('22222222-2222-2222-2222-222222222222', 'profile-other@test.finpilot.local');

set local role anon;
select throws_ok($$select id from public.profiles$$, '42501', null, 'anon cannot read profiles');
select throws_ok($$insert into public.profiles (id) values ('11111111-1111-1111-1111-111111111111')$$, '42501', null, 'anon cannot create profiles');
select throws_ok($$update public.profiles set display_name = 'changed'$$, '42501', null, 'anon cannot update profiles');
select throws_ok($$delete from public.profiles$$, '42501', null, 'anon cannot delete profiles');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select preferred_currency from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$,
  array['INR']::text[],
  'new auth users receive a default profile and can read it'
);
select results_eq(
  $$update public.profiles set preferred_currency = 'USD' where id = '11111111-1111-1111-1111-111111111111' returning preferred_currency$$,
  array['USD']::text[],
  'a user can update their own profile preferences'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $$select id from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$,
  'another user cannot read the profile'
);
select is_empty(
  $$update public.profiles set preferred_currency = 'CAD' where id = '11111111-1111-1111-1111-111111111111' returning id$$,
  'another user cannot update the profile'
);
select results_eq(
  $$select preferred_currency from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  array['INR']::text[],
  'a cross-user update leaves the other profile untouched'
);
select throws_ok($$delete from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$, '42501', null, 'authenticated users cannot delete profiles');

select * from finish();
rollback;
