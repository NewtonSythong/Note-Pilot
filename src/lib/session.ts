import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

type Session = {
  token: string;
  expires_at: Date;
  is_used: boolean;
  application_user: any;
  last_active_at: Date;
};


const sessionCache = new Map<string, Session>();

/** How far each request pushes a live session's expiry out. */
export const SESSION_SLIDING_EXTENSION_MS = 5 * 60 * 1000;

/** How often that extension is actually persisted, rather than every request. */
export const SESSION_DB_WRITE_INTERVAL_MS = 60_000;

/**
 * Drops one session from the cache, on logout.
 *
 * This used to call sessionCache.clear(), so a single user logging out evicted
 * every other signed-in user's cached session and forced them all back to the
 * database. The token is the session, so removing that one entry is what
 * logout actually means.
 */
export async function clearCache(token: string){
    sessionCache.delete(token);
    return !sessionCache.has(token);
}


/** How long a freshly issued session lasts before the sliding extension applies. */
export const SESSION_INITIAL_TTL_MS = 60 * 60 * 1000;

/**
 * Issues a session for a user and sets the cookie carrying it.
 *
 * Signin and signup both need this and each had its own copy, which is how the
 * two drift apart: a flag added to one is quietly missing from the other. One
 * implementation means the cookie is configured once.
 *
 * The cookie deliberately outlives the database row. The row is authoritative
 * and slides forward while the user is active, so a cookie pinned to the
 * initial hour would log out anyone still working.
 */
export async function createSession(user_id: number) {
    const token = randomBytes(32).toString("hex");

    await prisma.session.create({
        data: {
            user_id,
            token,
            expires_at: new Date(Date.now() + SESSION_INITIAL_TTL_MS),
            last_active_at: new Date(),
        },
    });

    (await cookies()).set({
        name: "session_token",
        value: token,
        httpOnly: true,
        // Never send the session over plain HTTP in production. Left off in
        // development so localhost still works without TLS.
        secure: process.env.NODE_ENV === "production",
        // Blocks the cookie on cross-site POSTs, which is the CSRF case here.
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
    });

    return token;
}

export async function  validateSession(token: string){
    let session = sessionCache.get(token);
    if(!session){ 
        //fetch DB
        const sessionDb = await prisma.session.findFirst({
            where:{
                token, 
                expires_at:{gt: new Date()}, //check is still valid
                is_used: false,
            },
            include:{
                application_user: true,
            },
        });
        if(!sessionDb) return null;
        //add session to sessionCache
        sessionCache.set(sessionDb.token, sessionDb);
        return sessionDb;
    }else{
        //check if valid or used
        if(session.expires_at <= new Date() || session.is_used == true){
            sessionCache.delete(session.token);
            return null
        }
        const now = new Date();
        const newExpiry = new Date(now.getTime() + SESSION_SLIDING_EXTENSION_MS);
        session.expires_at = newExpiry;
        sessionCache.set(session.token, session); //update in cache

        // Throttle the write: persist at most once a minute, when the last
        // persisted beat is old enough. The comparison used to be `<=`, which
        // inverted it — the database was written on every request during active
        // use and then stopped once the user idled past a minute, which is
        // exactly when expires_at needed to be current. last_active_at must be
        // advanced in memory too, or this condition never moves again.
        if (now.getTime() - session.last_active_at.getTime() >= SESSION_DB_WRITE_INTERVAL_MS) {
            session.last_active_at = now;
            sessionCache.set(session.token, session);
            prisma.session.update({
                where: { token: session.token },
                data: { 
                    expires_at: newExpiry,
                    last_active_at: now,
                },
            })
            .catch((err) => {
                console.error("Failed to extend session expiry in DB", err);
            });
        }
        
        return session;
    }
}

const dbToUiLevel: Record<string, string> = {
    early: "child",
    intermediate: "student",
    advanced: "advanced",
};

export async function getUserFromToken(token: string): Promise<SessionUser | null> {
  const session = await validateSession(token);
  if (!session) return null;

  // Fetch user preferences to get aiLevel
  const preferences = await prisma.preferences.findUnique({
    where: { user_id: session.application_user.user_id },
  });

  const aiLevel = preferences?.learner_style ? dbToUiLevel[preferences.learner_style] : "student";

  return {
    user_id: session.application_user.user_id,
    username: session.application_user.username,
    email: session.application_user.email,
    aiLevel,
  };
}

export type SessionUser = {
  user_id: number;
  username: string;
  email: string;
  aiLevel?: string;
};