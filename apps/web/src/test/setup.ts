import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => `blob:mock-url-${Math.random()}`);
  URL.revokeObjectURL = vi.fn();
}
