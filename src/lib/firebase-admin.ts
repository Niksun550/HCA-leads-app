
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccount) {
    if (process.env.NODE_ENV === 'production') {
        console.error('Firebase service account key is not set. Features using the Admin SDK will not work.');
    } else {
        console.warn('Firebase service account key is not set. You can add it to your .env.local file for admin features.');
    }
}

let adminApp: admin.app.App;

if (!admin.apps.length) {
    if (serviceAccount) {
        try {
            adminApp = admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(serviceAccount)),
            });
        } catch (error: any) {
             console.error('Error initializing Firebase Admin SDK:', error);
             if (error.code === 'invalid-credential') {
                console.error('The service account key is invalid. Please check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
             }
        }
    } else {
        // Initialize without credentials for environments where it's not needed
        // or to avoid crashing when the key is missing.
        adminApp = admin.initializeApp();
    }
} else {
  adminApp = admin.app();
}

export function getFirebaseAdmin() {
    if (!adminApp) {
        throw new Error("Firebase Admin SDK has not been initialized.");
    }
    return adminApp;
};
