
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
      const errorMessage = 'Firebase Admin SDK not initialized. Check server logs for details. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set correctly in .env.local.';
      console.error(errorMessage);
      return { error: errorMessage };
    }

    try {
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        emailVerified: true, // Admins can create verified users
      });

      try {
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: input.email,
            displayName: input.displayName,
            role: input.role,
        });
      } catch (firestoreError: any) {
        // If Firestore write fails, we should ideally delete the created auth user
        // for consistency, but for now, we'll just report the error.
        console.error('Firestore user creation failed after Auth user was created:', firestoreError);
        return { error: `User was created in authentication, but failed to save to database: ${firestoreError.message}` };
      }


      return { uid: userRecord.uid };
    } catch (error: any) {
      console.error('Error creating user in Firebase Auth:', error);
      
      let errorMessage = 'An unknown error occurred while creating the user.';
      if (error.code === 'auth/email-already-exists') {
        errorMessage = 'This email address is already in use by another account.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { error: errorMessage };
    }
  }
);
