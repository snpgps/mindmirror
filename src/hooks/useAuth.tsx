
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

  const isProcessingAuthRef = useRef(isProcessingAuth);
  const initialAuthResolvedRef = useRef(false); 

  useEffect(() => {
    isProcessingAuthRef.current = isProcessingAuth;
  }, [isProcessingAuth]);

  const updateUserInContext = useCallback(async (updatedProfileData: Partial<User>) => {
    const currentUserAuth = getAuth().currentUser; 
    if (!currentUserAuth?.uid) return; 

    const userDocRef = doc(db, "users", currentUserAuth.uid);
    try {
      await updateDoc(userDocRef, updatedProfileData);
      setUser(currentContextUser => {
        if (!currentContextUser || currentContextUser.id !== currentUserAuth.uid) return currentContextUser; 
        
        const newUserData = { ...currentContextUser, ...updatedProfileData };
        
        // Check if actual data changed to prevent unnecessary state updates
        let changed = false;
        if (currentContextUser.id !== newUserData.id ||
            currentContextUser.email !== newUserData.email ||
            currentContextUser.name !== newUserData.name ||
            currentContextUser.role !== newUserData.role) {
          changed = true;
        } else if (newUserData.role === 'patient' && (newUserData as Patient).linkedDoctorCode !== (currentContextUser as Patient)?.linkedDoctorCode) {
          changed = true;
        } else if (newUserData.role === 'doctor' && (newUserData as Doctor).doctorCode !== (currentContextUser as Doctor)?.doctorCode) {
          changed = true;
        }

        return changed ? newUserData : currentContextUser;
      });
    } catch (error) {
        console.error("Error updating user profile in Firestore or context:", error);
    }
  }, []); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserType | null) => {
      let needsInitialLoadingUpdate = !initialAuthResolvedRef.current;

      if (needsInitialLoadingUpdate) {
          setLoading(true); 
      }

      let appUser: User | null = null;

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          let userProfileSnap = await getDoc(userDocRef);
          const providerId = firebaseUser.providerData?.[0]?.providerId;

          if (!userProfileSnap.exists() && providerId === 'password') {
            // Retry logic for new email signups if doc isn't immediately found
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
        } catch (error) {
            console.error("Error in onAuthStateChanged processing user profile:", error);
            await signOut(auth);
            appUser = null;
        }
      }
      
      setUser(currentContextUser => {
        if (appUser) {
          if (!currentContextUser ||
              currentContextUser.id !== appUser.id ||
              currentContextUser.email !== appUser.email ||
              currentContextUser.name !== appUser.name ||
              currentContextUser.role !== appUser.role ||
              (appUser.role === 'patient' && (appUser as Patient).linkedDoctorCode !== (currentContextUser as Patient)?.linkedDoctorCode) ||
              (appUser.role === 'doctor' && (appUser as Doctor).doctorCode !== (currentContextUser as Doctor)?.doctorCode)
            ) {
            return appUser; // Only update if different
          }
          return currentContextUser; // No change
        }
        return null; // If appUser is null, set context user to null
      });


      if (needsInitialLoadingUpdate) {
          setLoading(false);
          initialAuthResolvedRef.current = true;
      }

      if (!isProcessingAuthRef.current && initialAuthResolvedRef.current) {
        const currentPath = window.location.pathname;
        if (appUser) {
          if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
              let redirectPath = '/';
              if (appUser.role === 'patient') redirectPath = '/patient/dashboard';
              else if (appUser.role === 'doctor') redirectPath = '/doctor/dashboard';
              
              if (redirectPath !== '/') {
                setTimeout(() => router.push(redirectPath), 0);
              }
          }
        } else { 
            if (currentPath.startsWith('/patient') || currentPath.startsWith('/doctor')) {
                setTimeout(() => router.push('/login'), 0);
            }
        }
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, updateUserInContext]); 

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    await new Promise(resolve => setTimeout(resolve, 50)); // Brief delay for UI update
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle user state update and navigation
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
      
      setUser(currentContextUser => { // Functional update to avoid stale closure issues if any
        if (userProfileData && (!currentContextUser || currentContextUser.id !== userProfileData.id)) {
           return userProfileData as User;
        }
        return currentContextUser;
      });

      // Post-signup delay and navigation
      await new Promise(resolve => setTimeout(resolve, 2500)); 

      if (userProfileData.role === 'patient') {
        router.push('/patient/dashboard');
      } else if (userProfileData.role === 'doctor') {
        router.push('/doctor/dashboard');
      }

    } catch (error: any) {
      console.error("Email Sign-Up error:", error);
      setUser(null); 
      throw error; 
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsProcessingAuth(true);
    await new Promise(resolve => setTimeout(resolve, 50)); // Brief delay for UI update
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle user state update and navigation
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
      setUser(null); 
      router.push('/login'); 
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
      isAuthenticated: !!user && initialAuthResolvedRef.current, 
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

