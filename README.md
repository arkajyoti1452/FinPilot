# FinPilot – AI Personal Finance Manager

FinPilot is a privacy-first personal finance application built with React, TypeScript, Express, Supabase, and Gemini. The project is being implemented in phases; the frontend currently provides a responsive UI shell and truthful no-data states. It does not display seeded or simulated financial records.

## Frontend development

PowerShell commands from the repository root:

```powershell
Set-Location client
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Set `VITE_API_BASE_URL` to the Express API URL when it is available. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are public browser configuration. Never put a Gemini key or a Supabase secret/service-role key in a `VITE_` variable.

Run frontend checks with:

```powershell
Set-Location client
npm.cmd test
npm.cmd run build
```

## Project phases

1. Planning and architecture
2. Frontend shell and experience
3. Supabase schema, authentication, and RLS
4. Secure Express API and CRUD
5. Authenticated frontend integration
6. Gemini insights and grounded chat
7. Security and end-to-end verification
8. Vercel and Render deployment

## Supabase

Phase 3 migrations, Auth settings, local Docker setup, key handling, and database verification commands are documented in [docs/supabase-setup.md](docs/supabase-setup.md).
