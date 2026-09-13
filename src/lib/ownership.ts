import { prisma } from "@/lib/db";

/**
 * Confirms every requested upload belongs to this user.
 *
 * Every route that takes an upload id from the caller must pass it through
 * here before reading or writing anything keyed to it. Authentication only
 * establishes *who* is asking; without this check any signed-in user can name
 * another user's upload id and have the app hand back that user's lecture
 * content, summaries, flashcards or problem sets.
 *
 * Checking the count rather than fetching one row matters when a request can
 * name several uploads: verifying only the first would let a caller append
 * someone else's id to a list containing one of their own.
 */
export async function userOwnsAllUploads(uploadIds: number[], user_id: number) {
  if (uploadIds.length === 0) return false;

  const owned = await prisma.upload.count({
    where: {
      upload_id: { in: uploadIds },
      paper: { user_id },
    },
  });

  return owned === uploadIds.length;
}
