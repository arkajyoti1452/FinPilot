# Phase 3 — Supabase setup

## What the migration creates

[`supabase/migrations/20261118000100_finpilot_core.sql`](../supabase/migrations/20261118000100_finpilot_core.sql) creates:

- `profiles`, created automatically when Supabase Auth creates a user.
- `categories`, with built-in reference categories and user-owned custom categories.
- `transactions`, with `income`/`expense` types and integer minor-unit money amounts.
- `budgets`, supporting an overall monthly budget or a category-specific expense budget.

The built-in category rows are lookup data only. The migration does not create sample transactions, budgets, balances, or user activity. Every table has RLS enabled, explicit grants, and owner policies. Category validation also prevents a user from attaching another user's custom category to a transaction or budget.

The per-table pgTAP suites in `supabase/tests/` cover signed-out denial, owner access, cross-user isolation, and permitted CRUD operations. Supabase's RLS guidance recommends testing both grants and policies through the `anon` and `authenticated` roles. [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Local setup on Windows PowerShell

The local Supabase stack requires Docker Desktop to be installed and running. It uses local containers; it does not touch a hosted Supabase project. Supabase recommends at least 7 GB RAM for the full local stack. [Local development guide](https://supabase.com/docs/guides/local-development)

From the repository root, install the CLI as a root development dependency. The repository currently has a separate `client/package.json`, so these commands create the root CLI manifest:

```powershell
Set-Location 'S:\Study\Projects\FinPilot'
npm.cmd init -y
npm.cmd install --save-dev supabase
npx.cmd supabase --version
```

The local configuration is already in `supabase/config.toml`. It enables email sign-up and confirmations locally, and allows the Vite app's local callback origin. Start and rebuild the local database from migrations:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db
```

`db reset` destroys and recreates the **local** database, then reapplies migrations. Do not add `--remote` to these commands. The database test command runs the pgTAP tests against the local stack. [Migration workflow](https://supabase.com/docs/guides/local-development/cli-workflows) · [Database testing](https://supabase.com/docs/guides/database/testing)

Check the local endpoints and keys with:

```powershell
npx.cmd supabase status
```

The output includes a local secret key. Do not paste the full output into chat or commit it. Copy only the local API URL and **publishable** key into `client/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:4000
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=copy-the-local-publishable-key-here
```

Use the publishable key in browser code. Never use the local secret key, a hosted secret key, or a `service_role` key in a `VITE_` variable. [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys)

Restart Vite after editing `.env.local`:

```powershell
Set-Location 'S:\Study\Projects\FinPilot\client'
npm.cmd run dev
```

Open `http://localhost:5173`. Create an account, then open the local Supabase Mailpit inbox (shown by `npx.cmd supabase status`) and follow the confirmation link. The Auth screen uses the PKCE flow and session persistence from the Supabase JavaScript client. [Supabase PKCE guide](https://supabase.com/docs/guides/auth/sessions/pkce-flow)

Generate TypeScript definitions from the migrated local schema:

```powershell
Set-Location 'S:\Study\Projects\FinPilot'
npx.cmd supabase gen types --lang typescript --local --schema public | Set-Content -Encoding utf8 client/src/types/database.types.ts
```

The generated file is derived from the database. Do not hand-edit it; regenerate it after schema migrations.

## Hosted Supabase project

For hosted Auth, create a Supabase project and configure email/password sign-in. Keep email confirmation enabled for a real deployment. Set the project's **Site URL** to the eventual frontend origin and allow the exact local callback `http://localhost:5173/**`; add the production origin after Vercel is configured. Supabase uses the Site URL as the default redirect for confirmation and recovery links. [Redirect URL settings](https://supabase.com/docs/guides/auth/redirect-urls) · [Auth production checklist](https://supabase.com/docs/guides/security/production-checklist)

To apply this migration remotely after choosing the intended development project, sign into the CLI, link its project reference, and inspect the dry run:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref <your-development-project-ref>
npx.cmd supabase db push --dry-run --remote
```

Only after confirming that the linked project is the intended development database and the dry run lists this migration should you apply it:

```powershell
npx.cmd supabase db push --remote
```

Do not use `supabase db reset --remote` on a hosted project; it wipes that project's database. The migration must be applied before the frontend can create Auth users and their profiles. Keys should be copied directly from the Supabase dashboard into local environment files and later into Render/Vercel settings, never into source control.

## Verification checklist

1. `npx.cmd supabase start` reports the local services healthy.
2. `npx.cmd supabase db reset` applies the migration without SQL errors.
3. `npx.cmd supabase test db` reports all four RLS test files passing.
4. A new confirmed Auth user has one profile row and can read system categories.
5. A user's policies do not reveal rows belonging to the second test user.
6. The browser uses the local publishable key; no secret key appears in `client/.env.local` or the Vite bundle.
