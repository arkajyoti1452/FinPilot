import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RequestState } from '../../components/RequestState';
import { financeApi } from '../../lib/finance-api';
import { formatMoney } from '../../lib/money';

function moneyFromMinor(minor: number, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return formatMoney(minor / (10 ** digits), currency);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${month}T00:00:00.000Z`));
}

export function AnalyticsPage() {
  const [months, setMonths] = useState<6 | 12>(6);
  const [currency, setCurrency] = useState('');
  const analytics = useQuery({ queryKey: ['analytics', months], queryFn: () => financeApi.getAnalytics(months) });
  const categories = useQuery({ queryKey: ['categories'], queryFn: financeApi.listCategories });
  const summary = analytics.data?.data;
  const currencies = useMemo(() => [...new Set([...(summary?.monthly.map((item) => item.currency) ?? []), ...(summary?.categories.map((item) => item.currency) ?? [])])].sort(), [summary]);
  const activeCurrency = currencies.includes(currency) ? currency : currencies[0] ?? '';
  const categoryNames = new Map((categories.data?.data ?? []).map((item) => [item.id, item.name]));
  const monthlyData = (summary?.monthly ?? []).filter((item) => item.currency === activeCurrency);
  const highest = Math.max(1, ...monthlyData.flatMap((item) => [item.income_minor, item.expenses_minor]));
  const expenseCategories = (summary?.categories ?? []).filter((item) => item.currency === activeCurrency && item.type === 'expense').slice(0, 8);
  const totalExpense = expenseCategories.reduce((total, item) => total + item.amount_minor, 0);

  if (analytics.isLoading) return <section className="data-page analytics-page"><RequestState title="Loading analytics" description="Summarizing your real transaction history." /></section>;
  if (analytics.isError) return <section className="data-page analytics-page"><RequestState title="Analytics unavailable" description={(analytics.error as Error).message} /></section>;
  if (!summary || currencies.length === 0) return <section className="data-page analytics-page"><header className="data-page__header"><p className="eyebrow">UNDERSTAND YOUR PATTERNS</p><h1>Analytics</h1><p>Explore income and spending over time.</p></header><div className="records-card"><RequestState title="Not enough activity yet" description="Add real transactions to see monthly trends and spending categories here." /></div></section>;

  return <section className="data-page analytics-page">
    <header className="data-page__header analytics-header"><div><p className="eyebrow">UNDERSTAND YOUR PATTERNS</p><h1>Analytics</h1><p>Insights calculated from your saved transactions.</p></div><div className="analytics-filters"><label>Period<select value={months} onChange={(event) => setMonths(Number(event.target.value) as 6 | 12)}><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option></select></label><label>Currency<select value={activeCurrency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div></header>
    <div className="records-card analytics-chart-card"><div className="analytics-card-heading"><div><h2>Monthly cashflow</h2><p>{monthLabel(summary.from)} – {monthLabel(`${summary.to.slice(0, 7)}-01`)}</p></div><div className="analytics-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span></div></div>
      {monthlyData.length === 0 ? <RequestState title="No activity in this period" description="Transactions will appear here when you add them." /> : <div className="analytics-bars" role="img" aria-label={`Monthly income and expenses in ${activeCurrency}`}>{monthlyData.map((item) => <div className="analytics-month" key={item.month}><div className="analytics-bar-pair"><div className="analytics-bar-column"><span className="analytics-bar income-bar" style={{ height: `${Math.max(item.income_minor > 0 ? 4 : 0, Math.round(item.income_minor / highest * 100))}%` }} title={`Income ${moneyFromMinor(item.income_minor, activeCurrency)}`} /></div><div className="analytics-bar-column"><span className="analytics-bar expense-bar" style={{ height: `${Math.max(item.expenses_minor > 0 ? 4 : 0, Math.round(item.expenses_minor / highest * 100))}%` }} title={`Expenses ${moneyFromMinor(item.expenses_minor, activeCurrency)}`} /></div></div><small>{monthLabel(item.month)}</small></div>)}</div>}
    </div>
    <div className="records-card analytics-categories-card"><div className="analytics-card-heading"><div><h2>Spending by category</h2><p>Expense totals · {activeCurrency}</p></div></div>
      {expenseCategories.length === 0 ? <RequestState title="No categorized expenses" description="Expense categories will appear here as you record spending." /> : <div className="analytics-category-list">{expenseCategories.map((item) => { const share = totalExpense > 0 ? Math.round(item.amount_minor / totalExpense * 100) : 0; return <div className="analytics-category" key={`${item.category_id ?? 'none'}-${item.type}`}><div className="analytics-category-heading"><strong>{item.category_id ? categoryNames.get(item.category_id) ?? 'Category' : 'Uncategorized'}</strong><span>{moneyFromMinor(item.amount_minor, activeCurrency)}</span></div><div className="budget-progress-track"><span style={{ width: `${share}%` }} /></div><small>{share}% · {item.transaction_count} {item.transaction_count === 1 ? 'transaction' : 'transactions'}</small></div>; })}</div>}
    </div>
  </section>;
}
