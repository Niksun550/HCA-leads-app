
import * as admin from 'firebase-admin';

const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let serviceAccount: admin.ServiceAccount | undefined;

if (serviceAccountValue) {
  try {
    serviceAccount = JSON.parse(serviceAccountValue);
  } catch (error) {
    console.error('Error parsing Firebase service account key:', error);
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error: any) {
      console.error('Error initializing Firebase Admin SDK:', error);
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('Firebase service account key is not set. Admin features will not work.');
    } else {
      console.warn('Firebase service account key is not set. You can add it to your .env.local file for admin features.');
    }
  }
}

export function getFirebaseAdmin() {
    if (!admin.apps.length || !admin.app()) {
        throw new Error("Firebase Admin SDK has not been initialized or is not available.");
    }
    return admin.app();
};
