// src/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    // em Cloud Functions / Cloud Run o credential é automático
    // se você quiser pode deixar sem passar "credential"
    storageBucket: "tcc2026-7d3c4.firebasestorage.app",
    // se usar Realtime DB, pode colocar databaseURL aqui também
    // databaseURL: "https://kva-esquemas-services.firebaseio.com",
  });
}

// helpers opcionais (singletons)
const db = admin.firestore();
const bucket = admin.storage().bucket();

export { admin, db, bucket };
