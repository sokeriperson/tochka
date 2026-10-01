// firebase-config.js
// Проект: tochka-a1f4f

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4EyBt5MEm7ZdcmU0GmEi9nBHUXatGt8Q",
    authDomain: "tochka-a1f4f.firebaseapp.com",
    projectId: "tochka-a1f4f",
    storageBucket: "tochka-a1f4f.firebasestorage.app",
    messagingSenderId: "396713835081",
    appId: "1:396713835081:web:f27049f4a73284c18c9d98",
    measurementId: "G-QBVR0W1GSW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

isSupported().then((supported) => {
    if (supported) getAnalytics(app);
});