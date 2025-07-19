
'use server';
/**
 * @fileOverview A flow for creating a new user with administrative privileges.
 *
 * - createUser - Creates a new user in Firebase Authentication and Firestore.
 * - CreateUserInput - The input type for the createUser function.
 * - CreateUserOutput - The return type for the createUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { userRoles } from '@/types';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  role: z.enum(userRoles),
});

const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  error: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;

export async function createUser(input: CreateUserInput): Promise<CreateUserOutput> {
  return createUserFlow(input);
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (input) => {
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    if (!auth || !db) {
      return { error: 'Firebase Admin SDK not initialized. Check server logs.' };
    }

    try {
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        emailVerified: true, // Admins can create verified users
      });

      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: input.email,
        displayName: input.displayName,
        role: input.role,
      });

      return { uid: userRecord.uid };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return { error: error.message || 'An unknown error occurred while creating the user.' };
    }
  }
);
