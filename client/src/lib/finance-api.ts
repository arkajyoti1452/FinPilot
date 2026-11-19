import { supabase } from './supabase';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

export interface Category { id: string; user_id: string | null; name: string; slug: string; transaction_type: 'income' | 'expense' }
export interface Transaction { id: string; user_id: string; type: 'income' | 'expense'; amount_minor: number; currency: string; category_id: string | null; occurred_on: string; merchant: string | null; note: string | null; created_at: string; updated_at: string }
export interface Budget { id: string; user_id: string; month: string; category_id: string | null; amount_minor: number; currency: string; created_at: string; updated_at: string }
export interface DashboardCurrencySummary { currency: string; income_minor: number; expenses_minor: number; net_cashflow_minor: number; savings_rate: number | null }
export interface DashboardSummary { month: string; currencies: DashboardCurrencySummary[] }
export interface AnalyticsMonthlySummary { month: string; currency: string; income_minor: number; expenses_minor: number }
export interface AnalyticsCategorySummary { category_id: string | null; currency: string; type: 'income' | 'expense'; amount_minor: number; transaction_count: number }
export interface AnalyticsSummary { from: string; to: string; monthly: AnalyticsMonthlySummary[]; categories: AnalyticsCategorySummary[] }
export interface AssistantHistoryMessage { role: 'user' | 'model'; text: string }
export interface FinancialInsight { id: string; title: string; message: string; currency?: string }
interface ApiErrorBody { error?: { code?: string; message?: string; details?: Array<{ path: string; message: string }> } }

export class FinanceApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); this.name = 'FinanceApiError'; }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiBaseUrl) throw new FinanceApiError('API URL is not configured. Set VITE_API_BASE_URL in client/.env.local.', 0);
  const { data: { session } } = await supabase!.auth.getSession();
  if (!session?.access_token) throw new FinanceApiError('Your session expired. Sign in again to continue.', 401, 'UNAUTHORIZED');
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...init.headers }
    });
  } catch {
    throw new FinanceApiError(`Could not reach the FinPilot API at ${apiBaseUrl}. Confirm the server is running and this URL is correct.`, 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    throw new FinanceApiError(body.error?.message ?? `Request failed (${response.status}).`, response.status, body.error?.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const financeApi = {
  listTransactions: (query = '') => request<{ data: Transaction[]; pagination: { limit: number; offset: number; total: number } }>(`/api/transactions${query}`),
  createTransaction: (input: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => request<{ data: Transaction }>('/api/transactions', { method: 'POST', body: JSON.stringify(input) }),
  updateTransaction: (id: string, input: Partial<Pick<Transaction, 'type' | 'amount_minor' | 'currency' | 'category_id' | 'occurred_on' | 'merchant' | 'note'>>) => request<{ data: Transaction }>(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteTransaction: (id: string) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
  listCategories: () => request<{ data: Category[] }>('/api/categories'),
  listBudgets: (month: string) => request<{ data: Budget[] }>(`/api/budgets?month=${encodeURIComponent(month)}`),
  createBudget: (input: Pick<Budget, 'month' | 'category_id' | 'amount_minor' | 'currency'>) => request<{ data: Budget }>('/api/budgets', { method: 'POST', body: JSON.stringify(input) }),
  updateBudget: (id: string, input: Partial<Pick<Budget, 'amount_minor' | 'currency'>>) => request<{ data: Budget }>(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBudget: (id: string) => request<void>(`/api/budgets/${id}`, { method: 'DELETE' }),
  getDashboardSummary: (month: string) => request<{ data: DashboardSummary }>(`/api/dashboard/summary?month=${encodeURIComponent(month)}`),
  getAnalytics: (months: 6 | 12) => request<{ data: AnalyticsSummary }>(`/api/analytics?months=${months}`),
  chatAssistant: (message: string, history: AssistantHistoryMessage[]) => request<{ data: { reply: string; context_period: { from: string; to: string } } }>('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
  getFinancialInsights: () => request<{ data: { month: string; transaction_count: number; insights: FinancialInsight[] } }>('/api/dashboard/insights')
};
