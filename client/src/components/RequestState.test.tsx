import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState, LoadingState } from './RequestState';

describe('request states', () => {
  it('announces loading state to assistive technology', () => {
    render(<LoadingState label="Loading budgets" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading budgets');
  });

  it('shows a retry action for a recoverable request error', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="The server is unavailable." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('The server is unavailable.');
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
