
import * as admin from 'firebase-admin';

// This is a singleton to ensure we only initialize the admin app once.
let adminApp: admin.app.App | null = null;

function initializeAdmin() {
  if (adminApp) {
    return adminApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK initialization failed.');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    }, 'firebase-admin-app'); // Use a unique name to avoid conflicts

    return adminApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
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
