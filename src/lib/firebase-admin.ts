
import * as admin from 'firebase-admin';

// This is a singleton to ensure we only initialize the admin app once.
let adminApp: admin.app.App | null = null;

function initializeAdmin() {
  if (admin.apps.some(app => app?.name === 'firebase-admin-app')) {
    return admin.app('firebase-admin-app');
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Admin SDK initialization failed.');
    return null;
  }

  try {
    // Firebase Admin SDK expects an object, not a JSON string.
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    }, 'firebase-admin-app'); // Use a unique name to avoid conflicts

    return adminApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string.', error);
    return null;
  }
}

export function getAdminAuth() {
  const app = initializeAdmin();
  return app ? app.auth() : null;
}

export function getAdminFirestore() {
  const app = initializeAdmin();
  return app ? app.firestore() : null;
}
