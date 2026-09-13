// Imported explicitly rather than relying on ambient globals, so the file
// typechecks under `tsc --noEmit` without adding an @types/jest dependency.
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Must be named `mock*`: jest.mock() is hoisted above this declaration, and
// only that prefix may be referenced from the factory.
const mockCount = jest.fn<(args: unknown) => Promise<number>>();
jest.mock('@/lib/db', () => ({ prisma: { upload: { count: mockCount } } }));

// Required rather than imported. The transform hoists ES imports above
// jest.mock(), which would load the real @/lib/db — and with it a live Prisma
// client — before the mock is registered, so these tests would quietly run
// against the real database instead of the stub.
const { userOwnsAllUploads } = require('../ownership') as typeof import('../ownership');

describe('userOwnsAllUploads', () => {
  beforeEach(() => mockCount.mockReset());

  it('passes when every requested upload is owned', async () => {
    mockCount.mockResolvedValue(3);
    expect(await userOwnsAllUploads([1, 2, 3], 7)).toBe(true);
  });

  it('fails when only some are owned, rather than passing on a partial match', async () => {
    // The attack this guards: one of the caller's own ids smuggling two of
    // someone else's through a list.
    mockCount.mockResolvedValue(1);
    expect(await userOwnsAllUploads([1, 2, 3], 7)).toBe(false);
  });

  it('fails closed on an empty list without asking the database', async () => {
    expect(await userOwnsAllUploads([], 7)).toBe(false);
    expect(mockCount).not.toHaveBeenCalled();
  });

  it('scopes the query to the user, not just the upload ids', async () => {
    mockCount.mockResolvedValue(1);
    await userOwnsAllUploads([1], 7);
    expect(mockCount).toHaveBeenCalledWith({
      where: { upload_id: { in: [1] }, paper: { user_id: 7 } },
    });
  });
});
