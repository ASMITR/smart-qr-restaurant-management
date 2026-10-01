import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { initializeFirestore, Firestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

function getFirebaseDb(): Firestore {
  const app = getFirebaseApp();
  if (typeof window === "undefined") {
    return initializeFirestore(app, {});
  }
  return initializeFirestore(app, {
    cache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export const getFirebaseAuth = (): Auth => getAuth(getFirebaseApp());
export const getFirebaseStorage = (): FirebaseStorage => getStorage(getFirebaseApp());

export const auth: Auth = getFirebaseAuth();
export const db: Firestore = getFirebaseDb();
export const storage: FirebaseStorage = getFirebaseStorage();

export default { auth, db, storage };
