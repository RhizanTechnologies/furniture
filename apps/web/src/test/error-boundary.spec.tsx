import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RouteErrorBoundary } from '@/components/feedback/RouteErrorBoundary';
import * as reactRouterDom from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useRouteError: vi.fn(),
    isRouteErrorResponse: vi.fn(),
    useNavigate: () => vi.fn(),
  };
});

describe('RouteErrorBoundary UX & Template', () => {
  it('renders unexpected javascript error with reload and navigation controls', () => {
    vi.mocked(reactRouterDom.useRouteError).mockReturnValue(
      new Error("Cannot access 'customers' before initialization")
    );
    vi.mocked(reactRouterDom.isRouteErrorResponse).mockReturnValue(false);

    render(
      <reactRouterDom.BrowserRouter>
        <RouteErrorBoundary />
      </reactRouterDom.BrowserRouter>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText("Cannot access 'customers' before initialization")
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Technical Diagnostics/i)).toBeInTheDocument();
  });

  it('renders 404 Not Found error response cleanly', () => {
    vi.mocked(reactRouterDom.useRouteError).mockReturnValue({
      status: 404,
      statusText: 'Not Found',
      data: { message: 'Route does not exist' },
    });
    vi.mocked(reactRouterDom.isRouteErrorResponse).mockReturnValue(true);

    render(
      <reactRouterDom.BrowserRouter>
        <RouteErrorBoundary />
      </reactRouterDom.BrowserRouter>
    );

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText(/The page or record you are trying to view does not exist/i)).toBeInTheDocument();
    expect(screen.getByText('HTTP 404')).toBeInTheDocument();
  });
});
