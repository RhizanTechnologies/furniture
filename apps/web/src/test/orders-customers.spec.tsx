import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomersPage } from '@/pages/CustomersPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderStagesPage } from '@/pages/OrderStagesPage';
import { AuthProvider } from '@/context/AuthContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Customers, Orders & Customizable Stages UI', () => {
  it('should render customers page with registration action and search input', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <CustomersPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Walk-In Customers Registry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Customer/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search by customer name/i)
    ).toBeInTheDocument();
  });

  it('should render orders page with create button and stage filters', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <OrdersPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Furniture Orders & Pipeline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Order/i })).toBeInTheDocument();
    expect(screen.getByText('All Orders')).toBeInTheDocument();
  });

  it('should render customizable order stages page with owner controls', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <OrderStagesPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Custom Order Stages')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Stage/i })).toBeInTheDocument();
    expect(screen.getByText(/Owner-Managed Order Stages/i)).toBeInTheDocument();
  });
});
