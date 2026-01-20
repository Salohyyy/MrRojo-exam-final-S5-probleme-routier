import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuration Firebase à renseigner avec les valeurs de ton projet
const firebaseConfig = {
  apiKey: "AIzaSyAh6lHuzw3mX9zdLCoZHRAmOhppstL4eZs",
  authDomain: "signal-9b3b9.firebaseapp.com",
  projectId: "signal-9b3b9",
  storageBucket: "signal-9b3b9.firebasestorage.app",
  messagingSenderId: "885495058474",
  appId: "1:885495058474:web:a73bd8ad20a265c5393353"
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

