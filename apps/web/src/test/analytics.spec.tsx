import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { AuthProvider } from '@/context/AuthContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Business Analytics & Reporting UI (Prompt 8)', () => {
  it('should render analytics page header and periodic filter buttons', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <AnalyticsPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Business Analytics & Intelligence')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
    expect(screen.getByText('Custom Date Range:')).toBeInTheDocument();
  });

  it('should display loading state during database aggregation', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <AuthProvider>
            <AnalyticsPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(
      screen.getByText(/Aggregating database business intelligence.../i)
    ).toBeInTheDocument();
  });
});
