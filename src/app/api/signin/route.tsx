import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * API route for user sign-in.
 * Validate user credentials and create a session.
 */

// Define a schema using Zod for validating incoming login data
const signInSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string()
});

/**
 * This function handles user sign-in.
 * @param request the request object containing email and password.
 * @returns the user object in JSON format.
 */
export async function POST(request: Request) {
    
  try {
    // Validate input data
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);

    if(!parsed.success){
          return NextResponse.json(
            { errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
          ); 
        }
    const data = parsed.data
    // Find user by email
    const user = await prisma.application_user.findUnique({
        where: {
            email: data.email
        },
    });

    // Use constant-time comparison through bcrypt
    if (!user || !(await bcrypt.compare(data.password, user.password))) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession(user.user_id);

    return NextResponse.json({ user: { id: user.user_id, email: user.email, username: user.username } });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
