// Imported explicitly rather than relying on ambient globals, so the file
// typechecks under `tsc --noEmit` without adding an @types/jest dependency.
import { describe, it, expect } from '@jest/globals';
import { parseUploadIds } from '../uploadIds';

const parse = (query: string) => parseUploadIds(new URL(`http://x/api/chat${query}`));

describe('parseUploadIds', () => {
  it('reads the singular parameter ChatUI sends', () => {
    expect(parse('?uploadId=3')).toEqual({ ids: [3] });
  });

  it('reads the comma list the summaries and glossary pages send', () => {
    expect(parse('?uploadIds=3,7,9')).toEqual({ ids: [3, 7, 9] });
  });

  it('de-duplicates so an ownership count cannot disagree with the request', () => {
    expect(parse('?uploadIds=3,3,7')).toEqual({ ids: [3, 7] });
  });

  it('falls through to the singular parameter when the list is empty', () => {
    expect(parse('?uploadIds=&uploadId=3')).toEqual({ ids: [3] });
  });

  it('rejects ids that are not positive integers', () => {
    expect(parse('?uploadIds=3,abc')).toHaveProperty('error');
    expect(parse('?uploadId=-1')).toHaveProperty('error');
    expect(parse('?uploadId=1.5')).toHaveProperty('error');
  });

  it('rejects a request that names no upload at all', () => {
    expect(parse('')).toHaveProperty('error');
  });
});
