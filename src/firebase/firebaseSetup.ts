import * as admin from 'firebase-admin';

let serviceAccount: admin.ServiceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // For local development only - ensure this file is not committed!
  serviceAccount = require('./sa_firebase.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});


const firestore = admin.firestore();

export async function readData() {
  try {
    console.log('-------------- Reading from Firestore --------------');
    // Replace 'your-collection' and 'doc-id' with your actual collection name and document ID.
    const docRef = firestore.collection('users').doc('HLfLy7LfeGh8dHQKeBxunkKgiH73');
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      console.log('No such document!');
    } else {
      console.log('Document data:', docSnapshot.data());
    }
  } catch (error) {
    console.error('Error reading from Firestore:', error);
  }
}

readData();

export { firestore };
