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

## Session handling

Sessions are issued by `createSession` in `src/lib/session.ts`, which signin and
signup both call. Keep it that way: each previously had its own copy of the
cookie configuration, which is how one gains a flag the other never gets. The
cookie is `httpOnly`, `sameSite=lax`, and `secure` outside development.

The cookie deliberately outlives its database row. The row is authoritative and
slides forward while the user is active, so pinning the cookie to the initial
hour would sign out anyone still working.

## Known outstanding issues

- **8 npm advisories remain** (5 high, 3 moderate, 0 critical), all requiring
  major version bumps: Next 15 → 16, Prisma 6 → 7, and the
  `pdfreader` → `pdf2json` → `@xmldom/xmldom` chain. Of these the xmldom XML
  injection is the only one reached by user input, since that chain parses
  uploaded PDFs; the rest are build-time tooling. The two framework upgrades
  are their own piece of work, not a security patch.
