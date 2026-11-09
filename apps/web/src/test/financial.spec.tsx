import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinancialPage } from '@/pages/FinancialPage';
import { AuthProvider } from '@/context/AuthContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Financial Management UI (Prompt 7)', () => {
  it('should render financial header, executive metrics, tabs and action buttons', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <FinancialPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Financial Management & Accounting')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record Payment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record Expense/i })).toBeInTheDocument();

    expect(screen.getByText('Cash Inflow Collected')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Receivables')).toBeInTheDocument();
    expect(screen.getByText('Operating Expenses')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit')).toBeInTheDocument();
    expect(screen.getByText('Net Business Profit')).toBeInTheDocument();

    expect(screen.getByText(/Payments Ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/Expenses Ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/Branch Contributions/i)).toBeInTheDocument();
  });
});
