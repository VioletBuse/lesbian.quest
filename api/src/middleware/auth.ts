import { createClerkClient, verifyToken } from '@clerk/backend';
import { createDb } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import type { Env } from '../types';
import { nanoid } from 'nanoid';
import { getAuth } from '@hono/clerk-auth';

type TestUser = {
    userId: string;
    username: string;
    email: string;
    role: string;
    clerkId: string;
};

async function getClerkUserDetails(c: Context<{ Bindings: Env }>) {
    // In test environment, parse the auth header directly
    if (c.env.ENVIRONMENT === 'test' || c.env.ENVIRONMENT === 'testing') {
        const authHeader = c.req.raw.headers.get('Authorization');
        if (!authHeader) return null;
        try {
            const testUser = JSON.parse(authHeader) as TestUser;
            return {
                id: testUser.userId,
                username: testUser.username,
                firstName: testUser.username,
                emailAddresses: [{ emailAddress: testUser.email }]
            };
        } catch {
            return null;
        }
    }

    // Production environment uses Clerk
    const clerk = createClerkClient({
        secretKey: c.env.CLERK_SECRET_KEY,
        publishableKey: c.env.CLERK_PUBLISHABLE_KEY
    })
    try {
        const auth = getAuth(c)
        if (!auth?.userId) {
            return null
        }

        const user = await clerk.users.getUser(auth.userId)

        return user

    } catch (error) {
        console.error(error)
        return null;
    }
}

export async function getUser(c: Context<{ Bindings: Env }>): Promise<string | null> {
    const user = await getClerkUserDetails(c);
    if (!user) {
        return null;
    }

    // Get user from database using Drizzle
    const db = createDb(c.env.DB);
    const dbUser = await syncClerkUser(db, c.env, user.id, c);
    return dbUser?.id || null;
}

async function syncClerkUser(db: ReturnType<typeof createDb>, env: Env, userId: string, c: Context<{ Bindings: Env }>) {
    const user = await getClerkUserDetails(c);
    if (!user) return null;

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.clerkId, userId)).get();

    if (existingUser) {
        // Update last login
        await db
            .update(users)
            .set({
                lastLogin: new Date(),
                email: user.emailAddresses[0]?.emailAddress,
                username: user.username || user.firstName || 'user',
            })
            .where(eq(users.clerkId, userId));
        return existingUser;
    }

    // Create new user
    const newUser = await db
        .insert(users)
        .values({
            id: nanoid(),
            clerkId: userId,
            email: user.emailAddresses[0]?.emailAddress || '',
            username: user.username || user.firstName || 'user',
            createdAt: new Date(),
            lastLogin: new Date(),
        })
        .returning()
        .get();

    return newUser;
}

// Hono middleware helper
export async function getUserFromContext(c: Context<{ Bindings: Env }>): Promise<string | null> {
    return getUser(c);
} 