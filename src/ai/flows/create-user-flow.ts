
'use server';
/**
 * @fileOverview A flow to create a new user in Firebase Authentication and Firestore.
 * 
 * - createUser - A function that handles the user creation process.
 * - CreateUserInput - The input type for the createUser function.
 * - CreateUserOutput - The return type for the createUser function.
 */

import { ai } from '@/ai/genkit';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { userRoles } from '@/types';
import { z } from 'zod';

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  role: z.enum(userRoles),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  error: z.string().optional(),
});
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
    try {
      const admin = getFirebaseAdmin();
      const auth = admin.auth();
      const db = admin.firestore();

      const { email, password, displayName, role } = input;

      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName,
        role,
      });

      return { uid: userRecord.uid };
    } catch (error: any) {
      console.error('Error creating user in flow:', error);
      return { error: error.message || 'An unknown error occurred.' };
    }
  }
);
