import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RequestState } from '../../components/RequestState';
import { financeApi } from '../../lib/finance-api';
import { formatMoney } from '../../lib/money';

const monthNow = () => `${new Date().toISOString().slice(0, 7)}-01`;

export function BudgetsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [message, setMessage] = useState('');
  const month = monthNow();
  const client = useQueryClient();
  const budgets = useQuery({ queryKey: ['budgets', month], queryFn: () => financeApi.listBudgets(month) });
  function resetForm() { setEditingId(null); setAmount(''); setCurrency('INR'); }
  const create = useMutation({ mutationFn: financeApi.createBudget, onSuccess: async () => { resetForm(); setMessage('Budget saved.'); await client.invalidateQueries({ queryKey: ['budgets'] }); }, onError: (error: Error) => setMessage(error.message) });
  const update = useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof financeApi.updateBudget>[1] }) => financeApi.updateBudget(id, input), onSuccess: async () => { resetForm(); setMessage('Budget updated.'); await client.invalidateQueries({ queryKey: ['budgets'] }); }, onError: (error: Error) => setMessage(error.message) });
  const remove = useMutation({ mutationFn: financeApi.deleteBudget, onSuccess: async () => { setMessage('Budget deleted.'); await client.invalidateQueries({ queryKey: ['budgets'] }); }, onError: (error: Error) => setMessage(error.message) });
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage(''); const major = Number(amount); if (!Number.isFinite(major) || major <= 0) { setMessage('Enter a budget amount greater than zero.'); return; } const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2; const amount_minor = Math.round(major * (10 ** digits)); if (editingId) update.mutate({ id: editingId, input: { amount_minor, currency } }); else create.mutate({ month, amount_minor, currency, category_id: null }); }

  return <section className="data-page"><header className="data-page__header"><div><p className="eyebrow">PLAN WITH INTENTION</p><h1>Budgets</h1><p>Set a monthly overall spending limit.</p></div></header>
    <form className="entry-card" onSubmit={submit}><h2>{editingId ? 'Edit monthly budget' : 'Monthly budget'}</h2><label>Amount<input required min="0.01" step="0.01" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label><label>Currency<input required minLength={3} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label><button type="submit" disabled={create.isPending || update.isPending}>{update.isPending ? 'Updating…' : create.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Set budget'}</button>{editingId && <button type="button" className="text-button" onClick={() => { resetForm(); setMessage('Edit cancelled.'); }}>Cancel edit</button>}{message && <p role="status">{message}</p>}</form>
    <div className="records-card"><h2>This month</h2>{budgets.isLoading ? <RequestState title="Loading budgets" description="Getting your account data securely." /> : budgets.isError ? <RequestState title="Could not load budgets" description={(budgets.error as Error).message} /> : !budgets.data || budgets.data.data.length === 0 ? <RequestState title="No budgets set" description="Create an overall monthly budget above." /> : <div className="record-list">{budgets.data.data.map((budget) => { const digits = new Intl.NumberFormat('en', { style: 'currency', currency: budget.currency }).resolvedOptions().maximumFractionDigits ?? 2; return <article className="record-row" key={budget.id}><div><strong>Overall spending limit</strong><small>{budget.month.slice(0, 7)}</small></div><strong>{formatMoney(budget.amount_minor / (10 ** digits), budget.currency)}</strong><button type="button" className="text-button" onClick={() => { setEditingId(budget.id); setAmount(String(budget.amount_minor / (10 ** digits))); setCurrency(budget.currency); setMessage('Editing budget. Update the fields and save your changes.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button><button type="button" className="text-button" disabled={remove.isPending} onClick={() => remove.mutate(budget.id)}>Delete</button></article>; })}</div>}</div>
  </section>;
}
