import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export const insightsRouter = Router();
insightsRouter.use(authenticate);

function formatMinor(amount: number, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount / (10 ** digits));
}

insightsRouter.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const month = `${now.toISOString().slice(0, 7)}-01`;
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const transactionRows: Array<{ type: 'income' | 'expense'; amount_minor: number; currency: string; category_id: string | null }> = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin.from('transactions').select('type,amount_minor,currency,category_id').eq('user_id', req.userId!).gte('occurred_on', month).lt('occurred_on', nextMonth).order('occurred_on', { ascending: false }).range(offset, offset + 999);
      if (error) throw new HttpError(502, 'Could not calculate your financial insights.');
      transactionRows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }

    const { data: budgets, error: budgetError } = await supabaseAdmin.from('budgets').select('amount_minor,currency,category_id').eq('user_id', req.userId!).eq('month_start', month);
    if (budgetError) throw new HttpError(502, 'Could not calculate your financial insights.');
    const { data: categoryRows, error: categoryError } = await supabaseAdmin.from('categories').select('id,name').or(`user_id.is.null,user_id.eq.${req.userId}`);
    if (categoryError) throw new HttpError(502, 'Could not calculate your financial insights.');

    const names = new Map((categoryRows ?? []).map((category) => [category.id, category.name]));
    const totals = new Map<string, { currency: string; income: number; expenses: number }>();
    const expenseCategories = new Map<string, { currency: string; category_id: string | null; amount: number; count: number }>();
    for (const row of transactionRows) {
      const total = totals.get(row.currency) ?? { currency: row.currency, income: 0, expenses: 0 };
      if (row.type === 'income') total.income += Number(row.amount_minor);
      else {
        total.expenses += Number(row.amount_minor);
        const key = `${row.currency}:${row.category_id ?? 'uncategorized'}`;
        const category = expenseCategories.get(key) ?? { currency: row.currency, category_id: row.category_id, amount: 0, count: 0 };
        category.amount += Number(row.amount_minor);
        category.count += 1;
        expenseCategories.set(key, category);
      }
      totals.set(row.currency, total);
    }

    const insights: Array<{ id: string; title: string; message: string; currency?: string }> = [];
    for (const [currency, total] of totals) {
      const currencyBudgets = (budgets ?? []).filter((budget) => budget.currency === currency);
      const overallBudget = currencyBudgets.find((budget) => budget.category_id === null);
      if (overallBudget && Number(overallBudget.amount_minor) > 0) {
        const spentPercent = Math.round(total.expenses / Number(overallBudget.amount_minor) * 100);
        const remaining = Number(overallBudget.amount_minor) - total.expenses;
        insights.push({
          id: `budget-${currency}`,
          title: spentPercent > 100 ? 'Your spending is over budget' : 'Monthly budget progress',
          message: spentPercent > 100
            ? `You have used ${spentPercent}% of your overall budget, which is ${formatMinor(Math.abs(remaining), currency)} above your limit.`
            : `You have used ${spentPercent}% of your overall budget so far this month.`,
          currency
        });
      }

      const topCategory = [...expenseCategories.values()].filter((item) => item.currency === currency).sort((a, b) => b.amount - a.amount)[0];
      if (topCategory && total.expenses > 0) {
        const share = Math.round(topCategory.amount / total.expenses * 100);
        const categoryName = topCategory.category_id ? names.get(topCategory.category_id) ?? 'Other' : 'Uncategorized';
        insights.push({ id: `category-${currency}`, title: 'Your largest expense category', message: `${categoryName} accounts for ${share}% of your recorded expenses this month across ${topCategory.count} ${topCategory.count === 1 ? 'transaction' : 'transactions'}.`, currency });
      }

      if (total.income > 0) {
        const savingsRate = (total.income - total.expenses) / total.income;
        insights.push({ id: `cashflow-${currency}`, title: savingsRate >= 0 ? 'Your net cashflow is positive' : 'Expenses exceed income', message: savingsRate >= 0
          ? `You have kept ${Math.round(savingsRate * 100)}% of recorded income after expenses this month.`
          : `Recorded expenses are ${Math.round(Math.abs(savingsRate) * 100)}% higher than recorded income this month.`, currency });
      }
    }

    res.json({ data: { month, insights: insights.slice(0, 6), transaction_count: transactionRows.length } });
  } catch (error) { next(error); }
});
