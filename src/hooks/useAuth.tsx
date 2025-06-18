
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
      const activeProcessing = isProcessingAuthRef.current;

      if (!activeProcessing) {
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
          
          if (appUser) {
            setUser(appUser); 

            if (!activeProcessing) {
              const currentPath = window.location.pathname;
              if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
                if (appUser.role === 'patient') {
                  console.log("Navigating to patient dashboard from onAuthStateChanged (deferred)");
                  setTimeout(() => router.push('/patient/dashboard'), 0);
                } else if (appUser.role === 'doctor') {
                  console.log("Navigating to doctor dashboard from onAuthStateChanged (deferred)");
                  setTimeout(() => router.push('/doctor/dashboard'), 0);
                }
              }
            }
          } else { 
             setUser(null); 
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
        if (!activeProcessing) {
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/patient') || currentPath.startsWith('/doctor')) {
            console.log("Navigating to login from protected route (onAuthStateChanged - deferred)");
            setTimeout(() => router.push('/login'), 0);
          }
        }
      }
      
      if (!activeProcessing) { 
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, updateUserInContext]); 

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
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
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Sign Out error", error);
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

