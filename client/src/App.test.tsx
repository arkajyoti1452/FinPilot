import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { BrowserRouter } from 'react-router';

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-access-token', user: { id: 'test-user', email: 'user@example.test', user_metadata: {} } } },
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

describe('FinPilot shell', () => {
  it('renders the finance navigation and dashboard shell', async () => {
    window.history.pushState({}, '', '/');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><BrowserRouter><App /></BrowserRouter></QueryClientProvider>);

    expect(await screen.findByRole('link', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /a clearer view of your money/i })).toBeInTheDocument();
    expect(screen.getByText(/you’re signed in to your private workspace/i)).toBeInTheDocument();
  });
});
