const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const firebaseConfig = { 
  apiKey: "AIzaSyAh6lHuzw3mX9zdLCoZHRAmOhppstL4eZs", 
  authDomain: "signal-9b3b9.firebaseapp.com", 
  projectId: "signal-9b3b9", 
  storageBucket: "signal-9b3b9.firebasestorage.app", 
  messagingSenderId: "885495058474", 
  appId: "1:885495058474:web:a73bd8ad20a265c5393353" 
}; 

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Export firebase as 'admin' to maintain compatibility with existing code
// that expects admin.firestore.Timestamp
module.exports = { admin: firebase, db };