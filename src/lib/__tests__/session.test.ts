// Imported explicitly rather than relying on ambient globals, so the file
// typechecks under `tsc --noEmit` without adding an @types/jest dependency.
import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';

// Must be named `mock*`: jest.mock() is hoisted above these declarations, and
// only that prefix may be referenced from the factory.
const mockFindFirst = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpdate = jest.fn<(args: unknown) => Promise<unknown>>();
jest.mock('@/lib/db', () => ({
  prisma: { session: { findFirst: mockFindFirst, update: mockUpdate } },
}));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

// Required rather than imported: the transform hoists ES imports above
// jest.mock(), which would load the real @/lib/db and a live Prisma client
// before the mock is registered.
const { validateSession, clearCache } = require('../session') as typeof import('../session');

const START = new Date('2026-09-13T00:00:00Z').getTime();

/** A session row as the database would hand it back, already live. */
const row = (token: string) => ({
  token,
  expires_at: new Date(START + 60 * 60 * 1000),
  is_used: false,
  last_active_at: new Date(START),
  application_user: { user_id: 1 },
});

describe('validateSession database write throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(START);
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
    mockUpdate.mockResolvedValue({});
  });

  afterAll(() => jest.useRealTimers());

  it('does not write on every request while the user is active', async () => {
    mockFindFirst.mockResolvedValue(row('warm'));
    await validateSession('warm');          // cold: loads and caches
    mockUpdate.mockClear();

    jest.setSystemTime(START + 5_000);
    await validateSession('warm');
    jest.setSystemTime(START + 10_000);
    await validateSession('warm');

    // The comparison used to be inverted, so these two cache hits each wrote.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('writes once the persisted beat is older than the interval', async () => {
    mockFindFirst.mockResolvedValue(row('idle'));
    await validateSession('idle');
    mockUpdate.mockClear();

    jest.setSystemTime(START + 61_000);
    await validateSession('idle');

    // Inverted, this stopped writing exactly when expires_at went stale.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('advances the persisted beat so the throttle keeps moving', async () => {
    mockFindFirst.mockResolvedValue(row('moving'));
    await validateSession('moving');

    jest.setSystemTime(START + 61_000);
    await validateSession('moving');
    mockUpdate.mockClear();

    // Without advancing last_active_at in memory, every later request would
    // look overdue and write again.
    jest.setSystemTime(START + 66_000);
    await validateSession('moving');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('drops only the token given to clearCache', async () => {
    mockFindFirst.mockResolvedValue(row('a'));
    await validateSession('a');
    mockFindFirst.mockResolvedValue(row('b'));
    await validateSession('b');

    await clearCache('a');
    mockFindFirst.mockReset();
    mockFindFirst.mockResolvedValue(null);

    // 'b' is still cached, so it never reaches the database; 'a' does.
    await validateSession('b');
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(await validateSession('a')).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });
});
