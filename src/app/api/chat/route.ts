import { getAuthedUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseUploadIds } from "@/lib/uploadIds";

/**
 * Chat API endpoints for persistent chat message management
 * 
 * WHAT IT DOES:
 * GET: Retrieve chat history for specific uploads
 * POST: Save new chat messages to database
 * DELETE: Clear chat history for specific uploads
 * Links chat messages to uploads and users for persistence
 */

// Validation schemas
const postChatSchema = z.object({
  uploadId: z.number(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

/**
 * Confirms every requested upload belongs to this user.
 *
 * Checking the count rather than fetching one row matters now that a request
 * can name several uploads: verifying only the first would let a caller append
 * someone else's upload id to a list containing one of their own and read that
 * user's chat history back.
 */
async function userOwnsAllUploads(uploadIds: number[], user_id: number) {
  const owned = await prisma.upload.count({
    where: {
      upload_id: { in: uploadIds },
      paper: { user_id },
    },
  });

  return owned === uploadIds.length;
}

export async function GET(request: NextRequest) {
  try {
    const user_id = await getAuthedUserId();
    if (!user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseUploadIds(new URL(request.url));
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    console.log(`Fetching chat history for uploadIds: ${parsed.ids.join(',')}, user: ${user_id}`);

    // Verify every requested upload belongs to the user
    if (!(await userOwnsAllUploads(parsed.ids, user_id))) {
      return NextResponse.json({ error: "Upload not found or unauthorized" }, { status: 404 });
    }

    // Fetch chat messages for these uploads
    const messages = await prisma.chat_message.findMany({
      where: {
        upload_id: { in: parsed.ids },
        user_id: user_id
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    console.log(`Found ${messages.length} chat messages for uploads ${parsed.ids.join(',')}`);

    return NextResponse.json({
      success: true,
      messages: messages.map(msg => ({
        message_id: msg.message_id,
        // Included so a caller that asked about several uploads can tell the
        // messages apart; single-upload callers simply ignore it.
        upload_id: msg.upload_id,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at.toISOString()
      }))
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user_id = await getAuthedUserId();
    if (!user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postChatSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error('Invalid request body:', parsed.error);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { uploadId, role, content } = parsed.data;

    console.log(`Saving chat message for uploadId: ${uploadId}, user: ${user_id}, role: ${role}`);

    // Verify the upload belongs to the user
    const upload = await prisma.upload.findFirst({
      where: {
        upload_id: uploadId,
        paper: {
          user_id: user_id
        }
      }
    });

    if (!upload) {
      return NextResponse.json({ error: "Upload not found or unauthorized" }, { status: 404 });
    }

    // Save the chat message
    const message = await prisma.chat_message.create({
      data: {
        upload_id: uploadId,
        user_id: user_id,
        role: role,
        content: content
      }
    });

    console.log(`Chat message saved with ID: ${message.message_id}`);

    return NextResponse.json({
      success: true,
      message: {
        message_id: message.message_id,
        role: message.role,
        content: message.content,
        created_at: message.created_at.toISOString()
      }
    });

  } catch (error) {
    console.error('Error saving chat message:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user_id = await getAuthedUserId();
    if (!user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Same parameter contract as GET. Keeping the two in step is the whole
    // point: they diverged before, and that is how the plural callers ended up
    // silently broken against a singular-only reader.
    const parsed = parseUploadIds(new URL(request.url));
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    console.log(`Clearing chat history for uploadIds: ${parsed.ids.join(',')}, user: ${user_id}`);

    // Verify every requested upload belongs to the user
    if (!(await userOwnsAllUploads(parsed.ids, user_id))) {
      return NextResponse.json({ error: "Upload not found or unauthorized" }, { status: 404 });
    }

    // Delete all chat messages for these uploads and user
    const result = await prisma.chat_message.deleteMany({
      where: {
        upload_id: { in: parsed.ids },
        user_id: user_id
      }
    });

    console.log(`Deleted ${result.count} chat messages for uploads ${parsed.ids.join(',')}`);

    return NextResponse.json({
      success: true,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}