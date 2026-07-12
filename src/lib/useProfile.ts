import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'employee';
  farmId?: string;
  farmDetailsCompleted?: boolean;
  farmDetails?: {
    farmName: string;
    location: string;
    sizeAcres: number;
    primaryProduction: string;
    estimatedCattle: number;
    waterSource: string;
    phone: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    ownerDesignation?: string;
  };
}

export const DEFAULT_SAVANNA_PROFILE = {
  email: "owner@savanna.pro",
  displayName: "SAVANNA OWNER",
  role: 'owner' as const,
  farmDetailsCompleted: true,
  farmDetails: {
    farmName: "SAVANNA FARM",
    location: "SAVANNA RIFT VALLEY",
    sizeAcres: 1200,
    primaryProduction: "Dairy Production",
    estimatedCattle: 450,
    waterSource: "Borehole",
    phone: "+254 700 123 456",
    ownerName: "SAVANNA OWNER",
    ownerPhone: "+254 700 123 456",
    ownerEmail: "owner@savanna.pro",
    ownerDesignation: "Farm Owner",
  }
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const unbind = auth.onAuthStateChanged((user) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribe = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
            setLoading(false);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              farmId: user.uid,
              ...DEFAULT_SAVANNA_PROFILE
            };
            setDoc(userDocRef, newProfile).catch((err) => {
              console.error("Auto profile creation failed:", err);
            });
            setProfile(newProfile);
            setLoading(false);
          }
        }, (err) => {
          console.error("Error subscribing to user profile:", err);
          // Fallback on error so app stays functional
          setProfile({
            uid: user.uid,
            farmId: user.uid,
            ...DEFAULT_SAVANNA_PROFILE
          });
          setLoading(false);
        });
      } else {
        // Safe immediate default during loading or unauthenticated periods
        setProfile({
          uid: "savanna_default_operator",
          farmId: "savanna_default_operator",
          ...DEFAULT_SAVANNA_PROFILE
        });
        setLoading(false);
      }
    });

    return () => {
      unbind();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { profile, loading };
}
