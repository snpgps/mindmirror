
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
  updateProfile as updateFirebaseAuthProfile,
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
  updateUserInContext: (updatedProfileData: Partial<User>) => Promise<void>;
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
      return newUserData;
    });
  }, [user]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserType | null) => {
      setLoading(true);
      setIsProcessingAuth(true);
      let appUser: User | null = null; // User object derived within this listener

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
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
            setUser(appUser); // Sync context with Firestore doc
          } else {
            // Firestore document doesn't exist
            const providerId = firebaseUser.providerData?.[0]?.providerId;

            if (providerId === 'google.com') {
              // First-time Google sign-in, create default patient profile
              console.log(`Creating new patient profile for Google user: ${firebaseUser.uid}`);
              const defaultRole: UserRole = 'patient';
              const name = firebaseUser.displayName || 'New User';
              const email = firebaseUser.email || '';
              
              const newUserFirestoreData: Patient = { 
                id: firebaseUser.uid, 
                name, 
                email, 
                role: defaultRole 
                // linkedDoctorCode will be absent by default
              };
              
              await setDoc(userDocRef, newUserFirestoreData);
              appUser = newUserFirestoreData;
              setUser(appUser); // Set the newly created user in context
            } else if (providerId === 'password') {
              // Password user's document is missing. This is unexpected if signup was successful.
              console.error(`Firestore document for email user ${firebaseUser.uid} is missing. This should have been created during signup. User will be signed out.`);
              await signOut(auth); 
              appUser = null; 
              setUser(null); // Explicitly set context user to null
            } else {
              console.warn(`User ${firebaseUser.uid} authenticated with an unknown or missing provider: ${providerId}. Firestore document missing. User will be signed out.`);
              await signOut(auth); 
              appUser = null;
              setUser(null); // Explicitly set context user to null
            }
          }
          
          // Redirection logic based on appUser determined in this listener
          if (appUser && (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/')) {
              if (appUser.role === 'patient') router.push('/patient/dashboard');
              else if (appUser.role === 'doctor') router.push('/doctor/dashboard');
          }

        } catch (error) {
            console.error("Error processing user profile in Firestore (onAuthStateChanged):", error);
            await signOut(auth);
            setUser(null);
            appUser = null;
        }
      } else {
        // firebaseUser is null (logged out)
        setUser(null);
        appUser = null;
        if (window.location.pathname.startsWith('/patient') || window.location.pathname.startsWith('/doctor')) {
            router.push('/login');
        }
      }
      setLoading(false);
      setIsProcessingAuth(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Removed `user` from dependency array to avoid re-triggering on setUser from signUpWithEmail

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      console.error("Google Sign-In error", error);
      setUser(null);
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
        ...(role === 'doctor' && doctorCode ? { doctorCode } : {}),
      };
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, userProfileData);
      
      // Directly set the user in context after successful signup and Firestore write
      setUser(userProfileData as User); 

    } catch (error: any) {
      console.error("Email Sign-Up error", error);
      setUser(null); 
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
      setUser(null);
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const logoutUser = async () => {
    setIsProcessingAuth(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null and handle redirection
    } catch (error: any) {
      console.error("Sign Out error", error);
    } finally {
      // setUser(null) will be handled by onAuthStateChanged
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

