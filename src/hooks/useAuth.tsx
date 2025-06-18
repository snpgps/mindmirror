
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
    // This function uses `user` from its closure, which is fine as it's updated by onAuthStateChanged or auth operations.
    // If `user` state itself was a dependency for re-creating this function, it might cause loops if not careful.
    // But `setUser` below uses functional updates if necessary.
    const currentUser = auth.currentUser; // Or get from user state if absolutely needed, but direct auth is safer for ID
    if (!currentUser?.uid) return; // Check against current Firebase auth state

    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userDocRef, updatedProfileData);
      setUser(currentContextUser => {
        if (!currentContextUser) return null;
        // Ensure we only update if the ID matches, though it should if currentUser.uid was used.
        if (currentContextUser.id !== currentUser.uid) return currentContextUser; 
        const newUserData = { ...currentContextUser, ...updatedProfileData };
        return newUserData;
      });
    } catch (error) {
        console.error("Error updating user profile in Firestore or context:", error);
    }
  }, []); // No dependencies, relies on auth.currentUser and functional setUser.

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserType | null) => {
      if (isProcessingAuthRef.current) {
          // If an auth operation (signup, login, google signin) is actively being processed,
          // let that operation complete. It will typically update the user state directly
          // and set isProcessingAuthRef.current to false.
          // onAuthStateChanged will be triggered again once that operation is done.
          return;
      }

      // This block now only runs if no auth operation is actively in progress.
      if (!initialAuthResolvedRef.current) {
          setLoading(true); // Indicate loading only for the very first auth state resolution.
      }

      let appUser: User | null = null;

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          let userProfileSnap = await getDoc(userDocRef);
          const providerId = firebaseUser.providerData?.[0]?.providerId;

          if (!userProfileSnap.exists() && providerId === 'password') {
            // Retry logic for email/password user if doc is not immediately found
            console.log(`onAuthStateChanged: Doc for email user ${firebaseUser.uid} not initially found. Retrying after delay...`);
            await new Promise(resolve => setTimeout(resolve, 750)); 
            userProfileSnap = await getDoc(userDocRef);
            if (userProfileSnap.exists()) {
              console.log(`onAuthStateChanged: Doc for email user ${firebaseUser.uid} found after delay.`);
            }
          }

          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data() as any; // Type assertion
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
      // else: firebaseUser is null, so appUser remains null.

      setUser(currentContextUser => {
          if (appUser && (!currentContextUser || currentContextUser.id !== appUser.id || currentContextUser.role !== appUser.role || 
                         (appUser.role === 'patient' && (appUser as Patient).linkedDoctorCode !== (currentContextUser as Patient)?.linkedDoctorCode) ||
                         (appUser.role === 'doctor' && (appUser as Doctor).doctorCode !== (currentContextUser as Doctor)?.doctorCode) )) {
              return appUser; // Update if new user, different user, or relevant profile data changed
          }
          if (!appUser && currentContextUser) { // User logged out
              return null;
          }
          return currentContextUser; // No change needed
      });

      if (!initialAuthResolvedRef.current) {
          setLoading(false);
          initialAuthResolvedRef.current = true;
      }

      // Navigation logic
      const currentPath = window.location.pathname;
      if (appUser) { // User is logged in
          if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
              if (appUser.role === 'patient') {
                  console.log("Navigating to patient dashboard from onAuthStateChanged (deferred)");
                  setTimeout(() => router.push('/patient/dashboard'), 0);
              } else if (appUser.role === 'doctor') {
                  console.log("Navigating to doctor dashboard from onAuthStateChanged (deferred)");
                  setTimeout(() => router.push('/doctor/dashboard'), 0);
              }
          }
      } else { // No appUser (logged out)
          if (currentPath.startsWith('/patient') || currentPath.startsWith('/doctor')) {
              console.log("Navigating to login from protected route (onAuthStateChanged - deferred)");
              setTimeout(() => router.push('/login'), 0);
          }
      }
    });

    return () => unsubscribe();
  }, [router, updateUserInContext]); // updateUserInContext is stable due to its own empty dep array or useCallback definition.

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle user profile creation/loading and navigation
    } catch (error: any) {
      console.error("Google Sign-In error", error);
      setUser(null); // Clear user on error
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
      setUser(userProfileData as User); // Directly set user state
      // onAuthStateChanged will also fire but should see isProcessingAuthRef.current as true initially, then false,
      // and its setUser might be a no-op if data is identical.

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
      // onAuthStateChanged will handle user loading and navigation
    } catch (error: any) {
      console.error("Email Sign-In error", error);
      setUser(null);
      throw error;
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const logoutUser = async () => {
    setIsProcessingAuth(true); // Indicate processing during logout
    try {
      await signOut(auth);
      setUser(null); // Explicitly set user to null
      // onAuthStateChanged will also fire and confirm user is null
      router.push('/login'); // Navigate to login after logout
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
      isAuthenticated: !!user && !loading && !isProcessingAuth, // loading true initially, then false. isProcessingAuth for active ops.
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

