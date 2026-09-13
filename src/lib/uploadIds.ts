import { z } from "zod";

/**
 * Reads the upload ids a request is scoped to.
 *
 * Two spellings are accepted because two kinds of caller exist. ChatUI talks
 * about one upload at a time and sends `?uploadId=3`; the summaries and
 * glossary pages work from a multi-lecture selection and send
 * `?uploadIds=3,7,9`. The chat route previously only read the singular form,
 * so every request from those two pages failed validation — the callers then
 * swallowed the 400 and quietly carried on without chat context.
 *
 * `uploadIds` wins when both are present. Ids are de-duplicated so a repeated
 * id cannot make an ownership count disagree with the request.
 *
 * @returns the parsed ids, or an error message describing what was wrong.
 */
export function parseUploadIds(url: URL): { ids: number[] } | { error: string } {
  // `||` rather than `??`: an empty `?uploadIds=` should fall through to the
  // singular parameter, and `??` only falls back on null.
  const raw = url.searchParams.get('uploadIds') || url.searchParams.get('uploadId');

  if (!raw) {
    return { error: "uploadId or uploadIds is required" };
  }

  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const parsed = z.array(z.coerce.number().int().positive()).safeParse(parts);

  if (!parsed.success || parsed.data.length === 0) {
    return { error: "Invalid uploadId" };
  }

  return { ids: [...new Set(parsed.data)] };
}
