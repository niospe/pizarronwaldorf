const firebaseConfig = {
  apiKey: "AIzaSyDrG5B6XPsb0e9nkm_hTCd7_S1K3IjV4u4",
  authDomain: "pizazzorwal.firebaseapp.com",
  databaseURL: "https://pizazzorwal-default-rtdb.firebaseio.com",
  projectId: "pizazzorwal",
  storageBucket: "pizazzorwal.firebasestorage.app",
  messagingSenderId: "1083103657491",
  appId: "1:1083103657491:web:124884b5bc9cd9b83249e6",
  measurementId: "G-F8YYNJNLV8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
