
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
  const [loading, setLoading] = useState(true); // For initial auth resolution
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
        
        // Deep comparison for relevant fields to decide if update is needed
        let changed = false;
        if (currentContextUser.name !== newUserData.name || currentContextUser.email !== newUserData.email || currentContextUser.role !== newUserData.role) {
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
      if (isProcessingAuthRef.current) { 
        return;
      }

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
      
      setUser(prevUser => {
        if (appUser) { 
          let changed = false;
          if (!prevUser) {
            changed = true;
          } else {
            if (prevUser.id !== appUser.id ||
                prevUser.email !== appUser.email ||
                prevUser.name !== appUser.name ||
                prevUser.role !== appUser.role) {
              changed = true;
            } else if (appUser.role === 'patient' && (appUser as Patient).linkedDoctorCode !== (prevUser as Patient)?.linkedDoctorCode) {
              changed = true;
            } else if (appUser.role === 'doctor' && (appUser as Doctor).doctorCode !== (prevUser as Doctor)?.doctorCode) {
              changed = true;
            }
          }
          return changed ? appUser : prevUser;
        } else { 
          return prevUser ? null : prevUser; 
        }
      });

      if (needsInitialLoadingUpdate) {
          setLoading(false);
          initialAuthResolvedRef.current = true;
      }

      const currentPath = window.location.pathname;
      if (appUser) { 
          if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
              if (appUser.role === 'patient') {
                  setTimeout(() => router.push('/patient/dashboard'), 0);
              } else if (appUser.role === 'doctor') {
                  setTimeout(() => router.push('/doctor/dashboard'), 0);
              }
          }
      } else { 
          if (currentPath.startsWith('/patient') || currentPath.startsWith('/doctor')) {
              setTimeout(() => router.push('/login'), 0);
          }
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, updateUserInContext]); 

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
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
      setUser(userProfileData as User); 
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
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
      isAuthenticated: !!user && !loading && !isProcessingAuth, 
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

