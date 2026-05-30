import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

let app;
let db: any = null;
let auth: any = null;
const isFirebaseSupported = true;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
  console.log("Firebase initialized successfully on active Cloud Database.");
} catch (e) {
  console.error("Failed to initialize Firebase, falling back to offline simulation:", e);
}

export { db, auth, isFirebaseSupported };

/**
 * Custom compliance error handler for Firestore permissions as required by system skill
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || "anonymous_local",
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.error("Firestore Error Detailed: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Authmanger helper for anonymous session setup
 */
export async function ensureReadyUser(): Promise<{ uid: string; name: string } | null> {
  if (!isFirebaseSupported || !auth) {
    // Return a stable local-storage session UID for local testing
    let localUid = localStorage.getItem("couples_local_uid");
    if (!localUid) {
      localUid = "usr_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("couples_local_uid", localUid);
    }
    return { uid: localUid, name: "Partner" };
  }

  try {
    if (!auth.currentUser) {
      const credential = await signInAnonymously(auth);
      return { uid: credential.user.uid, name: "Partner" };
    }
    return { uid: auth.currentUser.uid, name: "Partner" };
  } catch (error) {
    console.error("Anonymous authentication failed, using local fallback:", error);
    let localUid = localStorage.getItem("couples_local_uid");
    if (!localUid) {
      localUid = "usr_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("couples_local_uid", localUid);
    }
    return { uid: localUid, name: "Partner" };
  }
}
