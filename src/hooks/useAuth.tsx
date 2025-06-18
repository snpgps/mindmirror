
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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Temporary state for pending profile data during signup
interface PendingUserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  doctorCode?: string;
}

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
  const [pendingUserProfileData, setPendingUserProfileData] = useState<PendingUserProfile | null>(null);
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
      let appUser: User | null = null; 

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          let userProfileSnap = await getDoc(userDocRef);

          if (!userProfileSnap.exists() && pendingUserProfileData && pendingUserProfileData.uid === firebaseUser.uid) {
            // This is a new email signup, create Firestore document now
            console.log(`onAuthStateChanged: Creating Firestore doc for new user ${firebaseUser.uid}`);
            const { name, email, role, doctorCode } = pendingUserProfileData;
            let firestoreData: Patient | Doctor;
            if (role === 'doctor') {
              firestoreData = { id: firebaseUser.uid, name, email, role, doctorCode: doctorCode! };
            } else {
              firestoreData = { id: firebaseUser.uid, name, email, role };
            }
            await setDoc(userDocRef, firestoreData);
            appUser = firestoreData as User;
            setUser(appUser);
            setPendingUserProfileData(null); // Clear pending data
            userProfileSnap = await getDoc(userDocRef); // Re-fetch snap after creation
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
            // If setUser was already called above for new signup, this might be redundant but ensures consistency
            if (!user || user.id !== appUser.id || user.role !== appUser.role) {
                 setUser(appUser);
            }
          } else {
            // Document still doesn't exist, handle Google new user or error cases
            const providerId = firebaseUser.providerData?.[0]?.providerId;

            if (providerId === 'google.com') {
              // First-time Google sign-in, create patient profile
              console.log(`onAuthStateChanged: Creating Firestore doc for new Google user ${firebaseUser.uid}`);
              const defaultRole: UserRole = 'patient';
              const name = firebaseUser.displayName || 'New User';
              const email = firebaseUser.email || '';
              const newUserFirestoreData: Patient = { id: firebaseUser.uid, name, email, role: defaultRole };
              await setDoc(userDocRef, newUserFirestoreData);
              appUser = newUserFirestoreData;
              setUser(appUser);
            } else if (providerId === 'password' && !pendingUserProfileData) {
              // Firestore doc missing for email user, and no pending data - this is an anomaly
              console.error(`CRITICAL: Firestore document for email user ${firebaseUser.uid} is missing and no pending data. Signing out.`);
              await signOut(auth);
              appUser = null;
              setUser(null);
            } else if (providerId !== 'password' && providerId !== 'google.com') {
              console.warn(`User ${firebaseUser.uid} authenticated with provider ${providerId}. Firestore document missing. Signing out.`);
              await signOut(auth);
              appUser = null;
              setUser(null);
            }
          }
          
          if (appUser && (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/')) {
              if (appUser.role === 'patient') router.push('/patient/dashboard');
              else if (appUser.role === 'doctor') router.push('/doctor/dashboard');
          }

        } catch (error) {
            console.error("Error in onAuthStateChanged processing user profile:", error);
            await signOut(auth);
            setUser(null);
            setPendingUserProfileData(null); // Clear pending data on error
            appUser = null;
        }
      } else { // No firebaseUser (logged out)
        setUser(null);
        appUser = null;
        setPendingUserProfileData(null); // Clear pending data on logout
        if (window.location.pathname.startsWith('/patient') || window.location.pathname.startsWith('/doctor')) {
            router.push('/login');
        }
      }
      setLoading(false);
      setIsProcessingAuth(false);
    });
    return () => unsubscribe();
  }, [router, updateUserInContext, pendingUserProfileData]); 

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    setPendingUserProfileData(null); // Clear any pending data
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle Firestore document creation/update
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
    setPendingUserProfileData(null); // Clear previous pending data
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newAuthUser = userCredential.user;
      await updateFirebaseAuthProfile(newAuthUser, { displayName: name });
      
      // Set pending data for onAuthStateChanged to pick up
      setPendingUserProfileData({
        uid: newAuthUser.uid,
        name: name, // Use name from form
        email: newAuthUser.email!, // Use email from auth object
        role: role,
        doctorCode: role === 'doctor' ? doctorCode : undefined,
      });
      // Note: We DO NOT call setUser or setDoc here directly.
      // onAuthStateChanged will handle Firestore document creation and setting the user state.

    } catch (error: any) {
      console.error("Email Sign-Up error in signUpWithEmail (Auth step):", error);
      // No user object to set to null here, as onAuthStateChanged handles user state
      throw error; // Re-throw to be caught by AuthForm
    } finally {
      setIsProcessingAuth(false); // This processing is for the auth step only
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsProcessingAuth(true);
    setPendingUserProfileData(null); // Clear any pending data
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle loading the user profile
    } catch (error: any) {
      console.error("Email Sign-In error", error);
      setUser(null); // Explicitly nullify on error before onAuthStateChanged runs
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const logoutUser = async () => {
    setIsProcessingAuth(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null
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
