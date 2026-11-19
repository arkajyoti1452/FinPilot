export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  occurredOn: string;
  merchant: string | null;
  note: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  month: string;
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  savingsRate: number | null;
  dailySpending: Array<{ date: string; amountMinor: number }>;
  recentTransactions: Transaction[];
}

export interface Budget {
  id: string;
  month: string;
  categoryId: string;
  categoryName: string;
  amountMinor: number;
  spentMinor: number;
  currency: string;
}

export interface Forecast {
  month: string;
  currency: string;
  predictedExpenseMinor: number;
  method: string;
  monthsOfHistory: number;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorBody {
  error: { code: string; message: string; requestId?: string };
}
