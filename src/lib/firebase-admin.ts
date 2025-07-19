
'use server';

import * as admin from 'firebase-admin';

let app: admin.app.App;
if (!admin.apps.length) {
  const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountValue) {
    try {
      const serviceAccount = JSON.parse(serviceAccountValue);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY', e);
    }
  } else {
    console.log('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
  }
} else {
  app = admin.app();
}

export function getFirebaseAdmin() {
  if (!app) {
    throw new Error('Firebase Admin SDK has not been initialized.');
  }
  return app;
}
