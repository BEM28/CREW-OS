import admin from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// In AI studio, we initialize using the applet config
const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const configContent = fs.readFileSync(configPath, "utf-8");
const config = JSON.parse(configContent);

let app;
if (!getApps().length) {
  // If FIREBASE_ADMIN_PRIVATE_KEY is present (from env), use cert.
  // Otherwise, fallback to default initialization (Application Default Credentials in Cloud Run)
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    app = initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || config.projectId,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      databaseURL: `https://${config.projectId}.firebaseio.com`,
    });
  } else {
    app = initializeApp({
      projectId: config.projectId,
      databaseURL: `https://${config.projectId}.firebaseio.com`,
    });
  }
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, config.firestoreDatabaseId);

