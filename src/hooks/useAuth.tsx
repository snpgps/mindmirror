
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
  const pendingUserProfileDataRef = useRef<PendingUserProfile | null>(null);
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
      setIsProcessingAuth(true); // Indicates active processing of auth state
      let appUser: User | null = null; 

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          let userProfileSnap = await getDoc(userDocRef);

          if (!userProfileSnap.exists()) {
            const pendingData = pendingUserProfileDataRef.current;
            if (pendingData && pendingData.uid === firebaseUser.uid) {
              console.log(`onAuthStateChanged: Creating Firestore doc for new user ${firebaseUser.uid} using pending data.`);
              const { name, email, role, doctorCode } = pendingData;
              let firestoreData: Patient | Doctor;
              if (role === 'doctor') {
                firestoreData = { id: firebaseUser.uid, name, email, role, doctorCode: doctorCode! };
              } else {
                firestoreData = { id: firebaseUser.uid, name, email, role };
              }
              await setDoc(userDocRef, firestoreData);
              appUser = firestoreData as User;
              setUser(appUser); 
              pendingUserProfileDataRef.current = null; // Clear pending data AFTER successful use
              userProfileSnap = await getDoc(userDocRef); // Re-fetch snap (optional, appUser is set)
            } else {
              // No existing doc AND no (or non-matching) pending data
              const providerId = firebaseUser.providerData?.[0]?.providerId;
              if (providerId === 'google.com') {
                console.log(`onAuthStateChanged: Creating Firestore doc for new Google user ${firebaseUser.uid}`);
                const defaultRole: UserRole = 'patient';
                const name = firebaseUser.displayName || 'New User';
                const email = firebaseUser.email || '';
                const newUserFirestoreData: Patient = { id: firebaseUser.uid, name, email, role: defaultRole };
                await setDoc(userDocRef, newUserFirestoreData);
                appUser = newUserFirestoreData;
                setUser(appUser);
              } else if (providerId === 'password') {
                 console.error(`CRITICAL: Firestore document for email user ${firebaseUser.uid} is missing and no (or non-matching) pending data. Signing out.`);
                 await signOut(auth); // This will re-trigger onAuthStateChanged with firebaseUser = null
                 // setUser(null) and pendingUserProfileDataRef.current = null will be handled by the 'else' block below
                 // No appUser here.
              } else {
                console.warn(`User ${firebaseUser.uid} authenticated with unhandled provider ${providerId}. Firestore document missing. Signing out.`);
                await signOut(auth);
              }
            }
          }

          if (userProfileSnap.exists()) { // Check again, might have been created above
            const profileData = userProfileSnap.data() as any; 
            // Ensure appUser is only set if not already handled by pendingData logic or if data is different
            const potentialAppUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || profileData.email || '',
              name: firebaseUser.displayName || profileData.name || 'User',
              role: profileData.role as UserRole,
              ...(profileData.role === 'patient' && { linkedDoctorCode: profileData.linkedDoctorCode }),
              ...(profileData.role === 'doctor' && { doctorCode: profileData.doctorCode }),
            };
            if (!appUser || JSON.stringify(appUser) !== JSON.stringify(potentialAppUser)) {
                appUser = potentialAppUser;
                setUser(appUser);
            }
          }
          
          // Redirection logic
          if (appUser && (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/')) {
              if (appUser.role === 'patient') router.push('/patient/dashboard');
              else if (appUser.role === 'doctor') router.push('/doctor/dashboard');
          }

        } catch (error) {
            console.error("Error in onAuthStateChanged processing user profile:", error);
            await signOut(auth); // Sign out on error to prevent inconsistent state
            // setUser(null) and pendingUserProfileDataRef.current = null handled by subsequent onAuthStateChanged
            appUser = null;
        }
      } else { // No firebaseUser (logged out)
        setUser(null);
        appUser = null;
        pendingUserProfileDataRef.current = null; // Clear pending data on logout
        if (window.location.pathname.startsWith('/patient') || window.location.pathname.startsWith('/doctor')) {
            router.push('/login');
        }
      }
      setLoading(false);
      setIsProcessingAuth(false); // Finished processing this auth state change
    });
    return () => unsubscribe();
  // Minimal dependencies: router is stable, updateUserInContext is memoized but its change doesn't affect the core listener logic for new signups.
  }, [router, updateUserInContext]); 

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    pendingUserProfileDataRef.current = null; 
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Sign-In error", error);
      // setUser(null) will be handled by onAuthStateChanged if auth fails/reverts
      throw error; 
    } finally {
      // setIsProcessingAuth(false) will be handled by onAuthStateChanged
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role: UserRole, doctorCode?: string) => {
    setIsProcessingAuth(true);
    pendingUserProfileDataRef.current = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newAuthUser = userCredential.user;
      await updateFirebaseAuthProfile(newAuthUser, { displayName: name });
      
      pendingUserProfileDataRef.current = {
        uid: newAuthUser.uid,
        name: name, 
        email: newAuthUser.email!,
        role: role,
        doctorCode: role === 'doctor' ? doctorCode : undefined,
      };
      // onAuthStateChanged will handle Firestore document creation and setting the user state.
    } catch (error: any) {
      console.error("Email Sign-Up error (Auth step):", error);
      pendingUserProfileDataRef.current = null; // Clear on error
      throw error; 
    } finally {
      // setIsProcessingAuth(false) will be handled by onAuthStateChanged after this auth event is processed
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsProcessingAuth(true);
    pendingUserProfileDataRef.current = null;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Email Sign-In error", error);
      throw error;
    } finally {
      // setIsProcessingAuth(false) will be handled by onAuthStateChanged
    }
  };

  const logoutUser = async () => {
    setIsProcessingAuth(true); // Indicate start of logout process
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null and clear pending data
    } catch (error: any) {
      console.error("Sign Out error", error);
      // Even on error, onAuthStateChanged should reflect the (possibly unchanged) auth state.
      // If user remains, then processing will conclude normally. If logout succeeded despite error, it's also handled.
    } finally {
       // setIsProcessingAuth(false) will be handled by the onAuthStateChanged triggered by signOut
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
