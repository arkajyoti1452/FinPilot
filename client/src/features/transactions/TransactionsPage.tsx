import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { financeApi, type Category, type Transaction } from '../../lib/finance-api';
import { formatMoney } from '../../lib/money';
import { RequestState } from '../../components/RequestState';

function today() { return new Date().toISOString().slice(0, 10); }

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [date, setDate] = useState(today());
  const [merchant, setMerchant] = useState('');
  const [message, setMessage] = useState('');
  const transactions = useQuery({ queryKey: ['transactions'], queryFn: () => financeApi.listTransactions() });
  const categories = useQuery({ queryKey: ['categories'], queryFn: financeApi.listCategories });
  const availableCategories = categories.data?.data.filter((category: Category) => category.transaction_type === type) ?? [];
  useEffect(() => {
    if (!availableCategories.some((category) => category.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id ?? '');
    }
  }, [type, categories.data, categoryId]);
  function resetForm() {
    setEditingId(null);
    setType('expense');
    setCategoryId('');
    setAmount('');
    setCurrency('INR');
    setDate(today());
    setMerchant('');
  }
  const create = useMutation({ mutationFn: financeApi.createTransaction, onSuccess: async () => { resetForm(); setMessage('Transaction saved.'); await queryClient.invalidateQueries(); }, onError: (error: Error) => setMessage(error.message) });
  const update = useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof financeApi.updateTransaction>[1] }) => financeApi.updateTransaction(id, input), onSuccess: async () => { resetForm(); setMessage('Transaction updated.'); await queryClient.invalidateQueries(); }, onError: (error: Error) => setMessage(error.message) });
  const remove = useMutation({ mutationFn: financeApi.deleteTransaction, onSuccess: async () => { setMessage('Transaction deleted.'); await queryClient.invalidateQueries(); }, onError: (error: Error) => setMessage(error.message) });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('');
    if (!categoryId) { setMessage('Choose a category before saving.'); return; }
    const majorUnits = Number(amount);
    const fractionDigits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
    if (!Number.isFinite(majorUnits) || majorUnits <= 0) { setMessage('Enter an amount greater than zero.'); return; }
    const amountMinor = Math.round(majorUnits * (10 ** fractionDigits));
   const input = { type, amount_minor: amountMinor, currency, category_id: categoryId, occurred_on: date, merchant: merchant.trim() || null, note: null };
   if (editingId) update.mutate({ id: editingId, input });
   else create.mutate(input);
  }

 function startEditing(item: Transaction) {
   const digits = new Intl.NumberFormat('en', { style: 'currency', currency: item.currency }).resolvedOptions().maximumFractionDigits ?? 2;
   setEditingId(item.id);
   setType(item.type);
   setCategoryId(item.category_id ?? '');
   setAmount(String(item.amount_minor / (10 ** digits)));
   setCurrency(item.currency);
   setDate(item.occurred_on);
   setMerchant(item.merchant ?? '');
   setMessage('Editing transaction. Update the fields and save your changes.');
   window.scrollTo({ top: 0, behavior: 'smooth' });
 }

  return <section className="data-page">
    <header className="data-page__header"><div><p className="eyebrow">YOUR ACTIVITY</p><h1>Transactions</h1><p>Track income and spending from your private account.</p></div></header>
    <form className="entry-card" onSubmit={submit}>
     <h2>{editingId ? 'Edit transaction' : 'Add a transaction'}</h2>
      <label>Type<select value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense')}><option value="expense">Expense</option><option value="income">Income</option></select></label>
      <label>Category<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categories.isLoading || categories.isError || availableCategories.length === 0}><option value="">{categories.isLoading ? 'Loading categories…' : categories.isError ? 'Could not load categories' : 'Choose a category'}</option>{availableCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
      <label>Amount<input required min="0.01" step="0.01" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
      <label>Currency<input required minLength={3} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
      <label>Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label>Merchant / source<input maxLength={120} value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Optional" /></label>
     <button type="submit" disabled={create.isPending || update.isPending}>{update.isPending ? 'Updating…' : create.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Save transaction'}</button>
     {editingId && <button type="button" className="text-button" onClick={() => { resetForm(); setMessage('Edit cancelled.'); }}>Cancel edit</button>}
      {message && <p role="status">{message}</p>}
    </form>
    <div className="records-card"><h2>Recent transactions</h2>
     {transactions.isLoading ? <RequestState title="Loading transactions" description="Getting your account data securely." /> : transactions.isError ? <RequestState title="Could not load transactions" description={(transactions.error as Error).message} /> : !transactions.data || transactions.data.data.length === 0 ? <RequestState title="No transactions yet" description="Add your first real transaction above to start seeing your activity." /> : <div className="record-list">{transactions.data.data.map((item: Transaction) => { const digits = new Intl.NumberFormat('en', { style: 'currency', currency: item.currency }).resolvedOptions().maximumFractionDigits ?? 2; return <article className="record-row" key={item.id}><div><strong>{item.merchant || (item.type === 'income' ? 'Income' : 'Expense')}</strong><small>{item.occurred_on} · {item.type}</small></div><strong className={item.type === 'income' ? 'amount-positive' : ''}>{item.type === 'income' ? '+' : '−'}{formatMoney(item.amount_minor / (10 ** digits), item.currency)}</strong><button type="button" className="text-button" onClick={() => startEditing(item)} aria-label={`Edit ${item.merchant || item.type}`}>Edit</button><button type="button" className="text-button" disabled={remove.isPending} onClick={() => remove.mutate(item.id)} aria-label={`Delete ${item.merchant || item.type}`}>Delete</button></article>; })}</div>}
    </div>
  </section>;
}
