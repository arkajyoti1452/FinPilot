# FinPilot API setup

The Express API is in `server/`. It verifies Supabase access tokens with `auth.getUser(token)`, then scopes each database operation to the verified user ID. The service key is used only by the server and bypasses RLS, so every data query explicitly includes the authenticated user's ID. Never place `SUPABASE_SECRET_KEY` in `client/.env.local`, a `VITE_` variable, source control, or browser code.

## Install and configure

From PowerShell:

```powershell
Set-Location 'S:\Study\Projects\FinPilot\server'
npm.cmd install
Copy-Item .env.example .env
```

Edit `server/.env` with the hosted project's URL and server-side **secret key** from Supabase Project Settings → API Keys. Keep the file private and never paste the secret into chat. The API defaults to port 4000 and allows the Vite origin at `http://localhost:5173`.

## Run locally

In a terminal with the working directory set to `server`:

```powershell
npm.cmd run dev
```

Check `http://localhost:4000/api/health`; it should return `{"data":{"status":"ok","service":"finpilot-api"}}`.

## API contract

All routes except `GET /api/health` require `Authorization: Bearer <Supabase access token>`. JSON responses use `{ "data": ... }`; errors use `{ "error": { "code": "...", "message": "..." } }`.

| Method and path | Purpose |
| --- | --- |
| `GET /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&type=expense&limit=50&offset=0` | List the signed-in user's transactions; pagination metadata is returned. |
| `POST /api/transactions` | Create a transaction. Required: `type`, `amount_minor` (integer minor currency units), `currency`, `occurred_on`; optional: `category_id`, `merchant`, `note`. |
| `PATCH /api/transactions/:id` | Update supplied transaction fields. |
| `DELETE /api/transactions/:id` | Delete a transaction. |
| `GET /api/categories` | List system categories and categories owned by the signed-in user. |
| `GET /api/budgets?month=YYYY-MM-01` | List the signed-in user's budgets for a month (defaults to current UTC month). |
| `POST /api/budgets` | Create a budget with `month`, `amount_minor`, `currency`, optional `category_id`. |
| `PATCH /api/budgets/:id` | Update budget amount and/or currency. |
| `DELETE /api/budgets/:id` | Delete a budget. |
| `GET /api/dashboard/summary?month=YYYY-MM-01` | Aggregate income, expenses, net cashflow, and savings rate by currency from real transactions. |
| `GET /api/dashboard/insights` | Return rule-based monthly budget, top-category, and cashflow insights for the signed-in user's real data. |
| `GET /api/analytics?months=6` (or `12`) | Aggregate the signed-in user's transaction history by month and category, grouped by currency. |
| `POST /api/assistant/chat` | Send `{ "message": "...", "history": [{ "role": "user" | "model", "text": "..." }] }` and receive a grounded reply. Requires a server-side Gemini API key and is limited to 10 requests per minute per IP. |

Amounts are integer minor units (for example, paise for INR). Totals are grouped by currency and are not combined across currencies.

## Gemini assistant configuration

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then set `GEMINI_API_KEY` in `server/.env`. Keep it on the server only; never add it to a `VITE_` variable, client files, source control, or chat. The default model is `gemini-3.8-flash`; set `GEMINI_MODEL` on the server if you choose another model available to your API key. Restart the API after changing environment values. For Render, add both variables in the service's environment settings. The assistant receives the authenticated user's recent monthly and category aggregates, not raw merchant-level transaction rows.

## Client integration modules

`client/src/lib/finance-api.ts` sends the signed-in Supabase session's access token as a bearer token and provides typed helpers for every endpoint above. The live data views are exported from `client/src/features/transactions/TransactionsPage.tsx`, `client/src/features/budgets/BudgetsPage.tsx`, and `client/src/features/dashboard/LiveOverviewPanel.tsx`; their styles are in `client/src/features/finance-pages.css`. Mount these views in the existing application shell's Transactions, Budgets, and Overview route slots, and import `finance-pages.css` once from `client/src/main.tsx` (or the app entry CSS). The current assistant and analytics screens do not yet have API endpoints in this phase.

## Verification

After installation and environment setup, run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Use an access token from a real signed-in browser session to exercise protected endpoints. Do not share tokens. Missing/invalid token should return 401; a transaction or budget ID owned by another user should behave as not found. Browser calls should use the Supabase session's current `access_token`, never a stored user ID as an authorization input.

## Render deployment notes

Create a Render Web Service rooted at `server`. Use build command `npm install && npm run build`, start command `npm start`, and set `NODE_ENV=production`, `CLIENT_ORIGIN` to the deployed Vercel origin, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` in Render's environment settings. Keep the secret out of the repository. Configure the frontend API base URL to the Render service URL when wiring the client in the integration phase. Deploying is a later step and should happen after local API verification.
