import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

describe('Frontend UI Foundation Components', () => {
  it('should render styled button correctly', () => {
    render(<Button>Click Me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
  });

  it('should render wood-styled badge correctly', () => {
    render(<Badge variant="wood">Active Order</Badge>);
    const badge = screen.getByText(/active order/i);
    expect(badge).toBeInTheDocument();
  });

  it('should format currency in ETB with two decimals', () => {
    expect(formatCurrency(12500)).toBe('12,500.00 ETB');
    expect(formatCurrency(0)).toBe('0.00 ETB');
  });
});
