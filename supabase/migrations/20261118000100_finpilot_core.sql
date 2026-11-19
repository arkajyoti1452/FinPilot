-- FinPilot core schema. Apply this migration through the Supabase CLI.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.transaction_type as enum ('income', 'expense');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 120
  ),
  constraint profiles_currency_code check (preferred_currency ~ '^[A-Z]{3}$'),
  constraint profiles_timezone_length check (char_length(timezone) between 1 and 64)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  transaction_type public.transaction_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create unique index categories_system_slug_unique
  on public.categories (transaction_type, slug)
  where user_id is null;

create unique index categories_user_slug_unique
  on public.categories (user_id, transaction_type, slug)
  where user_id is not null;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.transaction_type not null,
  amount_minor bigint not null,
  currency text not null default 'INR',
  category_id uuid not null references public.categories (id) on delete restrict,
  occurred_on date not null,
  merchant text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_amount_positive check (amount_minor > 0),
  constraint transactions_amount_safe_integer check (amount_minor <= 9007199254740991),
  constraint transactions_currency_code check (currency ~ '^[A-Z]{3}$'),
  constraint transactions_merchant_length check (
    merchant is null or char_length(merchant) <= 120
  ),
  constraint transactions_note_length check (note is null or char_length(note) <= 500)
);

create index transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc, id);

create index transactions_user_type_date_idx
  on public.transactions (user_id, type, occurred_on desc);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null,
  category_id uuid references public.categories (id) on delete restrict,
  amount_minor bigint not null,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_month_start_first_day check (
    month_start = date_trunc('month', month_start)::date
  ),
  constraint budgets_amount_positive check (amount_minor > 0),
  constraint budgets_amount_safe_integer check (amount_minor <= 9007199254740991),
  constraint budgets_currency_code check (currency ~ '^[A-Z]{3}$')
);

create unique index budgets_user_month_overall_unique
  on public.budgets (user_id, month_start)
  where category_id is null;

create unique index budgets_user_month_category_unique
  on public.budgets (user_id, month_start, category_id)
  where category_id is not null;

create index budgets_user_month_idx
  on public.budgets (user_id, month_start desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function private.set_updated_at();

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function private.set_updated_at();

create function private.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120)), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

revoke all on function private.create_profile_for_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function private.create_profile_for_new_auth_user();

create function private.enforce_transaction_category()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.categories as category
    where category.id = new.category_id
      and category.transaction_type = new.type
      and (category.user_id is null or category.user_id = new.user_id)
  ) then
    raise exception 'Category must be available to this user and match the transaction type.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create trigger transactions_validate_category
  before insert or update of user_id, type, category_id on public.transactions
  for each row execute function private.enforce_transaction_category();

create function private.enforce_budget_category()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.category_id is not null and not exists (
    select 1
    from public.categories as category
    where category.id = new.category_id
      and category.transaction_type = 'expense'::public.transaction_type
      and (category.user_id is null or category.user_id = new.user_id)
  ) then
    raise exception 'Budget category must be an expense category available to this user.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create trigger budgets_validate_category
  before insert or update of user_id, category_id on public.budgets
  for each row execute function private.enforce_budget_category();

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.enforce_transaction_category() from public, anon, authenticated;
revoke all on function private.enforce_budget_category() from public, anon, authenticated;

-- System categories are reference data, not example financial activity.
insert into public.categories (id, user_id, name, slug, transaction_type) values
  ('00000000-0000-4000-8000-000000000101', null, 'Groceries', 'groceries', 'expense'),
  ('00000000-0000-4000-8000-000000000102', null, 'Home & utilities', 'home-utilities', 'expense'),
  ('00000000-0000-4000-8000-000000000103', null, 'Transport', 'transport', 'expense'),
  ('00000000-0000-4000-8000-000000000104', null, 'Dining out', 'dining-out', 'expense'),
  ('00000000-0000-4000-8000-000000000105', null, 'Health', 'health', 'expense'),
  ('00000000-0000-4000-8000-000000000106', null, 'Shopping', 'shopping', 'expense'),
  ('00000000-0000-4000-8000-000000000107', null, 'Education', 'education', 'expense'),
  ('00000000-0000-4000-8000-000000000108', null, 'Other expense', 'other-expense', 'expense'),
  ('00000000-0000-4000-8000-000000000201', null, 'Salary', 'salary', 'income'),
  ('00000000-0000-4000-8000-000000000202', null, 'Freelance', 'freelance', 'income'),
  ('00000000-0000-4000-8000-000000000203', null, 'Investment income', 'investment-income', 'income'),
  ('00000000-0000-4000-8000-000000000204', null, 'Other income', 'other-income', 'income')
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.budgets from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, preferred_currency, timezone) on table public.profiles to authenticated;
grant select, insert, delete on table public.categories to authenticated;
grant update (name, slug) on table public.categories to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
grant select, insert, update, delete on table public.budgets to authenticated;
grant usage on type public.transaction_type to authenticated;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()))
  with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy categories_select_system_or_own
  on public.categories for select to authenticated
  using (user_id is null or ((select auth.uid()) is not null and user_id = (select auth.uid())));

create policy categories_insert_own
  on public.categories for insert to authenticated
  with check (user_id is not null and (select auth.uid()) is not null and user_id = (select auth.uid()));

create policy categories_update_own
  on public.categories for update to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy categories_delete_own
  on public.categories for delete to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy transactions_select_own
  on public.transactions for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy transactions_insert_own
  on public.transactions for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy transactions_update_own
  on public.transactions for update to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy transactions_delete_own
  on public.transactions for delete to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy budgets_select_own
  on public.budgets for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy budgets_insert_own
  on public.budgets for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy budgets_update_own
  on public.budgets for update to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy budgets_delete_own
  on public.budgets for delete to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));
