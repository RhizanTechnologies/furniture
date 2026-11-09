import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShowroomPage } from '@/pages/ShowroomPage';
import { AuthProvider } from '@/context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('Showroom & Catalog UI', () => {
  it('should render showroom header and category filter buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ShowroomPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Furniture Showroom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search showroom models.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Living Room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dining Room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bedroom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Office' })).toBeInTheDocument();
  });
});
