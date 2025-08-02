
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

exports.createConversation = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated', 
            'You must be logged in to create a conversation.'
        );
    }

    const { otherUserId } = data;
    if (!otherUserId) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with an "otherUserId" argument.'
        );
    }

    const currentUserId = context.auth.uid;
    const db = admin.firestore();

    try {
        const currentUserDoc = await db.collection('users').doc(currentUserId).get();
        const otherUserDoc = await db.collection('users').doc(otherUserId).get();

        if (!currentUserDoc.exists() || !otherUserDoc.exists()) {
            throw new functions.https.HttpsError('not-found', 'One or more users not found.');
        }

        const currentUserData = currentUserDoc.data();
        const otherUserData = otherUserDoc.data();
        
        const sortedParticipants = [currentUserId, otherUserId].sort();
        const conversationId = sortedParticipants.join('_');
        const conversationRef = db.collection('conversations').doc(conversationId);
        
        const docSnap = await conversationRef.get();
        
        if (docSnap.exists()) {
             const existingConversation = docSnap.data();
             // Manually add the id to the returned object
             return { conversation: { id: docSnap.id, ...existingConversation } };
        }

        const newConversation = {
            participants: sortedParticipants,
            participantNames: {
                [currentUserId]: currentUserData.displayName || currentUserData.email || 'User',
                [otherUserId]: otherUserData.displayName || otherUserData.email || 'User',
            },
            participantPhotos: {
                [currentUserId]: currentUserData.photoURL || null,
                [otherUserId]: otherUserData.photoURL || null,
            },
            lastMessage: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            unreadCounts: {
                [currentUserId]: 0,
                [otherUserId]: 0,
            },
        };

        await conversationRef.set(newConversation);

        // After setting, we need to fetch the doc again to get the server timestamp
        const newDocSnap = await conversationRef.get();
        const finalConversation = newDocSnap.data();

        return { conversation: { id: conversationId, ...finalConversation } };

    } catch (error) {
        console.error("Error creating conversation:", error);
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while creating the conversation.',
            error
        );
    }
});
