import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { 
  getFirestore, 
  doc as fDoc,
  collection as fCollection,
  setDoc as fSetDoc, 
  updateDoc as fUpdateDoc,
  getDoc as fGetDoc, 
  getDocs as fGetDocs, 
  onSnapshot as fOnSnapshot,
  addDoc as fAddDoc,
  deleteDoc as fDeleteDoc
} from "firebase/firestore";
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

let app: any;
let db: any = null;
let auth: any = null;
let isFirebaseSupported = false;
let forceDefaultDb = false;

try {
  app = initializeApp(firebaseConfig);
  isFirebaseSupported = true;
  
  // Independent Auth Initialization
  try {
    auth = getAuth(app);
    console.log("Firebase Auth initialized successfully.");
  } catch (authErr) {
    console.error("Firebase Auth failed to initialize:", authErr);
  }

  // Resilient Dual-Mode Firestore Initialization
  try {
    if (firebaseConfig.firestoreDatabaseId) {
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      console.log(`Firestore initialized with custom database ID: ${firebaseConfig.firestoreDatabaseId}`);
    } else {
      db = getFirestore(app);
      console.log("Firestore initialized with default database ID.");
    }
  } catch (dbErr) {
    console.warn("Firestore with custom database ID failed. Trying default database...", dbErr);
    try {
      db = getFirestore(app);
      console.log("Firestore fallback to default database successful.");
    } catch (defaultDbErr) {
      console.error("Firestore completely failed to initialize:", defaultDbErr);
    }
  }
} catch (e) {
  console.error("Failed to initialize Firebase, falling back to offline simulation:", e);
}

// Resilient helper to fetch active Firestore instance
export function getActiveDb() {
  if (!isFirebaseSupported || !app) return null;
  if (forceDefaultDb) {
    return getFirestore(app);
  }
  return db;
}

// Resilient doc and collection builders
export function doc(reference: any, path: string, ...segments: string[]) {
  const activeDb = getActiveDb();
  if (!activeDb) return null;
  // If the first argument is a Firestore db instance, replace it with getActiveDb()
  if (reference && reference.databaseId) {
    return fDoc(activeDb, path, ...segments);
  }
  return fDoc(reference, path, ...segments);
}

export function collection(reference: any, path: string, ...segments: string[]) {
  const activeDb = getActiveDb();
  if (!activeDb) return null;
  if (reference && reference.databaseId) {
    return fCollection(activeDb, path, ...segments);
  }
  return fCollection(reference, path, ...segments);
}

// Helper to adapt standard Firestore document or collection references to fallback DB
function adaptReference(ref: any) {
  if (!ref) return ref;
  if (!forceDefaultDb) return ref;
  
  const activeDb = getActiveDb();
  if (!activeDb) return ref;
  
  if (ref.firestore && ref.firestore.databaseId && ref.firestore.databaseId.database === activeDb.databaseId.database) {
    return ref;
  }
  
  try {
    if (ref.type === "document") {
      return fDoc(activeDb, ref.path);
    } else if (ref.type === "collection") {
      return fCollection(activeDb, ref.path);
    }
  } catch (err) {
    console.error("Failed to adapt reference to default database:", err);
  }
  return ref;
}

// Wrapper Firestore Methods
export async function updateDoc(ref: any, data: any) {
  try {
    const adaptedRef = adaptReference(ref);
    return await fUpdateDoc(adaptedRef, data);
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const shouldFallback = errorStr.includes("not found") || 
                           errorStr.includes("permission") || 
                           errorStr.includes("database") || 
                           errorStr.includes("not-found") ||
                           errorStr.includes("unauthorized") ||
                           errorStr.includes("cancelled");
    
    if (!forceDefaultDb && shouldFallback) {
      console.warn("Custom firestore update failed. Falling back to default database...", error);
      forceDefaultDb = true;
      try {
        const adaptedRef = adaptReference(ref);
        return await fUpdateDoc(adaptedRef, data);
      } catch (fallbackError) {
        console.error("Default firestore update fallback failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function setDoc(ref: any, data: any, options?: any) {
  try {
    const adaptedRef = adaptReference(ref);
    return await (options ? fSetDoc(adaptedRef, data, options) : fSetDoc(adaptedRef, data));
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const shouldFallback = errorStr.includes("not found") || 
                           errorStr.includes("permission") || 
                           errorStr.includes("database") || 
                           errorStr.includes("not-found") ||
                           errorStr.includes("unauthorized") ||
                           errorStr.includes("cancelled");
    
    if (!forceDefaultDb && shouldFallback) {
      console.warn("Custom firestore write failed. Falling back to default database...", error);
      forceDefaultDb = true;
      try {
        const adaptedRef = adaptReference(ref);
        return await (options ? fSetDoc(adaptedRef, data, options) : fSetDoc(adaptedRef, data));
      } catch (fallbackError) {
        console.error("Default firestore write fallback failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function getDoc(ref: any) {
  try {
    const adaptedRef = adaptReference(ref);
    return await fGetDoc(adaptedRef);
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const shouldFallback = errorStr.includes("not found") || 
                           errorStr.includes("permission") || 
                           errorStr.includes("database") || 
                           errorStr.includes("not-found") ||
                           errorStr.includes("unauthorized") ||
                           errorStr.includes("cancelled");
    
    if (!forceDefaultDb && shouldFallback) {
      console.warn("Custom firestore read failed. Falling back to default database...", error);
      forceDefaultDb = true;
      try {
        const adaptedRef = adaptReference(ref);
        return await fGetDoc(adaptedRef);
      } catch (fallbackError) {
        console.error("Default firestore read fallback failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function getDocs(queryRef: any) {
  try {
    const adaptedRef = adaptReference(queryRef);
    return await fGetDocs(adaptedRef);
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const shouldFallback = errorStr.includes("not found") || 
                           errorStr.includes("permission") || 
                           errorStr.includes("database") || 
                           errorStr.includes("not-found") ||
                           errorStr.includes("unauthorized") ||
                           errorStr.includes("cancelled");
    
    if (!forceDefaultDb && shouldFallback) {
      console.warn("Custom firestore query failed. Falling back to default database...", error);
      forceDefaultDb = true;
      try {
        const adaptedRef = adaptReference(queryRef);
        return await fGetDocs(adaptedRef);
      } catch (fallbackError) {
        console.error("Default firestore query fallback failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function addDoc(collectionRef: any, data: any) {
  try {
    const adaptedRef = adaptReference(collectionRef);
    return await fAddDoc(adaptedRef, data);
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const shouldFallback = errorStr.includes("not found") || 
                           errorStr.includes("permission") || 
                           errorStr.includes("database") || 
                           errorStr.includes("not-found") ||
                           errorStr.includes("unauthorized") ||
                           errorStr.includes("cancelled");
    
    if (!forceDefaultDb && shouldFallback) {
      console.warn("Custom firestore add failed. Falling back to default database...", error);
      forceDefaultDb = true;
      try {
        const adaptedRef = adaptReference(collectionRef);
        return await fAddDoc(adaptedRef, data);
      } catch (fallbackError) {
        console.error("Default firestore add fallback failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function deleteDoc(ref: any) {
  try {
    const adaptedRef = adaptReference(ref);
    return await fDeleteDoc(adaptedRef);
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const shouldFallback = errorStr.includes("not found") || 
                           errorStr.includes("permission") || 
                           errorStr.includes("database") || 
                           errorStr.includes("not-found") ||
                           errorStr.includes("unauthorized") ||
                           errorStr.includes("cancelled");
    
    if (!forceDefaultDb && shouldFallback) {
      console.warn("Custom firestore delete failed. Falling back to default database...", error);
      forceDefaultDb = true;
      try {
        const adaptedRef = adaptReference(ref);
        return await fDeleteDoc(adaptedRef);
      } catch (fallbackError) {
        console.error("Default firestore delete fallback failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export function onSnapshot(ref: any, onNext: (snap: any) => void, onError?: (err: any) => void) {
  try {
    const adaptedRef = adaptReference(ref);
    return fOnSnapshot(adaptedRef, onNext, (err: any) => {
      const errorStr = String(err).toLowerCase();
      const shouldFallback = errorStr.includes("not found") || 
                             errorStr.includes("permission") || 
                             errorStr.includes("database") || 
                             errorStr.includes("not-found") ||
                             errorStr.includes("unauthorized") ||
                             errorStr.includes("cancelled");
      
      if (!forceDefaultDb && shouldFallback) {
        console.warn("Custom firestore snapshot failed. Re-subscribing with default database fallback...", err);
        forceDefaultDb = true;
        try {
          const adaptedRefFallback = adaptReference(ref);
          fOnSnapshot(adaptedRefFallback, onNext, onError);
        } catch (fallbackErr) {
          console.error("Default firestore snapshot fallback failed:", fallbackErr);
          if (onError) onError(fallbackErr);
        }
      } else {
        if (onError) onError(err);
      }
    });
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const shouldFallback = errorStr.includes("not found") || 
                           errorStr.includes("permission") || 
                           errorStr.includes("database") || 
                           errorStr.includes("not-found") ||
                           errorStr.includes("unauthorized") ||
                           errorStr.includes("cancelled");
    
    if (!forceDefaultDb && shouldFallback) {
      console.warn("Custom firestore snapshot subscription failed. Falling back to default database...", error);
      forceDefaultDb = true;
      try {
        const adaptedRef = adaptReference(ref);
        return fOnSnapshot(adaptedRef, onNext, onError);
      } catch (fallbackError) {
        console.error("Default firestore snapshot fallback subscription failed:", fallbackError);
        if (onError) onError(fallbackError);
      }
    }
    throw error;
  }
}

export { db, auth, isFirebaseSupported };

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
  console.warn("Firestore Error Captured: ", JSON.stringify(errInfo));
  
  // Make network connection hurdles resilient without crashing the UI
  const errorLower = errInfo.error.toLowerCase();
  const isNetworkOrFallbackError = 
    errorLower.includes("unavailable") || 
    errorLower.includes("could not reach") || 
    errorLower.includes("offline") || 
    errorLower.includes("connection failed") ||
    errorLower.includes("failed to connect") ||
    errorLower.includes("network") ||
    errorLower.includes("unreachable") ||
    errorLower.includes("permission"); // graceful fallback on permissions during offline state as well

  if (isNetworkOrFallbackError) {
    console.warn("Bypassed non-fatal Firestore network/permission hurdle gracefully to support offline local storage fallback.");
    return; // Don't throw - continue operating in offline cache mode
  }
  
  throw new Error(JSON.stringify(errInfo));
}

export async function ensureReadyUser(): Promise<{ uid: string; name: string } | null> {
  if (!isFirebaseSupported || !auth) {
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
