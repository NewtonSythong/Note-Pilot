# Security notes

Last reviewed: 13 September 2026.

This file replaces `deployment-readiness-report.md`, which was dated October
2025 and had become actively misleading. It asserted "NO CRITICAL
VULNERABILITIES — npm audit clean" (there were three criticals and twenty-one
highs by the time it was checked) and "Authorization — User ownership
verification on all operations" (five routes had no ownership check at all).
A document that claims a property the code does not have is worse than no
document, because it stops anyone from looking.

## Authorization model

Authentication is per-route, not middleware-wide. Every API route resolves the
caller itself via `getSessionUser` or `getAuthedUserId`. `middleware.ts` gates
pages only; its matcher previously listed a route that does not exist
(`/api/summarize`) and a malformed pattern (`/account/path:*`) that matched
nothing, so anything relying on it for protection was in fact unprotected.

**Authentication is not authorization.** Knowing *who* is asking says nothing
about whether the upload id they sent is theirs. Any route that accepts an
upload id from the caller must pass it through `userOwnsAllUploads`
(`src/lib/ownership.ts`) before reading or writing anything keyed to it.
Ownership is checked by counting matches against the whole requested set, not
by verifying the first id — otherwise a caller can append someone else's id to
a list containing one of their own.

Prefer returning 404 over 403 on an ownership failure, so the response does not
confirm that the id exists.

## Known outstanding issues

- **8 npm advisories remain** (5 high, 3 moderate, 0 critical), all requiring
  major version bumps: Next 15 → 16, Prisma 6 → 7, and the
  `pdfreader` → `pdf2json` → `@xmldom/xmldom` chain. Of these the xmldom XML
  injection is the only one reached by user input, since that chain parses
  uploaded PDFs; the rest are build-time tooling. The two framework upgrades
  are their own piece of work, not a security patch.
- **Session expiry is extended in memory on every request**, and the throttle
  guarding the database write is inverted — `validateSession` writes when the
  session was active within the last minute rather than when it was last
  written more than a minute ago. The effect is write amplification during
  active use and a stale `expires_at` in the database once a user idles.
- **`user_answer` has no table**, so problem set answers are not persisted
  (`src/app/api/problemsets/route.tsx`).
