import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TransactionEntryForm } from './TransactionEntryForm';

describe('transaction entry form', () => {
  it('validates fields and clearly reports that the draft is not persisted yet', async () => {
    const user = userEvent.setup();
    render(<TransactionEntryForm onClose={() => undefined} />);

    await user.click(screen.getByRole('button', { name: /save transaction/i }));
    expect(screen.getByText('Choose a category.')).toBeInTheDocument();
    expect(screen.getByText('Choose a date.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/amount/i), '125.50');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Food & dining');
    await user.type(screen.getByLabelText(/date/i), '2026-11-17');
    await user.click(screen.getByRole('button', { name: /save transaction/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/has not been saved/i);
  });
});
