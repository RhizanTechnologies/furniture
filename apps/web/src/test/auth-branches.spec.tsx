import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { AuthProvider } from '@/context/AuthContext';

describe('Login & Auth UI Foundation', () => {
  it('should render the login form with email and password fields', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Furniture Business ERP')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('should render quick demo account shortcut buttons for testing', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /Owner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bole Branch Admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Central Branch Admin/i })).toBeInTheDocument();
  });
});
