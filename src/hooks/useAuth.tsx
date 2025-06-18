
"use client";
import type { User, UserRole, Patient, Doctor } from '@/lib/types';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseAuthProfile, // Renamed to avoid conflict
  type User as FirebaseUserType
} from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProcessingAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: UserRole, doctorCode?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserInContext: (updatedProfileData: Partial<User>) => Promise<void>; // Now async
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const router = useRouter();

  const updateUserInContext = useCallback(async (updatedProfileData: Partial<User>) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.id);
    await updateDoc(userDocRef, updatedProfileData);
    
    setUser(currentUser => {
      if (!currentUser) return null;
      const newUserData = { ...currentUser, ...updatedProfileData };
      // localStorage.setItem(`mindmirror-profile-${newUserData.id}`, JSON.stringify(newUserData)); // Optionally update localStorage cache
      return newUserData;
    });
  }, [user]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserType | null) => {
      setLoading(true);
      setIsProcessingAuth(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        let appUser: User | null = null;

        try {
          const userProfileSnap = await getDoc(userDocRef);

          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data() as any;
            appUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || profileData.email || '',
              name: firebaseUser.displayName || profileData.name || 'User',
              role: profileData.role as UserRole,
              ...(profileData.role === 'patient' && { linkedDoctorCode: profileData.linkedDoctorCode }),
              ...(profileData.role === 'doctor' && { doctorCode: profileData.doctorCode }),
            };
          } else {
            // New user (e.g. first Google Sign-In) or Firestore doc missing. Create it.
            const defaultRole: UserRole = 'patient';
            const name = firebaseUser.displayName || 'New User';
            const email = firebaseUser.email || '';
            
            const newUserFirestoreData: User = { 
              id: firebaseUser.uid, 
              name, 
              email, 
              role: defaultRole 
            };
            
            await setDoc(userDocRef, newUserFirestoreData);
            appUser = newUserFirestoreData;
          }
          setUser(appUser);

          if (appUser && (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/')) {
              if (appUser.role === 'patient') router.push('/patient/dashboard');
              else if (appUser.role === 'doctor') router.push('/doctor/dashboard');
          }
        } catch (error) {
            console.error("Error fetching/creating user profile in Firestore:", error);
            // Potentially sign out the user if profile can't be established
            await signOut(auth);
            setUser(null);
            router.push('/login');
        }

      } else {
        setUser(null);
        if (window.location.pathname.startsWith('/patient') || window.location.pathname.startsWith('/doctor')) {
            router.push('/login');
        }
      }
      setLoading(false);
      setIsProcessingAuth(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle fetching/creating Firestore doc, setting user, and redirecting
    } catch (error: any) {
      console.error("Google Sign-In error", error);
      throw error; 
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role: UserRole, doctorCode?: string) => {
    setIsProcessingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateFirebaseAuthProfile(userCredential.user, { displayName: name });
      
      const userProfileData: User | Doctor | Patient = {
        id: userCredential.user.uid,
        name,
        email,
        role,
        ...(role === 'doctor' && doctorCode && { doctorCode }),
        ...(role === 'patient' && { linkedDoctorCode: undefined }), // Explicitly patient
      };
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, userProfileData);
      // onAuthStateChanged will set the user state and handle redirect.
    } catch (error: any) {
      console.error("Email Sign-Up error", error);
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsProcessingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      console.error("Email Sign-In error", error);
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const logoutUser = async () => {
    setIsProcessingAuth(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null and handle redirect.
    } catch (error: any) {
      console.error("Sign Out error", error);
    } finally {
      setIsProcessingAuth(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated: !!user && !loading, 
      isProcessingAuth,
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout: logoutUser,
      updateUserInContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

