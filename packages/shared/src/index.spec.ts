import { describe, it, expect } from 'vitest';
import { UserRole, StockMode, loginSchema } from './index.js';

describe('Shared Package Foundation', () => {
  it('should export domain enums', () => {
    expect(UserRole.OWNER).toBe('OWNER');
    expect(UserRole.BRANCH_ADMIN).toBe('BRANCH_ADMIN');
    expect(StockMode.MAIN_STOCK).toBe('MAIN_STOCK');
    expect(StockMode.BRANCH_STOCK).toBe('BRANCH_STOCK');
  });

  it('should validate loginSchema correctly', () => {
    const valid = loginSchema.safeParse({
      email: 'owner@furniture.com',
      password: 'password123'
    });
    expect(valid.success).toBe(true);

    const invalid = loginSchema.safeParse({
      email: 'not-an-email',
      password: '123'
    });
    expect(invalid.success).toBe(false);
  });
});
