
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { userRoles } from '@/types';
import * as z from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  role: z.enum(userRoles),
});

export async function POST(req: NextRequest) {
  try {
    const admin = getFirebaseAdmin();
    const auth = admin.auth();
    const db = admin.firestore();

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const { email, password, displayName, role } = validation.data;

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

    return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
