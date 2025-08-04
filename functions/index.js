
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.deleteUser = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    // Check if the request is authenticated and the user is an admin.
    // With onRequest, we need to verify the token manually.
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      res.status(401).send({ error: { message: 'Unauthorized. No token provided.' }});
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken.role !== 'Admin') {
        res.status(403).send({ error: { message: 'Permission denied. You must be an admin.' }});
        return;
      }

      const { uid } = req.body.data;
      if (!uid) {
        res.status(400).send({ error: { message: 'The function must be called with a "uid" argument.' }});
        return;
      }
      
      // Delete the user from Firebase Authentication.
      await admin.auth().deleteUser(uid);
      
      // Delete the user's document from Firestore.
      await admin.firestore().collection('users').doc(uid).delete();
      
      res.status(200).send({ data: { result: `Successfully deleted user ${uid}` } });

    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).send({ error: { message: 'An error occurred while deleting the user.' }});
    }
  });
});


exports.createConversation = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        if (!idToken) {
          res.status(401).send({ error: { message: 'Unauthorized. No token provided.' }});
          return;
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const currentUserId = decodedToken.uid;

            const { otherUserId } = req.body.data;
            if (!otherUserId) {
                res.status(400).send({ error: { message: 'The function must be called with an "otherUserId" argument.' }});
                return;
            }

            const db = admin.firestore();
            const sortedParticipants = [currentUserId, otherUserId].sort();
            const conversationId = sortedParticipants.join('_');
            const conversationRef = db.collection('conversations').doc(conversationId);
            
            const docSnap = await conversationRef.get();
            
            if (docSnap.exists()) {
                 res.status(200).send({ data: { conversationId: docSnap.id } });
                 return;
            }

            const currentUserDoc = await db.collection('users').doc(currentUserId).get();
            const otherUserDoc = await db.collection('users').doc(otherUserId).get();

            if (!currentUserDoc.exists() || !otherUserDoc.exists()) {
                res.status(404).send({ error: { message: 'One or more users not found.' } });
                return;
            }

            const currentUserData = currentUserDoc.data();
            const otherUserData = otherUserDoc.data();
            
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

            res.status(200).send({ data: { conversationId: conversationId } });

        } catch (error) {
            console.error("Error creating conversation:", error);
            res.status(500).send({ error: { message: 'An error occurred while creating the conversation.' }});
        }
    });
});
