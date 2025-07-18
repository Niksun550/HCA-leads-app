// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaFXEXzCXrZwuwpCxPz-5PujHi_nkazRU",
  authDomain: "hca-crm.firebaseapp.com",
  projectId: "hca-crm",
  storageBucket: "hca-crm.appspot.com",
  messagingSenderId: "306976606112",
  appId: "1:306976606112:web:46fc94412fc7c1f91d46c5"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
