
"use client";
import type { User, UserRole, Patient, Doctor } from '@/lib/types';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean; // For initial auth state resolution & passive changes
  isAuthenticated: boolean;
  isProcessingAuth: boolean; // For active sign-in/sign-up attempts
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

  // Ref to hold the current value of isProcessingAuth for use in onAuthStateChanged
  // This helps avoid stale closures without making onAuthStateChanged re-subscribe too often.
  const isProcessingAuthRef = useRef(isProcessingAuth);
  useEffect(() => {
    isProcessingAuthRef.current = isProcessingAuth;
  }, [isProcessingAuth]);

  const updateUserInContext = useCallback(async (updatedProfileData: Partial<User>) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.id);
    try {
      await updateDoc(userDocRef, updatedProfileData);
      setUser(currentUser => {
        if (!currentUser) return null;
        const newUserData = { ...currentUser, ...updatedProfileData };
        return newUserData;
      });
    } catch (error) {
        console.error("Error updating user profile in Firestore or context:", error);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserType | null) => {
      const activeProcessing = isProcessingAuthRef.current; // Use the ref's current value

      if (!activeProcessing) { // Only manage general `loading` if not actively processing an auth operation
        setLoading(true);
      }
      
      let appUser: User | null = null;

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          let userProfileSnap = await getDoc(userDocRef);
          const providerId = firebaseUser.providerData?.[0]?.providerId;

          // Retry logic for newly signed-up email users if doc isn't immediately found
          if (!userProfileSnap.exists() && providerId === 'password') {
            console.log(`onAuthStateChanged: Doc for email user ${firebaseUser.uid} not initially found. Retrying after delay...`);
            await new Promise(resolve => setTimeout(resolve, 750)); 
            userProfileSnap = await getDoc(userDocRef);
            if (userProfileSnap.exists()) {
              console.log(`onAuthStateChanged: Doc for email user ${firebaseUser.uid} found after delay.`);
            }
          }

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
            if (providerId === 'google.com') {
              console.log(`onAuthStateChanged: Creating Firestore doc for new Google user ${firebaseUser.uid}`);
              const defaultRole: UserRole = 'patient'; 
              const name = firebaseUser.displayName || 'New User';
              const email = firebaseUser.email || '';
              const newUserFirestoreData: Patient = { id: firebaseUser.uid, name, email, role: defaultRole };
              await setDoc(userDocRef, newUserFirestoreData);
              appUser = newUserFirestoreData;
            } else if (providerId === 'password') {
              console.error(`CRITICAL: Firestore document for email user ${firebaseUser.uid} is missing. This should have been created during signup. User will be signed out.`);
              await signOut(auth); 
              appUser = null; 
            } else {
              console.warn(`User ${firebaseUser.uid} authenticated with unhandled provider ${providerId}. Firestore document missing. Signing out.`);
              await signOut(auth);
              appUser = null;
            }
          }
          
          if (appUser) {
            setUser(appUser); // Set the user in context
            // Navigation logic - ensure not to redirect if an active process (like signup) is still indicated by isProcessingAuthRef
            if (!activeProcessing && (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/')) {
                if (appUser.role === 'patient') router.push('/patient/dashboard');
                else if (appUser.role === 'doctor') router.push('/doctor/dashboard');
            }
          } else {
             setUser(null); // Ensure user state is cleared if appUser couldn't be established
          }

        } catch (error) {
            console.error("Error in onAuthStateChanged processing user profile:", error);
            await signOut(auth); 
            appUser = null; 
            setUser(null);
        }
      } else { 
        setUser(null);
        appUser = null;
         // Navigation for logged-out users on protected routes
        if (!activeProcessing && (window.location.pathname.startsWith('/patient') || window.location.pathname.startsWith('/doctor'))) {
            router.push('/login');
        }
      }
      
      if (!activeProcessing) { // Only set general loading to false if we started it
        setLoading(false);
      }
    });
    return () => unsubscribe();
  // `router` and `updateUserInContext` are stable. `isProcessingAuthRef` is used to get current `isProcessingAuth` value.
  }, [router, updateUserInContext]); 

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting user and navigation
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
      const newAuthUser = userCredential.user;
      await updateFirebaseAuthProfile(newAuthUser, { displayName: name });
      
      const userDocRef = doc(db, "users", newAuthUser.uid);
      let userProfileData: Patient | Doctor;

      if (role === 'doctor') {
        if (!doctorCode) { 
          console.error("Doctor code missing during signup for doctor role.");
          throw new Error("Doctor code is required for doctor role.");
        }
        userProfileData = { id: newAuthUser.uid, name, email: newAuthUser.email!, role, doctorCode };
      } else {
        userProfileData = { id: newAuthUser.uid, name, email: newAuthUser.email!, role };
      }
      
      await setDoc(userDocRef, userProfileData); 
      console.log(`signUpWithEmail: Firestore doc set for ${newAuthUser.uid}. Setting user in context.`);
      
      setUser(userProfileData as User); 
      // Navigation will be handled by onAuthStateChanged based on the new user state, once isProcessingAuth is false.

    } catch (error: any) {
      console.error("Email Sign-Up error:", error);
      throw error; 
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsProcessingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and navigation
    } catch (error: any) {
      console.error("Email Sign-In error", error);
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const logoutUser = async () => {
    // setIsProcessingAuth(true); // Optional: if logout takes time or has UI effects
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null and handle navigation
    } catch (error: any) {
      console.error("Sign Out error", error);
    } finally {
      // setIsProcessingAuth(false); // Match if set to true at start
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated: !!user && !loading && !isProcessingAuth, // Adjusted isAuthenticated to consider isProcessingAuth
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

