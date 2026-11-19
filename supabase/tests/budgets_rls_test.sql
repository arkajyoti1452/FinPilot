begin;
select plan(13);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'budget-owner@test.finpilot.local'),
  ('22222222-2222-2222-2222-222222222222', 'budget-other@test.finpilot.local');

insert into public.budgets (id, user_id, month_start, category_id, amount_minor, currency) values
  ('66666666-6666-4666-8666-666666666601', '11111111-1111-1111-1111-111111111111', date '2026-11-01', null, 100000, 'INR'),
  ('66666666-6666-4666-8666-666666666602', '22222222-2222-2222-2222-222222222222', date '2026-11-01', null, 200000, 'INR');

set local role anon;
select throws_ok($$select id from public.budgets$$, '42501', null, 'anon cannot read budgets');
select throws_ok($$insert into public.budgets (user_id, month_start, amount_minor, currency) values ('11111111-1111-1111-1111-111111111111', date '2026-11-01', 1000, 'INR')$$, '42501', null, 'anon cannot create budgets');
select throws_ok($$update public.budgets set amount_minor = 300000$$, '42501', null, 'anon cannot update budgets');
select throws_ok($$delete from public.budgets$$, '42501', null, 'anon cannot delete budgets');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select amount_minor from public.budgets where id = '66666666-6666-4666-8666-666666666601'$$,
  array[100000]::bigint[],
  'the owner can read their budget'
);
select is_empty(
  $$select id from public.budgets where id = '66666666-6666-4666-8666-666666666602'$$,
  'the owner cannot read another user budget'
);
select results_eq(
  $$insert into public.budgets (id, user_id, month_start, category_id, amount_minor, currency)
    values ('77777777-7777-4777-8777-777777777701', '11111111-1111-1111-1111-111111111111', date '2026-12-01', '00000000-0000-4000-8000-000000000101', 50000, 'INR')
    returning id::text$$,
  array['77777777-7777-4777-8777-777777777701']::text[],
  'the owner can create an expense category budget'
);
select throws_ok(
  $$insert into public.budgets (user_id, month_start, amount_minor, currency)
    values ('22222222-2222-2222-2222-222222222222', date '2026-12-01', 50000, 'INR')$$,
  '42501', null, 'the owner cannot create a budget for another user'
);
select results_eq(
  $$update public.budgets set amount_minor = 110000 where id = '66666666-6666-4666-8666-666666666601' returning amount_minor$$,
  array[110000]::bigint[],
  'the owner can update their budget'
);
select is_empty(
  $$update public.budgets set amount_minor = 1 where id = '66666666-6666-4666-8666-666666666602' returning id$$,
  'the owner cannot update another user budget'
);
select is_empty(
  $$delete from public.budgets where id = '66666666-6666-4666-8666-666666666602' returning id$$,
  'the owner cannot delete another user budget'
);
select results_eq(
  $$delete from public.budgets where id = '77777777-7777-4777-8777-777777777701' returning id::text$$,
  array['77777777-7777-4777-8777-777777777701']::text[],
  'the owner can delete their budget'
);
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select amount_minor from public.budgets where id = '66666666-6666-4666-8666-666666666602'$$,
  array[200000]::bigint[],
  'the other user budget remains unchanged'
);

select * from finish();
rollback;
