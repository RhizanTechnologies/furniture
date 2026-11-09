import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryPage } from '@/pages/InventoryPage';
import { AuthProvider } from '@/context/AuthContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Inventory & Raw Materials UI (Prompt 6)', () => {
  it('should render inventory header, stock valuation metrics and stock-in button', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <InventoryPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Inventory & Raw Materials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stock In/i })).toBeInTheDocument();
    expect(screen.getByText('Total Stock Valuation')).toBeInTheDocument();
    expect(screen.getByText('Active Materials')).toBeInTheDocument();
    expect(screen.getByText('Reorder Alerts')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search by material code or name.../i)
    ).toBeInTheDocument();
  });

  it('should render category filter pills', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <InventoryPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timber' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fabric' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Foam' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hardware' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finishing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Low Stock/i })).toBeInTheDocument();
  });
});
