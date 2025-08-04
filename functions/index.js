
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if the request is authenticated and the user is an admin.
  if (!context.auth || context.auth.token.role !== 'Admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You must be an admin to perform this action.'
    );
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a "uid" argument.'
    );
  }

  try {
    // Delete the user from Firebase Authentication.
    await admin.auth().deleteUser(uid);

    // Delete the user's document from Firestore.
    await admin.firestore().collection('users').doc(uid).delete();

    return { result: `Successfully deleted user ${uid}` };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while deleting the user.',
      error
    );
  }
});
