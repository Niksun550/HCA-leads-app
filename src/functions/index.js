
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to perform this action.'
    );
  }

  const adminUserDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!adminUserDoc.exists || adminUserDoc.data().role !== 'Admin') {
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
    await admin.auth().deleteUser(uid);
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

    if (currentUserId === otherUserId) {
      throw new functions.https.HttpsError(
            'invalid-argument',
            'You cannot create a conversation with yourself.'
        );
    }
    
    const db = admin.firestore();

    try {
        const sortedParticipants = [currentUserId, otherUserId].sort();
        const conversationId = sortedParticipants.join('_');
        const conversationRef = db.collection('conversations').doc(conversationId);
        
        const docSnap = await conversationRef.get();
        
        if (docSnap.exists()) {
             return { conversationId: docSnap.id };
        }

        const currentUserDoc = await db.collection('users').doc(currentUserId).get();
        const otherUserDoc = await db.collection('users').doc(otherUserId).get();

        if (!currentUserDoc.exists() || !otherUserDoc.exists()) {
            throw new functions.https.HttpsError('not-found', 'One or more users not found.');
        }

        const currentUserData = currentUserDoc.data() || {};
        const otherUserData = otherUserDoc.data() || {};
        
        const newConversation = {
            id: conversationId,
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

        return { conversationId: conversationId };

    } catch (error) {
        console.error("Error creating conversation:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while creating the conversation.',
            error
        );
    }
});

exports.generateImageForPWA = functions.runWith({ invoker: 'public' }).https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      try {
        const size = req.query.size === '512' ? 512 : 192;
        const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/hca-crm.appspot.com/o/branding%2Flogo?alt=media&token=eb534335-a745-41f2-95f7-41a64f169f4c';
        
        const response = await fetch(logoUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch logo image');
        }
        const imageBuffer = await response.arrayBuffer();

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.status(200).send(Buffer.from(imageBuffer));

      } catch (error) {
        console.error('Error generating PWA image:', error);
        res.status(500).send('Error generating image');
      }
    });
});
