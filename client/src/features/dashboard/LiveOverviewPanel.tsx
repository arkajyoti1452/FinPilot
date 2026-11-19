import { useQuery } from '@tanstack/react-query';
import { RequestState } from '../../components/RequestState';
import { financeApi } from '../../lib/finance-api';
import { formatMoney } from '../../lib/money';

const currentMonth = () => `${new Date().toISOString().slice(0, 7)}-01`;

export function LiveOverviewPanel() {
  const summary = useQuery({ queryKey: ['dashboard-summary', currentMonth()], queryFn: () => financeApi.getDashboardSummary(currentMonth()) });
  const summaryData = summary.data?.data;
  if (summary.isLoading) return <RequestState title="Loading your summary" description="Fetching totals from your private account." />;
  if (summary.isError || !summaryData) return <RequestState title="Summary unavailable" description={(summary.error as Error | null)?.message ?? 'Your summary could not be loaded.'} />;
  if (!summaryData.currencies.length) return <RequestState title="Your account is ready" description="Add real transactions to see this month's income, expenses, and cashflow." />;
  return <div className="live-summary-grid">{summaryData.currencies.map((item) => {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency: item.currency }).resolvedOptions().maximumFractionDigits ?? 2;
    return <article className="live-summary-card" key={item.currency}><p>{item.currency}</p><dl><div><dt>Income</dt><dd>{formatMoney(item.income_minor / (10 ** digits), item.currency)}</dd></div><div><dt>Expenses</dt><dd>{formatMoney(item.expenses_minor / (10 ** digits), item.currency)}</dd></div><div><dt>Net cashflow</dt><dd>{formatMoney(item.net_cashflow_minor / (10 ** digits), item.currency)}</dd></div><div><dt>Savings rate</dt><dd>{item.savings_rate === null ? '—' : `${(item.savings_rate * 100).toFixed(1)}%`}</dd></div></dl></article>;
  })}</div>;
}
