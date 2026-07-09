// src/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    // Cloud Functions and Cloud Run provide credentials automatically.
    storageBucket: "tcc2026-7d3c4.firebasestorage.app",
    // Add databaseURL here too if Realtime Database is used.
  });
}

// Optional singleton helpers.
const db = admin.firestore();
const bucket = admin.storage().bucket();

export { admin, db, bucket };
