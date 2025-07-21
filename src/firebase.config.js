import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBBirZrK5TJAOHJgE7WFvTFd4YPfhSXHPU",
  authDomain: "hetzmyshops.firebaseapp.com",
  projectId: "hetzmyshops",
  storageBucket: "hetzmyshops.appspot.com",
  messagingSenderId: "139023693070",
  appId: "1:139023693070:web:6ecd482d3e4917eba4135f",
  measurementId: "G-1YPRHCPFRK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { db, auth, analytics };
