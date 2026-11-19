begin;
select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'category-owner@test.finpilot.local'),
  ('22222222-2222-2222-2222-222222222222', 'category-other@test.finpilot.local');

insert into public.categories (id, user_id, name, slug, transaction_type)
values ('33333333-3333-4333-8333-333333333302', '22222222-2222-2222-2222-222222222222', 'Other private', 'other-private', 'expense');

set local role anon;
select throws_ok($$select id from public.categories$$, '42501', null, 'anon cannot read categories');
select throws_ok($$insert into public.categories (user_id, name, slug, transaction_type) values ('11111111-1111-1111-1111-111111111111', 'Anon', 'anon', 'expense')$$, '42501', null, 'anon cannot create categories');
select throws_ok($$update public.categories set name = 'changed'$$, '42501', null, 'anon cannot update categories');
select throws_ok($$delete from public.categories$$, '42501', null, 'anon cannot delete categories');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$insert into public.categories (id, user_id, name, slug, transaction_type)
    values ('33333333-3333-4333-8333-333333333301', '11111111-1111-1111-1111-111111111111', 'My custom category', 'my-custom-category', 'expense')
    returning slug$$,
  array['my-custom-category']::text[],
  'a user can create their own category'
);
select results_eq(
  $$select slug from public.categories where id in ('00000000-0000-4000-8000-000000000101', '33333333-3333-4333-8333-333333333301') order by slug$$,
  array['groceries', 'my-custom-category']::text[],
  'a user can read system and own categories'
);
select is_empty(
  $$select id from public.categories where id = '33333333-3333-4333-8333-333333333302'$$,
  'a user cannot read another user category'
);
select throws_ok(
  $$insert into public.categories (user_id, name, slug, transaction_type) values ('22222222-2222-2222-2222-222222222222', 'Stolen', 'stolen', 'expense')$$,
  '42501', null, 'a user cannot create a category for someone else'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $$update public.categories set name = 'changed' where id = '33333333-3333-4333-8333-333333333301' returning id$$,
  'a user cannot update another user category'
);
select is_empty(
  $$delete from public.categories where id = '33333333-3333-4333-8333-333333333301' returning id$$,
  'a user cannot delete another user category'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$update public.categories set name = 'Updated category' where id = '33333333-3333-4333-8333-333333333301' returning name$$,
  array['Updated category']::text[],
  'the owner can update their category'
);
select results_eq(
  $$delete from public.categories where id = '33333333-3333-4333-8333-333333333301' returning id::text$$,
  array['33333333-3333-4333-8333-333333333301']::text[],
  'the owner can delete their category'
);

select * from finish();
rollback;
