import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Enable persistence for offline access (Robust Multi-Tab & Single-Tab support)
enableMultiTabIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore offline persistence fallback (multiple tabs open). Trying single tab persistence...");
      enableIndexedDbPersistence(db).catch((e) => {
        console.error("Firestore single-tab persistence failed:", e);
      });
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support all features required for offline persistence.");
    } else {
      console.error("Firestore offline store persistence error: ", err);
    }
  });

const originalAuth = getAuth(app);
const originalOnAuthStateChanged = originalAuth.onAuthStateChanged.bind(originalAuth);

const authListeners = new Set<(user: any) => void>();

export const auth = new Proxy(originalAuth, {
  get(target: any, prop: string | symbol, receiver: any) {
    if (prop === 'currentUser') {
      const stored = localStorage.getItem('custom_employee_profile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            uid: parsed.uid,
            displayName: parsed.displayName,
            email: parsed.email || '',
            isAnonymous: false,
            emailVerified: false,
          };
        } catch (e) {}
      }
      if (target.currentUser) {
        return {
          ...target.currentUser,
          uid: target.currentUser.uid,
          displayName: target.currentUser.displayName || "SAVANNA OPERATOR",
          email: target.currentUser.email || "operator@savanna.pro",
          isAnonymous: true,
          emailVerified: true,
        };
      }
      return {
        uid: "savanna_default_operator",
        displayName: "SAVANNA OPERATOR",
        email: "operator@savanna.pro",
        isAnonymous: true,
        emailVerified: true,
      };
    }

    if (prop === 'onAuthStateChanged') {
      return (nextOrObserver: any, error: any, completed: any) => {
        const callback = typeof nextOrObserver === 'function' ? nextOrObserver : nextOrObserver?.next;
        
        if (callback) {
          authListeners.add(callback);
          
          // Initial callback fire
          const stored = localStorage.getItem('custom_employee_profile');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              callback({
                uid: parsed.uid,
                displayName: parsed.displayName,
                email: parsed.email || '',
              });
            } catch (e) {
              const u = target.currentUser;
              callback(u ? {
                ...u,
                uid: u.uid,
                displayName: u.displayName || "SAVANNA OPERATOR",
                email: u.email || "operator@savanna.pro",
              } : {
                uid: "savanna_default_operator",
                displayName: "SAVANNA OPERATOR",
                email: "operator@savanna.pro",
              });
            }
          } else {
            const u = target.currentUser;
            callback(u ? {
              ...u,
              uid: u.uid,
              displayName: u.displayName || "SAVANNA OPERATOR",
              email: u.email || "operator@savanna.pro",
            } : {
              uid: "savanna_default_operator",
              displayName: "SAVANNA OPERATOR",
              email: "operator@savanna.pro",
            });
          }
        }

        const realUnsub = originalOnAuthStateChanged((user) => {
          const stored = localStorage.getItem('custom_employee_profile');
          if (!stored) {
            if (callback) {
              if (user) {
                callback({
                  ...user,
                  uid: user.uid,
                  displayName: user.displayName || "SAVANNA OPERATOR",
                  email: user.email || "operator@savanna.pro",
                });
              } else {
                callback({
                  uid: "savanna_default_operator",
                  displayName: "SAVANNA OPERATOR",
                  email: "operator@savanna.pro",
                });
              }
            }
          }
        }, error, completed);

        return () => {
          if (callback) authListeners.delete(callback);
          realUnsub();
        };
      };
    }

    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  },
  set(target: any, prop: string | symbol, value: any, receiver: any) {
    if (prop === 'currentUser') {
      return true;
    }
    return Reflect.set(target, prop, value, receiver);
  }
}) as any;

export const triggerAuthNotification = () => {
  const stored = localStorage.getItem('custom_employee_profile');
  let user: any = null;
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      user = {
        uid: parsed.uid,
        displayName: parsed.displayName,
        email: parsed.email || '',
      };
    } catch (e) {}
  } else {
    user = originalAuth.currentUser || {
      uid: "savanna_default_operator",
      displayName: "SAVANNA OPERATOR",
      email: "operator@savanna.pro",
    };
  }
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (e) {
      console.error(e);
    }
  });
};
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signOut 
};
