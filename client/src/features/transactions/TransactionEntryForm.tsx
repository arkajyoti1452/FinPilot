import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ShieldCheck, X } from 'lucide-react';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.').refine((value) => Number(value) > 0, 'Amount must be greater than zero.'),
  currency: z.enum(['INR', 'USD']),
  category: z.string().min(1, 'Choose a category.'),
  occurredOn: z.string().min(1, 'Choose a date.'),
  merchant: z.string().trim().max(80, 'Keep this under 80 characters.'),
  note: z.string().trim().max(280, 'Keep notes under 280 characters.'),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const starterCategories = [
  'Food & dining',
  'Home & utilities',
  'Transport',
  'Health',
  'Shopping',
  'Education',
  'Salary',
  'Other',
];

export function TransactionEntryForm({ onClose }: { onClose: () => void }) {
  const [saveNotice, setSaveNotice] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      currency: 'INR',
      category: '',
      occurredOn: '',
      merchant: '',
      note: '',
    },
  });

  const submit = handleSubmit(() => {
    setSaveNotice('This entry has not been saved. Secure sign-in and the live API will be connected in the next phases.');
  });

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
        <div className="modal-heading"><div><p className="eyebrow">TRANSACTION DETAILS</p><h2 id="transaction-form-title">Add a transaction</h2></div><button className="icon-button" type="button" aria-label="Close form" onClick={onClose}><X size={19} /></button></div>
        <form onSubmit={submit} noValidate>
          <div className="transaction-type-switch" role="group" aria-label="Transaction type">
            <label className="type-option expense-option"><input type="radio" value="expense" {...register('type')} /><span>Expense</span></label>
            <label className="type-option income-option"><input type="radio" value="income" {...register('type')} /><span>Income</span></label>
          </div>
          <div className="form-row amount-row">
            <label className="form-field"><span>Amount</span><input inputMode="decimal" placeholder="0.00" autoFocus {...register('amount')} aria-invalid={Boolean(errors.amount)} />{errors.amount && <small className="field-error">{errors.amount.message}</small>}</label>
            <label className="form-field currency-field"><span>Currency</span><select {...register('currency')}><option value="INR">INR ₹</option><option value="USD">USD $</option></select></label>
          </div>
          <div className="form-row">
            <label className="form-field"><span>Category</span><select {...register('category')} aria-invalid={Boolean(errors.category)}><option value="">Select a category</option>{starterCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{errors.category && <small className="field-error">{errors.category.message}</small>}</label>
            <label className="form-field"><span>Date</span><input type="date" {...register('occurredOn')} aria-invalid={Boolean(errors.occurredOn)} />{errors.occurredOn && <small className="field-error">{errors.occurredOn.message}</small>}</label>
          </div>
          <label className="form-field"><span>Merchant or source <em>Optional</em></span><input placeholder="Where did this happen?" {...register('merchant')} aria-invalid={Boolean(errors.merchant)} />{errors.merchant && <small className="field-error">{errors.merchant.message}</small>}</label>
          <label className="form-field"><span>Note <em>Optional</em></span><textarea rows={2} placeholder="Add a detail for future you" {...register('note')} aria-invalid={Boolean(errors.note)} />{errors.note && <small className="field-error">{errors.note.message}</small>}</label>
          {saveNotice && <p className="form-status" role="status">{saveNotice}</p>}
          <div className="modal-actions"><button className="button button-soft" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={isSubmitting}>Save transaction</button></div>
          <p className="form-privacy"><ShieldCheck size={13} /> Your entry will be private to your account.</p>
        </form>
      </section>
    </div>
  );
}
