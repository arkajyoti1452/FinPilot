begin;
select plan(13);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'transaction-owner@test.finpilot.local'),
  ('22222222-2222-2222-2222-222222222222', 'transaction-other@test.finpilot.local');

insert into public.transactions (id, user_id, type, amount_minor, currency, category_id, occurred_on, note) values
  ('44444444-4444-4444-8444-444444444401', '11111111-1111-1111-1111-111111111111', 'expense', 10000, 'INR', '00000000-0000-4000-8000-000000000101', date '2026-11-01', 'owner seed'),
  ('44444444-4444-4444-8444-444444444402', '22222222-2222-2222-2222-222222222222', 'expense', 20000, 'INR', '00000000-0000-4000-8000-000000000101', date '2026-11-02', 'other seed');

set local role anon;
select throws_ok($$select id from public.transactions$$, '42501', null, 'anon cannot read transactions');
select throws_ok($$insert into public.transactions (user_id, type, amount_minor, currency, category_id, occurred_on) values ('11111111-1111-1111-1111-111111111111', 'expense', 100, 'INR', '00000000-0000-4000-8000-000000000101', current_date)$$, '42501', null, 'anon cannot create transactions');
select throws_ok($$update public.transactions set note = 'changed'$$, '42501', null, 'anon cannot update transactions');
select throws_ok($$delete from public.transactions$$, '42501', null, 'anon cannot delete transactions');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select amount_minor from public.transactions where id = '44444444-4444-4444-8444-444444444401'$$,
  array[10000]::bigint[],
  'the owner can read their transaction'
);
select is_empty(
  $$select id from public.transactions where id = '44444444-4444-4444-8444-444444444402'$$,
  'the owner cannot read another user transaction'
);
select results_eq(
  $$insert into public.transactions (id, user_id, type, amount_minor, currency, category_id, occurred_on, note)
    values ('55555555-5555-4555-8555-555555555501', '11111111-1111-1111-1111-111111111111', 'expense', 2500, 'INR', '00000000-0000-4000-8000-000000000101', date '2026-11-18', 'new owner row')
    returning id::text$$,
  array['55555555-5555-4555-8555-555555555501']::text[],
  'the owner can create their own transaction'
);
select throws_ok(
  $$insert into public.transactions (user_id, type, amount_minor, currency, category_id, occurred_on)
    values ('22222222-2222-2222-2222-222222222222', 'expense', 2500, 'INR', '00000000-0000-4000-8000-000000000101', date '2026-11-18')$$,
  '42501', null, 'the owner cannot create a transaction for another user'
);
select results_eq(
  $$update public.transactions set note = 'owner updated' where id = '44444444-4444-4444-8444-444444444401' returning note$$,
  array['owner updated']::text[],
  'the owner can update their transaction'
);
select is_empty(
  $$update public.transactions set note = 'unauthorized' where id = '44444444-4444-4444-8444-444444444402' returning id$$,
  'the owner cannot update another user transaction'
);
select is_empty(
  $$delete from public.transactions where id = '44444444-4444-4444-8444-444444444402' returning id$$,
  'the owner cannot delete another user transaction'
);
select results_eq(
  $$delete from public.transactions where id = '55555555-5555-4555-8555-555555555501' returning id::text$$,
  array['55555555-5555-4555-8555-555555555501']::text[],
  'the owner can delete their transaction'
);
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select note from public.transactions where id = '44444444-4444-4444-8444-444444444402'$$,
  array['other seed']::text[],
  'the other user row remains unchanged'
);

select * from finish();
rollback;
